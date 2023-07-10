# Threads, some assembly required.
Lately I've been thinking about adding threads to [tiny-std](https://github.com/MarcusGrass/tiny-std/), 
my linux-only `x86_64`/`aarch64`-only tiny standard library for [Rust](https://github.com/rust-lang/rust).  

Now I've finally done that, with some jankiness, in this write-up I'll 
go through that process a bit.

## Parallelism

Sometimes in programming, [parallelism](https://en.wikipedia.org/wiki/Parallel_computing) (doing multiple things at the 
same time), is desirable. For example, to complete some task, two different long-running calculations have to be made. 
If those can be run in parallel, our latency becomes that of the slowest of those tasks (plus some overhead).  

Some ways of achieving parallelism in your program are:
1. [SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data), hopefully 
your compiler does that for you. But here we're talking about singular processor operations, 
not arbitrary tasks.
2. Offloading tasks to the OS. If your OS has asynchronous apis then you could ask it to do multiple things at once 
and achieve parallelism that way.
3. Running tasks in other processes.
4. Running tasks in threads.

## Threads
[Wikipedia](https://en.wikipedia.org/wiki/Thread_(computing)) says of threads:
> "In computer science, a thread of execution is the smallest sequence of programmed instructions that can be 
> managed independently by a scheduler, which is typically a part of the operating system."

Threads from a programming perspective, are managed by the OS, how threads work is highly OS-dependent. I'll 
only go into `Linux` specifically here, and only from an api-consumers perspective.

### Spawning a minimal task
In the rust std-library, a thread can be spawned with 
```rust
fn main() {
    let handle = std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_millis(500));
        println!("Hello from my thread");
    });
    // Suspends execution of the calling thread until the child-thread completes.  
    handle.join().unwrap();   
}
```
In the above program, some setup runs before the main-function, some delegated to
[libc](https://en.wikipedia.org/wiki/C_standard_library). Which sets up what it deems appropriate. 
`Rust` sets up a panic handler, and miscellaneous things the program needs to run correctly, 
then the main-thread starts executing the `main` function.  
In the `main` function, the main thread spawns a child, which at the point of spawn starts executing the task provided by the 
supplied closure `Wait 500 millis, then print a message`, then waits for that thread to complete.  

I wanted to replicate this API, without using `libc`.  

### Clone, swiss army syscall
The `Linux` [clone syscall](https://man7.org/linux/man-pages/man2/clone.2.html) can be used for a lot of things.  
So many that it's extremely difficult to use it correctly, it's very easy to cause security issues through 
various memory-management mistakes, many of which I discovered on this journey.  

The signature for the [glibc](https://en.wikipedia.org/wiki/Glibc) clone wrapper function looks like:
```c
int clone(int (*fn)(void *), void *stack, int flags, void *arg, ...
/* pid_t *parent_tid, void *tls, pid_t *child_tid */ );
```

Right away I can tell that calling this is not going to be easy from `Rust`, we've got 
[varargs](https://en.wikipedia.org/wiki/Variadic_function) in there, which is problematic because: 

1. `Rust` doesn't have varargs, porting some `C`-functionality from for example
[musl](https://en.wikipedia.org/wiki/Musl) won't be straight forward. 
2. Varargs are not readable (objectively true opinion).

Skipping down to the `Notes`-section of the documentation shows the actual syscall interface (for `x86_64` in a 
conspiracy to ruin my life, the last args are switched on `aarch64`):
```c
long clone(unsigned long flags, void *stack,
                      int *parent_tid, int *child_tid,
                      unsigned long tls);
```

Very disconcerting, since the `C`-api which accepts varargs, seems to do quite a bit of work before making a syscall, 
handing over a task to the OS.  

In simple terms, clone is a way to "clone" the current process. If you have experience with
[fork](https://man7.org/linux/man-pages/man2/fork.2.html), that's an example of `clone`.
Here's an equivalent `fork` using the `clone` syscall from `tiny-std`:
```rust
/// Fork isn't implemented for aarch64, we're substituting with a clone call here
/// # Errors
/// See above
/// # Safety
/// See above
#[cfg(target_arch = "aarch64")]
pub unsafe fn fork() -> Result<PidT> {
    // `SIGCHLD` is mandatory on aarch64 if mimicking fork it seems
    let cflgs = crate::platform::SignalKind::SIGCHLD;
    let res = syscall!(CLONE, cflgs.bits().0, 0, 0, 0, 0);
    bail_on_below_zero!(res, "`CLONE` syscall failed");
    #[allow(clippy::cast_possible_truncation, clippy::cast_possible_wrap)]
    Ok(res as i32)
}
```

What happens immediately after this call, is that our process is cloned and starts executing past the code which called 
`clone`, following the above `Rust` example:

```Rust
fn parallelism_through_multiprocess() {
    let pid = rusl::process::clone().unwrap();
    if pid == 0 {
        println!("In child!");
        rusl::process::exit(0);
    } else {
        println!("In parent, spawned child {pid}");
    }
}
```

This program will print (in non-deterministic order):  
`In parent, spawned child 24748` and  
`In child`, and return to the caller.  

Here we achieved parallelism by spawning another process and doing work there, separately scheduled by the OS, 
then exited that process. At the same time, our caller returns as usual, only stopping briefly to make the syscall.  

Achieving parallelism in this way can be fine. If you want to run a command, `forking`/`cloning` then executing 
another binary through the [execve-syscall](https://man7.org/linux/man-pages/man2/execve.2.html)
is usually how that's done.  
Multiprocessing can be a bad choice if the task is small, because setting up an entire other process can be costly 
on resources, and communicating between processes can be slower than communicating through shared memory.  

### Threads: Cloning intra-process with shared memory
What we think of as threads in linux are sometimes called 
[Light-Weight Processes](https://en.wikipedia.org/wiki/Light-weight_process), the above clone call spawned a regular 
process, which got a full copy of the parent-process' memory with copy-on-write semantics.  

To reduce overhead in both spawning, and communicating between the cloned process and the rest of the processes 
in the application, a combination of flags are used:

```Rust 
let flags = CloneFlags::CLONE_VM
        | CloneFlags::CLONE_FS
        | CloneFlags::CLONE_FILES
        | CloneFlags::CLONE_SIGHAND
        | CloneFlags::CLONE_THREAD
        | CloneFlags::CLONE_SYSVSEM
        | CloneFlags::CLONE_CHILD_CLEARTID
        | CloneFlags::CLONE_SETTLS;
```

Clone flags are tricky to explain, they interact with each other as well, but in short:

1. `CLONE_VM`, clone memory without copy-on-write semantics, meaning, the parent and child 
share memory space and can modify each-other's memory.
2. `CLONE_FS`, the parent and child share the same filesystem information, such as current directory.
3. `CLONE_FILES`, the parent and child share the same file-descriptor table, 
(if one opens an `fd`, that `fd` is available to the other).
4. `CLONE_SIGHAND`, the parent and child share signal handlers.
5. `CLONE_THREAD`, the child-process is placed in the same thread-group as the parent.
6. `CLONE_SYSVSEM`, the parent and child shares semaphores.
7. `CLONE_CHILD_CLEARTID`, wake up waiters for the supplied `child_tid` futex pointer when the child exits 
(we'll get into this).
8. `CLONE_SETTLS`, set the thread-local storage to the data pointed at by the `tls`-variable (architecture specific).

The crucial flags to run some tasks in a thread are only:

1. `CLONE_VM`
2. `CLONE_THREAD`

The rest are for usability and expectation reasons, as well as cleanup reasons.  


## Implementation
Now towards the actual implementation of a minimal threading API.

### API expectation

The std library in `Rust` provides an interface that is used like this:
```rust
let join_handle = std::thread::spawn(|| println!("Hello from my thread!"));
join_handle.join().unwrap();
```
A closure that is run on another thread is supplied and a `JoinHandle<T>` is returned, the join handle 
can be awaited by calling its `join`-method, which will block the calling thread until the thread executing the closure
has completed. If it `panics`, the `Result` will be an `Err`, if it succeeds, it will be an `Ok(T)` where `T` is 
the return value from the closure, which in this case is nothing (`()`);

### Executing a clone call

If `CLONE_VM` is specified, a stack should be supplied. `CLONE_VM` means sharing mutable memory, if we didn't 
supply the stack, both threads would continue mutating the same stack area, here's an excerpt from 
[the docs](https://man7.org/linux/man-pages/man2/clone.2.html) about that: 
> [..] (If the
child shares the parent's memory because of the use of the
CLONE_VM flag, then no copy-on-write duplication occurs and chaos
is likely to result.) - "C library/kernel differences"-section

#### Allocating the stack

Therefore, setting up a stack is required. There are a few options for that, the kernel only needs a chunk of correctly
aligned memory depending on what platform we're targeting. We could even just take some memory off our own stack
if we want too.

##### Use the callers stack

```rust
fn clone() {
    /// 16 kib stack allocation
    let mut my_stack = [0u8; 16384];
    let stack_ptr = my_stack.as_mut_ptr();
    /// pass through to syscall
    syscall!(CLONE, ..., stack_ptr, ...);
}
```

This is bad for a generic API for a multitude of reasons.
It restricts the user to threads that complete before the caller has popped the stack frame in which they were created, 
since the part of the stack that was used in this frame will be reused by the caller later, possibly while the 
child-thread still uses it for its own stack. Which we now know, would result in chaos.  

Additionally, we will have to have stack space available on the calling thread, for an arbitrary amount of children 
if this API was exposed to users. In the case a heap-allocations, the assumption that we will have enough memory for 
reasonable thread-usage is valid. `Rust`'s default thread stack size is `2MiB`. On a system with `16GiB` of RAM, with 
`8GiB` available at a given time, that's 4000 threads, spawning that many is likely not intentional or performant.  

Keeping threads on the main-thread's stack, significantly reduces our memory availability, along with the risk of chaos.  

There is a case to be made for some very specific application which spawns some threads in scope, do some work, then exits, 
to reuse the caller's stack. But I have yet to encounter that kind of use-case in practice, let's move on to something 
more reasonable.  

##### Mmap more stack-space

This is what `musl` does. We allocate the memory that we want to use from new os-pages and use those.  
We could potentially do a regular `malloc` as well, although that would less control over the allocated memory.  

#### Communicating with the started thread
Now `mmap`-ing some stack-memory be enough for the OS to start a thread with its own stack, but then what?  
The thread needs to know what to do, we can't provide it with any arguments, we need to put all the data it needs 
on its stack.  

This means that we'll need some assembly, since using the clone syscall and then continuing in `Rust` relinquishes 
control over the stack that we need, we need to put almost the entire child-thread's lifetime in assembly.  

The structure of the call is mostly stolen from `musl`, with some changes for this more minimal use-case.
The rust function will look like this:

```rust
extern "C" {
    fn __clone(
        start_fn: usize,
        stack_ptr: usize,
        flags: i32,
        args_ptr: usize,
        tls_ptr: usize,
        child_tid_ptr: usize,
        stack_unmap_ptr: usize,
        stack_sz: usize,
    ) -> i32;
}
```

It takes a pointer to a `start_fn`, which is a `C` calling convention function pointer, where our thread will pick up.
It also takes a pointer to the stack, `stack_ptr`.
It takes clone-flags which we send onto the OS in the syscall.  
It takes an `args_ptr`, which is the closure we want to run, converted to a `C` calling convention function pointer.  
It takes a `tls_ptr`, a pointer to some thread local storage, which we'll need to deallocate the thread's stack, and 
communicate with the calling thread.  
It takes a `child_tid_ptr`, which will be used to synchronize with the calling thread.  
It takes a `stack_unmap_ptr`, which is the base address that we allocated for the stack at its original `0` offset.  
It takes the `stack_sz`, stack-size, which we'll need to deallocate the stack later.

#### Syscalls
`x86_64` and `aarch64` assembly has a command to execute a `syscall`.

A syscall is like a function call to the kernel, we'll need to make three syscalls using assembly:
1. CLONE nr 56 on `x86_64`
2. MUNMAP nr 11 on `x86_64`
3. EXIT nr 60 on `x86_64`

The interface for the syscall is as follows:

```rust
/// Syscall conventions are on 5 args:
/// - arg -> arch: `reg`,
/// - nr -> x86: `rax`, aarch64: `x8`
/// - a1 -> x86: `rdi`, aarch64: `x0`
/// - a2 -> x86: `rsi`, aarch64: `x1`
/// - a3 -> x86: `rdx`, aarch64: `x2`
/// - a4 -> x86: `r10`, aarch64: `x3`
/// - a5 -> x86: `r8`,  aarch64: `x4`
/// Pseudo: 
extern "C" {
    fn syscall(nr: usize, a1: usize, a2: usize, a3: usize, a4: usize, a5: usize);
}
```

Onto the assembly, it can be boiled down to this:
1. Prepare arguments to go in the right registers for the syscall.
2. Put what the thread needs into its stack.
3. Execute the clone syscall, return directly to the caller (parent-thread).
4. Pop data from the spawned thread's stack into registers.
5. Execute the function we wanted to run in the spawned thread.
6. Unmap the spawned thread's own stack
7. Exit 0

```asm 
// Boilerplate to expose the symbol
.text
.global __clone
.hidden __clone
.type   __clone,@function
// Actual declaration
__clone:
// tls_ptr already in r8, syscall arg 5 register, due to C calling convention on this function, same with stack_ptr in rsi
// Zero syscall nr register ax (eax = 32bit ax)
xor eax, eax
// Move 56 into the lower 8 bits of ax (al = 8bit ax), 56 is the CLONE syscall nr for x86_64, will become: syscall(56, .., stack_ptr, .., tls_ptr)
mov al, 56
// Move start function into r11, scratch register, save it there since we need to shuffle stuff around
mov r11, rdi
// Move flags into rdi, syscall arg 1 register, well become: syscall(56, flags, stack_ptr, .., .., tls_ptr)
mov rdi, rdx
// Zero parent_tid_ptr from syscall arg 3 register (not using), will become: syscall(56, flags, stack_ptr, 0, .., tls_ptr)
xor rdx, rdx
// Move child_tid_ptr into syscall arg 4 register (our arg 6), will become: syscall(56, flags, stack_ptr, 0, child_tid_ptr, tls_ptr)
mov r10, r9
// Move start function into r9
mov r9, r11
// Align stack ptr to -16
and rsi, -16
// Move down 8 bytes on the stack ptr
sub rsi, 8
// Move args onto the the top of the stack
mov [rsi], rcx
// Move down 8 bytes more on the stack ptr
sub rsi, 8
// Move the first arg that went on the stack into rcx (stack_unmap_ptr)
mov rcx, [8 + rsp]
// Move stack_unmap_ptr onto our new stack
mov [rsi], rcx
// Move the second arg that went on the stack into rcx (stack_sz)
mov rcx, [16 + rsp]
// Move down stack ptr
sub rsi, 8
// Move stack_sz onto the new stack
mov [rsi], rcx
// Make clone syscall
syscall
// Check if the syscall return vaulue is 0
test eax, eax
// if not zero, return (we're the calling thread)
jnz 1f
// Child:
// Zero the base pointer
xor ebp, ebp
// Pop the stack_sz off the provided stack into callee saved register
pop r13
// Pop the stack_ptr off the provided stack into another callee saved register
pop r12
// Pop the start fn args off the provided stack into rdi
pop rdi
// Call the function we saved in r9, rdi first arg
call r9
// Zero rax (function return, we don't care)
xor rax, rax
// Move MUNMAP syscall into ax
mov al, 11
// Stack ptr as the first arg
mov rdi, r12
// Stack len as the second arg
mov rsi, r13
// Syscall, unmapping the stack
syscall
// Clear the output register, we can't use the return value anyway
xor eax,eax
// Move EXIT syscall nr into ax
mov al, 60
// Set exit code for the thread to 0
mov rdi, 0
// Make exit syscall
syscall
1: ret
```

And that's it, kinda, with some code wrapping this we can run an arbitrary closure on a separate thread!

### Race conditions
We're far from done, in the happy case we're starting a thread, it completes, and deallocates its own stack.
But, we need to get its returned value, and we need to know if it's done.  

Unlike a process, we cannot use the [wait-syscall](https://man7.org/linux/man-pages/man2/waitpid.2.html) to wait 
for the process to complete, but there is another way, alluded to in the note on `CLONE_CHILD_CLEARTID`.  

#### Futex messaging
If `CLONE_CHILD_CLEARTID` is supplied in clone-flags along with a pointer to a futex variable, something with a `u32`-layout 
in `Rust`, most reasonably `AtomicU32`, then the OS will set that futex-value to `0` (not null) when the thread exits, 
successfully or not.  

This means that if the caller wants to `join`, i.e. blocking-wait for the child-thread to finish, it can use the 
[futex-syscall](https://man7.org/linux/man-pages/man2/futex.2.html).

#### Getting the returned value
The return value is fairly simple, we need to allocate space for it, for example with a pointer to an `UnsafeCell<Option<T>>`, 
and then have the child-thread update it. The catch here is that we can't have references to that value while the child-thread
may be writing to it, since that's `UB`. Therefore, we need to be absolutely certain that the child-thread is done with 
its modification before we try to read it. For example by waiting for it to exit by `join`-ing.


### Memory leaks, who deallocates what?
We don't necessarily have to keep our `JoinHandle<T>` around after spawning a thread. A perfectly valid use-case is to 
just spawn some long-running task and then forget about it, this causes a problem, if the calling thread doesn't have 
sole responsibility of deallocating the shared memory (the `futex` variable, and the return value), then we need a way 
to signal to the child-thread that it's that thread's responsibility to deallocate those variables before exiting.

Enter the third shared variable, an `AtomicBool` called `should_dealloc`, both threads share a pointer to this variable 
as well.  

Now there are three deallocation-scenarios:
1. Caller joins the child thread by waiting for the `futex`-variable to change value to `0`.
In this case the caller deallocates the `futex`, takes the return value of the heap freeing its memory, and 
deallocates the `should_dealloc` pointer.
2. Caller drops the `JoinHandle<T>`. This is racy, we need to read `should_dealloc` to see that the childthread hasn't 
already completed its work. If it has, we wait on the `futex` to make sure the child thread is completely done, then 
deallocate as above.
3. The child thread tries to set `should_dealloc` to `true` and fails, meaning that the calling thread has already 
dropped the `JoinHandle<T>`. In this case, the child thread needs to signal to the OS that the `futex` is no longer 
to be updated on thread exit through the 
[set_tid_address-syscall](https://man7.org/linux/man-pages/man2/set_tid_address.2.html) (forgetting to do this results in a 
use after free, oof. Here's a `Linux`-code-comment calling me a dumbass that I found when trying to find the source of the segfaults:
```c
if (tsk->clear_child_tid) {
		if (atomic_read(&mm->mm_users) > 1) {
			/*
			 * We don't check the error code - if userspace has
			 * not set up a proper pointer then tough luck.
			 */
			put_user(0, tsk->clear_child_tid);
			do_futex(tsk->clear_child_tid, FUTEX_WAKE,
					1, NULL, NULL, 0, 0);
		}
		tsk->clear_child_tid = NULL;
	}
```
). Then it can safely deallocate the shared variables.


### Oh, right. Panics...
I imagine a world where `Rust` doesn't contain panics. Sadly, we don't live in that world, and thus we need to handle them.  
If the thread panics after the caller has dropped the `JoinHandle<T>` the shared memory is leaked, and the stack isn't deallocated.  

Rusts panic handler could like this: 

```rust
/// Dummy panic handler
#[panic_handler]
pub fn on_panic(info: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

The signature shows that it gets `PanicInfo` and never returns.  
When a thread panics, it enters that function and never returns, it's here that we need to handle cleanup in the 
case that the thread panics.  

What we need:
1. A pointer to the `futex`
2. A pointer to the return value
3. A pointer to the `should_dealloc` variable
4. The address at which we allocated this thread's stack
5. The size of that allocated stack

We could insert those in registers that shouldn't be touched by the user-supplied function, but that's fairly brittle, 
instead we'll use the dreaded `tls`.

#### Thread-local storage
Thread-local storage, or `tls` is a way to store thread-specific data.  
For `x86_64` and `aarch64` there is a specific register we can use to store a pointer to some arbitrary data, 
we can read from that data at any time from any place, in other words, the data is global to the thread.  

In practice:
```Rust
#[repr(C)]
#[derive(Copy, Clone)]
pub(crate) struct ThreadLocalStorage {
    // First arg needs to be a pointer to this struct, it's immediately dereferenced
    pub(crate) self_addr: usize,
    // Info on spawned threads that allow us to unmap the stack later
    pub(crate) stack_info: Option<ThreadDealloc>,
}

#[repr(C)]
#[derive(Copy, Clone)]
pub(crate) struct ThreadDealloc {
    // For the stack dealloc
    stack_addr: usize,
    stack_sz: usize,
    // For the return value dealloc
    payload_ptr: usize,
    payload_layout: Layout,
    // Futex, 
    futex_ptr: usize,
    // Sync who deallocs
    sync_ptr: usize,
}

#[inline]
#[must_use]
fn get_tls_ptr() -> *mut ThreadLocalStorage {
    let mut output: usize;
    #[cfg(target_arch = "x86_64")]
    unsafe {
        core::arch::asm!("mov {x}, fs:0", x = out(reg) output);
    }
    #[cfg(target_arch = "aarch64")]
    unsafe {
        core::arch::asm!("mrs {x}, tpidr_el0", x = out(reg) output);
    }
    output as _
}
```

This takes us to another of our clone-flags `CLONE_SETTLS`, we can now allocate and supply a pointer to a 
`ThreadLocalStorage`-struct, and that will be put into the thread's thread-local storage register, which registers are 
used can be seen in `get_tls_ptr`.  

Now when entering the `panic_handler` we can `get_tls_ptr` and see if there is a `ThreadDealloc` associated with the 
thread that's currently panicking. If there isn't, we're on the main thread, and we'll just bail out by exiting with 
code `1`, terminating the program.
If there is a `ThreadDealloc` we can now first check what the caller is doing, and if we have exclusive access 
to the shared memory, if we do we deallocate it, if we don't we let the caller handle it. Then again we 
have to exit with some asm:

```Rust 
// We need to be able to unmap the thread's own stack, we can't use the stack anymore after that
// so it needs to be done in asm.
// With the stack_ptr and stack_len in rdi/x0 and rsi/x1, respectively we can call mmap then
// exit the thread
#[cfg(target_arch = "x86_64")]
core::arch::asm!(
// Call munmap, all args are provided in this macro call.
"syscall",
// Zero eax from munmap ret value
"xor eax, eax",
// Move exit into ax
"mov al, 60",
// Exit code 0 from thread.
"mov rdi, 0",
// Call exit, no return
"syscall",
in("rax") MUNMAP,
in("rdi") map_ptr,
in("rsi") map_len,
options(nostack, noreturn)
);
```

We also need to remember to deallocate the `ThreadLocalStorage`, what we keep in the register is just a pointer to 
that allocated heap-memory. Both in successful, and panicking thread-exits.

## Final thoughts
I've been dreading reinventing this particular wheel, but I'm glad I did. 
I learnt a lot, and it was interesting to dig into how threading works in practice on `Linux`, plus `tiny-std` now has 
threads!

The code for threads in tine-std can be found [here](https://github.com/MarcusGrass/tiny-std/blob/main/tiny-std/src/thread/spawn.rs).
With a huge amount of comments its 500 lines.

I believe that it doesn't contain `UB` or leakage, but it's incredibly hard to test, what I know is lacking is signal 
handling, which is something else that I have been dreading getting into.

Thanks for reading!