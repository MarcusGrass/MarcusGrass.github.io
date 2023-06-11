# PGWM 0.4, io-uring, stability, and static pie linking

A while back I decided to look into io-uring for an event-loop for
[pgwm](https://github.com/MarcusGrass/pgwm), I should have written
about it when I implemented it, but couldn't find the time then.

Now that I finally got [pgwm](https://github.com/MarcusGrass/pgwm) to compile
using the stable toolchain, I'm going to write a bit about the way there.

## Io-uring

[Io-uring](https://en.wikipedia.org/wiki/Io_uring) is a linux syscall interface
that allows you to submit io-tasks, and later collect the results of those tasks.
It does so by providing two ring buffers, one for submissions, and one for completions.

In the simplest possible terms you put some tasks on one queue, and later collect them on some other
queue. In practice, it's a lot less simple than that.

As I've written about in previous entries on this page, I decided to scrap the std-lib and `libc`, and write
my own syscall interface in [tiny-std](https://github.com/MarcusGrass/tiny-std).  
Therefore I had to look into the gritty details of how to set up these buffers, you can see those details
[here](https://github.com/MarcusGrass/tiny-std/blob/e48179de9f11e687e5f523bb2f271b7c3bb71175/rusl/src/io_uring.rs).
Or, look at the c-implementation which I ripped off [here](https://github.com/axboe/liburing).

### Why io-uring?

I've written before about my x11-wm [pgwm](https://github.com/MarcusGrass/pgwm), but in short:
An x11-wm is based on async socket communication where the wm-reacts to incoming messages, like a key-press, and
responds with some set of outgoing messages on that same socket.  
When the WM had nothing to do it used the `poll` interface to await another message.

So the loop could be summed up as:

```
1. Poll until there's a message on the socket.
2. Read from the socket.
3. Handle the message.
```

With io-uring that could be compacted to:

```
1. Read from the socket when there are bytes available.
2. Handle the message.
```

io-uring sounded cool, and this seemed efficient, so off I went.

### Why not io-uring?

Io-uring is complex, the set-up is complex and there are quite a few considerations that need to be made.
Ring-buffers are set up, how big should they be? What if we get an incoming message pile-up? What if we get an
outgoing message pile-up? When is the best time to flush the buffers? What settings should I put on the uring?

There are more considerations than that, but I didn't really need to tackle most of these issues, since I'm not shipping
a production-ready lib that I'll support indefinitely, I'm just messing around with my WM. I cranked up the buffer
size to more than necessary, and it works fine.

Something that I did consider however, was whether to use SQ-poll.

### Sharing memory with the kernel

Something that theoretically makes Io-uring more efficient than other io-alternatives is that the ring-buffers
are shared with the kernel. There is no need to make a separate syscall for each sent message, if you put a message
on the buffer, and update its offset through an atomic operation, that will be available for the kernel to use.  
But the kernel does need to find out about the submission, outside of just the updated state.
There are two ways of doing this:

1. Make a syscall. Write an arbitrary amount of tasks to the submission queue, then tell the kernel about them through
   a syscall. That same syscall can be used to wait until there are completions available as well, it's very flexible.
2. Have the kernel poll the shared memory for changes, in the offset and pick tasks up as they're added. Potentially,
   this is a large latency-decrease as well as a throughput increase, no more waiting for syscalls!

I thought this sounded great, in practice however, `SQPoll` resulted in a massive cpu-usage increase. I couldn't
tolerate that, so I'll have to save that setting for a different project.
In the end io-uring didn't change much about pgwm.

## Stable

Since I ripped out `libc` the pgwm has required nightly to build, this has bothered me quite a bit.
The reason that the nightly compiler was necessary was because of `tiny-std` using the `#[naked]` feature to create
the assembly entrypoint (`_start` function), where the application starts execution.

### Asm to global_asm

To be able to get `aux`-values, the `environment variable pointer`, and the arguments passed to the binary, access to
the stack-pointer at its start-position is required. Therefore, a function that doesn't mess up the stack needs to be
injected, passing that pointer to a normal function that can extract what's necessary.

An example:

```rust
/// Binary entrypoint
#[naked]
#[no_mangle]
#[cfg(all(feature = "symbols", feature = "start"))]
pub unsafe extern "C" fn _start() {
    // Naked function making sure that main gets the first stack address as an arg
    #[cfg(target_arch = "x86_64")]
    {
        core::arch::asm!("mov rdi, rsp", "call __proxy_main", options(noreturn))
    }
    #[cfg(target_arch = "aarch64")]
    {
        core::arch::asm!("MOV X0, sp", "bl __proxy_main", options(noreturn))
    }
}

/// Called with a pointer to the top of the stack
#[no_mangle]
#[cfg(all(feature = "symbols", feature = "start"))]
unsafe fn __proxy_main(stack_ptr: *const u8) {
    // Fist 8 bytes is a u64 with the number of arguments
    let argc = *(stack_ptr as *const u64);
    // Directly followed by those arguments, bump pointer by 8
    let argv = stack_ptr.add(8) as *const *const u8;
    let ptr_size = core::mem::size_of::<usize>();
    // Directly followed by a pointer to the environment variables, it's just a null terminated string.
    // This isn't specified in Posix and is not great for portability, but we're targeting Linux so it's fine
    let env_offset = 8 + argc as usize * ptr_size + ptr_size;
    // Bump pointer by combined offset
    let envp = stack_ptr.add(env_offset) as *const *const u8;
    unsafe {
        ENV.arg_c = argc;
        ENV.arg_v = argv;
        ENV.env_p = envp;
    }
    ...etc
```

I got this from an article by [fasterthanli.me](https://fasterthanli.me/). But later realized that
you can use the `global_asm`-macro to generate the full function instead:

```rust
// Binary entrypoint
#[cfg(all(feature = "symbols", feature = "start", target_arch = "x86_64"))]
core::arch::global_asm!(
    ".text",
    ".global _start",
    ".type _start,@function",
    "_start:",
    "mov rdi, rsp",
    "call __proxy_main"
);
```

### Symbols

While this means that `tiny-std` itself could potentially be part of a binary compiled with stable,
if one would like to use for example `alloc` to have an allocator, then `rustc` would start emitting symbols
like `memcpy`. Which rust doesn't provide for some reason.

The solution to the missing symbols is simple enough, these symbols are provided in the external
[compiler-builtins](https://github.com/rust-lang/compiler-builtins) library, but that uses a whole host of features
that require nightly. So I copied the implementation (and license), removing dependencies on nightly features, and
exposed the symbols in `tiny-std`.

Now an application (like pgwm), can be built with the stable toolchain.

## Static

In my boot-writeup I wrote about creating a minimal `rust` bootloader. A problem I encountered was that it needed
an interpreter. You can't see it with ldd:

```bash
[21:55:04 gramar@grarch marcusgrass.github.io]$ ldd ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
        statically linked
```

Ldd lies (or maybe technically not), using `file`:

```bash
file ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=9b54c91e5e84a8d3c90fdb9523f46e09cbf5c6e2, stripped
```

Or `readelf -S`:

```bash

[21:57:21 gramar@grarch marcusgrass.github.io]$ readelf -S ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
There are 18 section headers, starting at offset 0x16a0b0:

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .interp           PROGBITS         00000000000002a8  000002a8
       000000000000001c  0000000000000000   A       0     0     1
  [ 2] .note.gnu.bu[...] NOTE             00000000000002c4  000002c4
       0000000000000024  0000000000000000   A       0     0     4
  [ 3] .gnu.hash         GNU_HASH         00000000000002e8  000002e8
       000000000000001c  0000000000000000   A       4     0     8
  [ 4] .dynsym           DYNSYM           0000000000000308  00000308
       0000000000000018  0000000000000018   A       5     1     8
  [ 5] .dynstr           STRTAB           0000000000000320  00000320
       0000000000000001  0000000000000000   A       0     0     1
  [ 6] .rela.dyn         RELA             0000000000000328  00000328
       0000000000008310  0000000000000018   A       4     0     8
  [ 7] .text             PROGBITS         0000000000009000  00009000
       000000000013d5a4  0000000000000000  AX       0     0     16
  [ 8] .rodata           PROGBITS         0000000000147000  00147000
       000000000000eb20  0000000000000000   A       0     0     32
  [ 9] .eh_frame_hdr     PROGBITS         0000000000155b20  00155b20
       0000000000001a8c  0000000000000000   A       0     0     4
  [10] .eh_frame         PROGBITS         00000000001575b0  001575b0
       000000000000c1dc  0000000000000000   A       0     0     8
  [11] .gcc_except_table PROGBITS         000000000016378c  0016378c
       000000000000000c  0000000000000000   A       0     0     4
  [12] .data.rel.ro      PROGBITS         0000000000164e28  00163e28
       0000000000006088  0000000000000000  WA       0     0     8
  [13] .dynamic          DYNAMIC          000000000016aeb0  00169eb0
       0000000000000110  0000000000000010  WA       5     0     8
  [14] .got              PROGBITS         000000000016afc0  00169fc0
       0000000000000040  0000000000000008  WA       0     0     8
  [15] .data             PROGBITS         000000000016b000  0016a000
       0000000000000008  0000000000000000  WA       0     0     8
  [16] .bss              NOBITS           000000000016b008  0016a008
       0000000000000458  0000000000000000  WA       0     0     8
  [17] .shstrtab         STRTAB           0000000000000000  0016a008
       00000000000000a8  0000000000000000           0     0     1
```

Both `file` and `readelf` shows that this binary needs an interpreter, that being
`/lib64/ld-linux-x86-64.so.2`. If the binary is run in an environment without it, it
will immediately crash.

If compiled statically with `RUSTFLAGS='-C target-feature=+crt-static'` the application segfaults, oof.

I haven't found out the reason why `tiny-std` cannot run as a position-independent executable,
or I know why, all the addresses to symbols are wrong (like static variables) are wrong. What I don't know yet is
how to fix it.

There is a no-code way of fixing it though: `RUSTFLAGS='-C target-feature=+crt-static -C relocation-model=static'`.  
This way the application will be statically linked, without requiring an interpreter, but it will not be
position independent.

If you know how to make that work, please tell me, because figuring that out isn't easy.

## Future plans

I'm tentatively looking into making threading work, but that is a lot of work and a
lot of segfaults on the way.  