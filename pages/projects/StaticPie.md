# Static pie linking a nolibc Rust binary
Something has been bugging me for a while with [tiny-std](https://github.com/MarcusGrass/tiny-std), 
if I try to compile executables created with them as `-C target-feature=+crt-static` (statically link the `C`-runtime), 
it segfaults.

The purpose of creating `tiny-std` was to avoid `C`, but to get `Rust` to link a binary statically, that flag needs 
to be passed. `-C target-feature=+crt-static -C relocation-model=static` does produce a valid binary though. 
The default relocation-model for static binaries is `-C relocation-model=static`, 
(at least for the target `x86_64-unknown-linux-gnu`) so something about `PIE`-executables created with `tiny-std` fails,
in this writeup I'll go into the solution for that.  

## Static pie linking
Static pie linking is a combination of two concepts. 

1. [Static linking](https://en.wikipedia.org/wiki/Static_library), putting everything in the same place at compile time. 
As opposed to dynamic linking, where library dependencies can be found and used at runtime. 
Statically linking an executable gives it the property that it can be run on any system
that can handle the executable type, i.e. I can start a statically linked elf-executable on any platform that can run 
elf-executables. Whereas a dynamically linked executable will not start if its dynamic dependencies cannot be found 
at application start.
2. [Position-independent code](https://en.wikipedia.org/wiki/Position-independent_code) position-independent code 
is able to run properly regardless of where in memory is placed. The benefit, as I understand it, is security, 
and platform compatibility-related.  

When telling `rustc` to create a static-pie linked executable through `-C target-feature=+crt-static -C relocation-model=pie`
(relocation-model defaults to pie, could be omitted), it creates an elf-executable which has a header that marks it as 
`DYN`. Here's what an example `readelf -h` looks like:

```bash
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x24b8
  Start of program headers:          64 (bytes into file)
  Start of section headers:          1894224 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         9
  Size of section headers:           64 (bytes)
  Number of section headers:         32
  Section header string table index: 20
```

This signals to the OS that the executable can be run position-independently, but since `tiny-std` assumes that 
memory addresses are absolute, the ones they were when compiled, the executable segfaults as soon as it tries to get 
the address of any symbols, like functions or static variable, since those have been moved.

## Where are my symbols?
This seems like a tricky problem, as a programmer, I have a bunch of variable and function calls, some that the 
`Rust`-language emits for me, now each of the addresses for those variables and functions are in another place.  
Before using any of them, I need to remap them, which means that this needs to occur before using any functions (kinda).  

## The start function
The executable enters through the `_start` function, this is defined in `asm` for `tiny-std`:

```rust
// Binary entrypoint
#[cfg(all(feature = "symbols", feature = "start", target_arch = "x86_64"))]
core::arch::global_asm!(
    ".text",
    ".global _start",
    ".type _start,@function",
    "_start:",
    "xor rbp,rbp", // Zero the stack-frame pointer
    "mov rdi, rsp", // Move the stack pointer into rdi, c-calling convention arg 1
    ".weak _DYNAMIC", // Elf dynamic symbol
    ".hidden _DYNAMIC",
    "lea rsi, [rip + _DYNAMIC]", // Load the dynamic address off the next instruction to execute incremented by _DYNAMIC into rsi
    "and rsp,-16", // Align the stack pointer
    "call __proxy_main" // Call our rust start function
);
```

The assembly prepares the stack by aligning it, putting the stack pointer into arg1 for the coming function-call, 
then adds the offset off `_DYNAMIC` to the special purpose `rip`-register address, and puts that in `rsi` which becomes 
our called functions arg 2.

Then we call `__proxy_main`, the signature looks like this:

`unsafe extern "C" fn __proxy_main(stack_ptr: *const u8, dynv: *const usize)` 
It takes the `stack_ptr` and the `dynv`-dynamic vector as arguments, which we provided in 
the above assembly.

I wrote more about the `_start`-function in [pgwm03](/pgwm03) and [fasterthanli.me](https://fasterthanli.me/series/making-our-own-executable-packer/part-12) 
wrote more about it at their great blog, but in short:

Before running the user's `main` we need to set up some stuff, like arguments, environment variables, [aux-values](https://man7.org/linux/man-pages/man3/getauxval.3.html), 
map in faster functions from the vdso (see [pgwm03](/pgwm03) for more on that), and set up some thread-state, 
see [the thread writeup](/threads) for that.  

All these variables come off the executable's stack, which is why we need to pass the stack pointer as an argument to 
our setup-function, so that we can use it before we start polluting the stack with our own stuff.  

The first extraction looks like this:

```rust
#[no_mangle]
#[cfg(all(feature = "symbols", feature = "start"))]
unsafe extern "C" fn __proxy_main(stack_ptr: *const u8, dynv: *const usize) {
    // Fist 8 bytes is a u64 with the number of arguments
    let argc = *(stack_ptr as *const u64);
    // Directly followed by those arguments, bump pointer by 8 bytes
    let argv = stack_ptr.add(8) as *const *const u8;
    let ptr_size = core::mem::size_of::<usize>();
    // Directly followed by a pointer to the environment variables, it's just a null terminated string.
    // This isn't specified in Posix and is not great for portability, but we're targeting Linux so it's fine
    let env_offset = 8 + argc as usize * ptr_size + ptr_size;
    // Bump pointer by combined offset
    let envp = stack_ptr.add(env_offset) as *const *const u8;

    let mut null_offset = 0;
    loop {
        let val = *(envp.add(null_offset));
        if val as usize == 0 {
            break;
        }
        null_offset += 1;
    }
    // We now know how long the envp is
    // ... 
}
```

This works all the same as a `pie` because:

## Prelude, inline

We will only run into troubles when trying to find a symbol contained in the binary, such as a function call.  
Up to here that hasn't been a problem, because even though we invoke `ptr::add()` and `core::mem:size_of::<T>()` we don't 
need any addresses. This is because of inlining. 

Looking att `core::mem::size_of<T>()`:  

```rust
#[inline(always)]
#[must_use]
#[stable(feature = "rust1", since = "1.0.0")]
#[rustc_promotable]
#[rustc_const_stable(feature = "const_mem_size_of", since = "1.24.0")]
#[cfg_attr(not(test), rustc_diagnostic_item = "mem_size_of")]
pub const fn size_of<T>() -> usize {
    intrinsics::size_of::<T>()
}
```

it has `#[inline(always)]`, the same goes for `ptr::add()`. Since that code is inlined, we don't need to have an address 
to a function, and therefore it works even though all of our addresses are off.

To be able to debug, I would like to be able to print stuff, since I haven't been able to hook a debugger up 
to `tiny-std` executables yet. But, printing to the terminal requires code, code that usually isn't `#[inline(always)]`. 

So I wrote a small print:

```rust
#[inline(always)]
unsafe fn print_labeled(msg: &[u8], val: usize) {
    print_label(msg);
    print_val(val);
}

#[inline(always)]
unsafe fn print_label(msg: &[u8]) {
    syscall!(WRITE, 1, msg.as_ptr(), msg.len());
}

#[inline(always)]
unsafe fn print_val(u: usize) {
    syscall!(WRITE, 1, num_to_digits(u).as_ptr(), 21);
}

#[inline(always)]
unsafe fn num_to_digits(mut u: usize) -> [u8; 22] {
    let mut base = *b"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\n";
    let mut ind = base.len() - 2;
    if u == 0 {
        base[ind] = 48;
    }
    while u > 0 {
        let md = u % 10;
        base[ind] = md as u8 + 48;
        ind -= 1;
        u = u / 10;
    }
    base
}
```

Printing to the terminal can be done through the syscall `WRITE` on `fd` `1` (STDOUT).  
It takes a buffer of bytes and a length. The call through `syscall!()` is always inlined.  

Since I primarily need look at addresses, I just print `usize`, and I wrote a beautifully stupid number to digits function.  
Since the max digits of a `usize` on a 64-bit machine is 21, I allocate a slice on the stack filled with 
`null`-bytes, these won't be displayed. Then add digit by digit, which means that the number is formatted without leading or 
trailing zeroes.  

Invoking it looks like this:

```rust 
fn test() {
    print_labeled(b"My msg as bytes: ", 15);
}
```

## Relocation
Now that basic debug-printing is possible we can start working on relocating the addresses.  

I previously had written some code the extract `aux`-values, but now that code needs to run without using any 
non-inlined functions or variables.  

### Aux values
A good description of aux-values comes from [the docs here](https://man7.org/linux/man-pages/man3/getauxval.3.html), 
in short the kernel puts some data in the memory of a program when it's loaded.  
This data points to other data that we'll need to do relocation. It also has an insane layout for reasons that 
I haven't yet been able to find any motivation for.  
A pointer to the aux-values are put after the `envp` on the stack.  

The aux-values were collected and stored pretty sloppily as a global static variable before, 
this time it needs to be collected onto the stack, used for finding the dynamic relocation addresses, 
and then it could be put into a static variable after that.

We'll also need the `dyn`-values, which are essentially the same as aux-values, provided for `DYN`-objects.

In musl, the aux-values that are put on the stack looks like this:
```c 
size_t i, aux[AUX_CNT], dyn[DYN_CNT];
```

So I replicated the aux-vec on the stack like this:

```rust
// There are 32 aux values.
let mut aux: [0usize; 32];
```

And then initialize it, with the `aux`-pointer provided by the OS.  

The OS-supplies some values in the `aux`-vector [more info here](https://man7.org/linux/man-pages/man3/getauxval.3.html) 
than we'll need:

1. `AT_BASE` the base address of the program interpreter, 0 if no interpreter (static-pie).
2. `AT_PHNUM`, the number of program headers.
3. `AT_PHENT`, the size of one program header entry.
4. `AT_PHDR`, the address of the program headers in the executable.  

First we need to find the virtual address found at the program header that has the `dynamic` type.  

The program header is laid out in memory as this struct: 

```rust
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct elf64_phdr {
    pub p_type: Elf64_Word,
    pub p_flags: Elf64_Word,
    pub p_offset: Elf64_Off,
    pub p_vaddr: Elf64_Addr,
    pub p_paddr: Elf64_Addr,
    pub p_filesz: Elf64_Xword,
    pub p_memsz: Elf64_Xword,
    pub p_align: Elf64_Xword,
}
```

We'll treat the address of the `AT_PHDR` as an array that we could declare as: 

```rust
let phdr: &[elf64_phdr; AT_PHNUM] = ...
```

We can then walk that array until we find a program header struct with `p_type` = `PT_DYNAMIC`, 
that program header holds an offset at `p_vaddr` that we can subtract from the `dynv` pointer to get 
our correct `base` address.  

## Initialize the dyn section
The `dynv` pointer supplied by the os, as previously stated, is analogous to the `aux`-pointer but 
if we try to stack allocate its value mappings on the stack like this:

```rust
let dyn_values = [0usize; 37];
```

We immediately segfault.

### SYMBOLS!!!
It took me a while to figure out what's happening, when you allocate a zeroed array in rust, and 
that array is larger than `[0usize; 32]` (256 bytes of zeroes seems to be the exact breakpoint) 
it instead of using `sse` instructions, uses `memset` to zero the memory it just took off the stack.  

The asm will look like this:

```asm
        ...
        mov edx, 296
        mov rdi, rbx
        xor esi, esi
        call qword ptr [rip + memset@GOTPCREL]
        ...
```

Accessing that memset symbol is what causes the segfault.  
I tried a myriad of ways to get the compiler to not emit that symbol, among 
[posting this](https://users.rust-lang.org/t/reliably-working-around-rust-emitting-memset-when-putting-a-slice-on-the-stack/97080) 
help request.  

It seems that there is no reliable way to avoid `rustc` emitting unwanted symbols without doing it all in assembly, 
and since that seems a bit much, at least right now, I opted to instead restructure the code. Unpacking both 
the aux and dyn values and just keeping what `tiny-std` needs.  
The unpacked aux values now look like this:

```rust
/// Some selected aux-values, needs to be kept small since they're collected
/// before symbol relocation on static-pie-linked binaries, which means rustc
/// will emit memset on a zeroed allocation of over 256 bytes, which we won't be able
/// to find and thus will result in an immediate segfault on start.
/// See [docs](https://man7.org/linux/man-pages/man3/getauxval.3.html)
#[derive(Debug)]
pub(crate) struct AuxValues {
    /// Base address of the program interpreter
    pub(crate) at_base: usize,

    /// Real group id of the main thread
    pub(crate) at_gid: usize,

    /// Real user id of the main thread
    pub(crate) at_uid: usize,

    /// Address of the executable's program headers
    pub(crate) at_phdr: usize,

    /// Size of program header entry
    pub(crate) at_phent: usize,

    /// Number of program headers
    pub(crate) at_phnum: usize,

    /// Address pointing to 16 bytes of a random value
    pub(crate) at_random: usize,

    /// Executable should be treated securely
    pub(crate) at_secure: usize,

    /// Address of the vdso
    pub(crate) at_sysinfo_ehdr: usize,
}
```

It only contains the aux-values that are actually used by `tiny-std`.  

The dyn-values are only used for relocations so far, so they were packed into this much smaller struct:

```rust
pub(crate) struct DynSection {
    rel: usize,
    rel_sz: usize,
    rela: usize,
    rela_sz: usize,
}
```

We can fill that struct with the values from the `dynv`-pointer, and then finally relocate: 

```rust
#[inline(always)]
pub(crate) unsafe fn relocate(&self, base_addr: usize) {
    // Relocate all rel-entries
    for i in 0..(self.rel_sz / core::mem::size_of::<Elf64Rel>()) {
        let rel_ptr = ((base_addr + self.rel) as *const Elf64Rel).add(i);
        let rel = ptr_unsafe_ref(rel_ptr);
        if rel.0.r_info == relative_type(REL_RELATIVE) {
            let rel_addr = (base_addr + rel.0.r_offset as usize) as *mut usize;
            *rel_addr += base_addr;
        }
    }
    // Relocate all rela-entries
    for i in 0..(self.rela_sz / core::mem::size_of::<Elf64Rela>()) {
        let rela_ptr = ((base_addr + self.rela) as *const Elf64Rela).add(i);
        let rela = ptr_unsafe_ref(rela_ptr);
        if rela.0.r_info == relative_type(REL_RELATIVE) {
            let rel_addr = (base_addr + rela.0.r_offset as usize) as *mut usize;
            *rel_addr = base_addr + rela.0.r_addend as usize;
        }
    }
    // Skip implementing relr-entries for now
}
```

After the `relocate`-section runs, we can again use `symbols`, and `tiny-std` can continue with the setup.

## Outro
The commit that added the functionality can be found [here](https://github.com/MarcusGrass/tiny-std/commit/fce20899b891cb07913800dc63fae991f758a819).  

Thanks for reading!