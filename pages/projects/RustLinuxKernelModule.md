# Rust for Linux, how hard is it to write a Kernel module in Rust at present?

Once again I'm back on parental leave, I've been lazily following the [Rust for Linux](https://rust-for-linux.com/) 
effort but finally decided to get into it and write a simple kernel module in `Rust`.

---

## Introduction

This write-up is about writing a kernel module in `Rust` which will expose a file under `/proc/rust-proc-file`, 
the file is going to function as a regular file, but backed by pure ram.  

It'll go through zero-cost abstractions and how one can safely wrap `unsafe extern "C" fn`'s hiding away 
the gritty details of `C`-APIs.

It'll also go through numerous ways of causing and avoiding UB, as well as some kernel internals.  

This write-up is code-heavy, all code shown is licensed under GPLv2 and generally there are links 
with the code which can be followed to the source which also contains its license.  

---

## Table of contents

<!-- TOC -->
* [Rust for Linux, how hard is it to write a Kernel module in Rust at present?](#rust-for-linux-how-hard-is-it-to-write-a-kernel-module-in-rust-at-present)
  * [Introduction](#introduction)
  * [Table of contents](#table-of-contents)
  * [Objective](#objective)
  * [The proc Filesystem](#the-proc-filesystem)
    * [A proc 'file'](#a-proc-file)
    * [The proc API](#the-proc-api)
    * [proc_open](#proc_open)
    * [proc_read](#proc_read)
    * [proc_write](#proc_write)
    * [proc_lseek](#proc_lseek)
  * [Implementing it in Rust](#implementing-it-in-rust)
    * [Generating bindings](#generating-bindings)
    * [unsafe extern "C" fn](#unsafe-extern-c-fn)
    * [Abstraction](#abstraction)
    * [Better function signatures](#better-function-signatures)
    * [A safe reference to the `file`-struct](#a-safe-reference-to-the-file-struct)
      * [Data-races](#data-races)
      * [An acceptable data race](#an-acceptable-data-race)
      * [Handling reading racy data for more complex structs](#handling-reading-racy-data-for-more-complex-structs)
    * [Continuing the abstraction](#continuing-the-abstraction)
    * [Using the abstraction](#using-the-abstraction)
      * [User pointers](#user-pointers)
    * [Writing the module](#writing-the-module)
    * [Mutex](#mutex)
    * [Storing the ProcDirEntry](#storing-the-procdirentry)
    * [Memory lifecycle, you, me, and `C`](#memory-lifecycle-you-me-and-c)
      * [A user interaction](#a-user-interaction)
      * [Constraints caused by `'static`-lifetimes](#constraints-caused-by-static-lifetimes)
      * [Using static data for the backing storage](#using-static-data-for-the-backing-storage)
      * [MaybeUninit<T> vs UnsafeCell<Option<T>>](#maybeuninitt-vs-unsafecelloptiont)
      * [Global POPS and an unsound API](#global-pops-and-an-unsound-api)
      * [Deallocation](#deallocation)
  * [Testing](#testing)
    * [Objective retrospective](#objective-retrospective)
    * [Implementing tests](#implementing-tests)
  * [Summing up](#summing-up)
    * [Generating bindings](#generating-bindings-1)
    * [Wrapping the API with reasonable lifetimes](#wrapping-the-api-with-reasonable-lifetimes)
    * [Dealing with static data in a concurrent context](#dealing-with-static-data-in-a-concurrent-context)
    * [Tradeoff between soundness and performance](#tradeoff-between-soundness-and-performance)
    * [Testing](#testing-)
    * [Shortcomings](#shortcomings)
<!-- TOC -->

---

## Objective

I've been a Linux user for quite a while but have never tried my hand at contributing to the codebase, 
the reason is that I generally spend my free time writing things that I myself would use. Having 
that as a guide leads to me finishing my side-projects. There hasn't been something that I've wanted or needed 
that I've been unable to implement in user-space, so it just hasn't happened.  

Sadly, that's still the case, so I had to contrive something: A proc-file that works just like a regular file.  

---

## The proc Filesystem

The stated purpose of the `/proc` filesystem is to "provide information about the running Linux System", read 
more about it [here](https://www.kernel.org/doc/html/latest/filesystems/proc.html).  

On a Linux machine with the `/proc` filesystem you can find process information e.g. under `/proc/<pid>/..`, 
like memory usage, mounts, cpu-usage, fds, etc. With the above stated purpose and how the `/proc` filesystem is 
used the purpose of this module doesn't quite fit it, but for simplicity I chose `proc` anyway.

---

### A proc 'file'

Proc files can be created by the kernel's `proc_fs`-api, it lives [here](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h).
Proc files are not like the most commonly imagined regular file, some data that exists on a disk somewhere, 
it's an interface into the kernel.  

On the kernel side, to create the 'file' [proc_create](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L111), 
can be used, it looks like this: 

```c
struct proc_dir_entry *proc_create(const char *name, umode_t mode, struct proc_dir_entry *parent, const struct proc_ops *proc_ops);
```

When invoked with correct arguments it will create a file under `/proc/<name>` (if no parent is provided).  

That file is an interface to the kernel, a pseudo-file where the user interacts with it as a regular file on one end, 
and the kernel provides handlers for regular file-functionality on the other end (like `open`, `read`, `write`, `lseek`, 
etc.).  

That interface is provided through the last argument `...,proc_ops *proc_ops);...`

---

### The proc API

The proc API, as exposed through the `proc_ops`-struct:

[proc_ops](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L29):

```c
struct proc_ops {
	unsigned int proc_flags;
	int	(*proc_open)(struct inode *, struct file *);
	ssize_t	(*proc_read)(struct file *, char __user *, size_t, loff_t *);
	ssize_t (*proc_read_iter)(struct kiocb *, struct iov_iter *);
	ssize_t	(*proc_write)(struct file *, const char __user *, size_t, loff_t *);
	/* mandatory unless nonseekable_open() or equivalent is used */
	loff_t	(*proc_lseek)(struct file *, loff_t, int);
	int	(*proc_release)(struct inode *, struct file *);
	__poll_t (*proc_poll)(struct file *, struct poll_table_struct *);
	long	(*proc_ioctl)(struct file *, unsigned int, unsigned long);
#ifdef CONFIG_COMPAT
	long	(*proc_compat_ioctl)(struct file *, unsigned int, unsigned long);
#endif
	int	(*proc_mmap)(struct file *, struct vm_area_struct *);
	unsigned long (*proc_get_unmapped_area)(struct file *, unsigned long, unsigned long, unsigned long, unsigned long);
} __randomize_layout;
```

It accepts flags and function pointers, the function pointers can in many cases be `null` without unsafety, 
but will impact functionality for the 'file'. For example, if `write`-isn't implement the file won't be writable, 
that's not a problem if the purpose of the 'file' is to just expose readable information.  

The functions that will be implemented follows.

---

### proc_open

When a user tries to `open` the proc-file, the handler `int	(*proc_open)(struct inode *, struct file *);` 
will be invoked.  

A perfectly functional `C`-implementation of that, in the case that no work needs to be done specifically when a 
user invokes `open` is: 

```c
int proc_open(struct inode *inode, struct file *file)
{
	return 0;
}
```

It just returns `0` for success.  

---

There are cases where one would like to do something when the file is opened, in that case, 
the `*file`-pointer could be modified, for example by editing the `void *private_data`-field to add some data 
that will follow the file through its coming operations. 
Read some more about the [file structure here](https://www.oreilly.com/library/view/linux-device-drivers/0596000081/ch03s04.html), 
or check out its definition [here](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/fs.h#L992).  
---

### proc_read

Now onto some logic, when a user wants to read from the file 
it provides a buffer and an offset pointer, the signature looks like 
[this:](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L32)

```c
ssize_t	proc_read(struct file *f, char __user *buf, size_t buf_len, loff_t *offset);
```

Again there's the file structure-pointer which could contain eg.g `private_data` that 
was put there in an `open`-implementation, as well as a suspiciously annotated 
`char __user *buf`.

The kernel should write data into the user buffer, return the number of 
bytes written, and update the offset through the pointer.

---

### proc_write

When a user tries to write to the file, it enters through 
[proc_write](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L34),
which looks like this: 

```c
ssize_t	(*proc_write)(struct file *f, const char __user *buf, size_t buf_len, loff_t *offset);
```

The user provides the buffer it wants to write into the file along with its length, and 
a pointer to update the offset. Again suspiciously annotating the buffer with `__user`.  

The kernel should write data from the user buffer into the backing storage.  

---

### proc_lseek

Lastly, if the file is to be seekable to an offset [proc_lseek](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L36)
has to be implemented.

It's signature looks like this:

```c
loff_t (*proc_lseek)(struct file *f, loff_t offset, int whence);
```

Again the file is provided, the offset to seek to, and `whence` to seek, 
`whence` is an `int` which should have one of 5 values, those are described 
more in the docs [here](https://man7.org/linux/man-pages/man2/lseek.2.html), 
the most intuitive one is `SEEK_SET` which means that the file's offset should 
be set to the offset that the user provided.  

Assuming that the offset makes sense, the module should return the new offset.  

---

## Implementing it in Rust

That's it, with those 4 functions implemented there should be a fairly complete working 
file created when the functions are passed as members of the `proc_ops`-struct, time to start!


### Generating bindings

Rust for Linux uses Rust-bindings generated from the kernel headers. 
They're conveniently added when building, as long as the correct headers are 
added [here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/bindings/bindings_helper.h#L19), 
for this module only `proc_fs.h` is needed.  


### unsafe extern "C" fn

Since `Rust` is compatible with `C` by jumping through some hoops, 
theoretically the module could be implemented by just using the C-api 
directly as-is through the functions provided by the bindings. 

One of `Rust`'s strengths is being able to take unsafe code and make safe abstractions 
on top of them. But, using those functions directly can be a good start to figure out 
how the APIs work.  

The generated `Rust` functions-pointer-definitions look like this:

```rust
unsafe extern "C" fn proc_open(
        inode: *mut kernel::bindings::inode,
        file: *mut kernel::bindings::file,
    ) -> i32 {
    ...
}

unsafe extern "C" fn proc_read(
    file: *mut kernel::bindings::file,
    buf: *mut core::ffi::c_char,
    buf_cap: usize,
    read_offset: *mut kernel::bindings::loff_t,
) -> isize {
    ...
}

unsafe extern "C" fn proc_write(
    file: *mut kernel::bindings::file,
    buf: *const core::ffi::c_char,
    buf_cap: usize,
    write_offset: *mut kernel::bindings::loff_t,
) -> isize {
    ...
}

unsafe extern "C" fn proc_lseek(
    file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: core::ffi::c_int,
) -> kernel::bindings::loff_t {
    ...
}

```

One difference between these `C`-style function declarations and something 
like `Rust`'s [`Fn`-traits](https://doc.rust-lang.org/std/ops/trait.Fn.html) 
is that these function cannot capture any state.  

This necessitates using global-static for persistent state that has to 
be shared between user-calls into the proc-file (like writing to the backing file data).
For modifications that do not have to be shared or persisted after the interaction ends
, the `file`'s private data could be used.  

Another difference is that that pesky `__user`-annotation is finally gone, let's not 
think more about that, the problem solved itself.  

---

### Abstraction

As mentioned previously, a strength of `Rust`'s is being able to 
abstract away `unsafety`, ideally an API would consist of `Rust` function-signatures 
containing references instead of `C`-style function-signatures containing raw pointers, 
it's a bit tricky, but it can be done without overhead.

Here's an example of how to do the conversion in a way with zero-cost:

Without any conversion, calling a rust-function within a `C`-style function:

```rust
fn rust_fn() -> i32 {
    std::hint::black_box(5) * std::hint::black_box(15)
}

pub unsafe extern "C" fn my_callback2() -> i32 {
    rust_fn()
}

pub fn main() -> i32{
    unsafe {
        my_callback2()
    }
}
```

This allows the user to define `rust_fn`, and then wrap it with `C`-style function.  

Through [godbolt](https://godbolt.org) it produces this assembly:

```nasm
example::my_callback2::h381eee3be316e700:
        mov     dword ptr [rsp - 8], 5
        lea     rax, [rsp - 8]
        mov     eax, dword ptr [rsp - 8]
        mov     dword ptr [rsp - 4], 15
        lea     rcx, [rsp - 4]
        imul    eax, dword ptr [rsp - 4]
        ret

example::main::h11eebe12cad5e117:
        mov     dword ptr [rsp - 8], 5
        lea     rax, [rsp - 8]
        mov     eax, dword ptr [rsp - 8]
        mov     dword ptr [rsp - 4], 15
        lea     rcx, [rsp - 4]
        imul    eax, dword ptr [rsp - 4]
        ret
```

The above shows that the entire function my_callback2 was inlined 
into main, a zero-cost abstraction should produce the same code, 
so any abstraction should produce the same assembly.

Here is an example of such an abstraction:

```rust

fn rust_fn() -> i32 {
    std::hint::black_box(5) * std::hint::black_box(15)
}

pub trait MyTrait<'a> {
    const CALLBACK_1: &'a dyn Fn() -> i32;
}

pub struct MyStruct;

impl<'a> MyTrait<'a> for MyStruct {
    const CALLBACK_1: &'a dyn Fn() -> i32 = &rust_fn;
}

pub struct Container<'a, T>(core::marker::PhantomData<&'a T>);

impl<'a, T> Container<'a, T> where T: MyTrait<'a> {
    pub unsafe extern "C" fn proxy_callback() -> i32 {
        T::CALLBACK_1()
    }
}

pub fn main() -> i32 {
    unsafe {
        Container::<'_, MyStruct>::proxy_callback()
    }
}

```

Which produces this assembly:

```nasm
example::main::h11eebe12cad5e117:
        mov     dword ptr [rsp - 8], 5
        lea     rax, [rsp - 8]
        mov     eax, dword ptr [rsp - 8]
        mov     dword ptr [rsp - 4], 15
        lea     rcx, [rsp - 4]
        imul    eax, dword ptr [rsp - 4]
        ret
```

Again, the entire function was inlined, even though a [`dyn`-trait](https://doc.rust-lang.org/std/keyword.dyn.html) is used 
the compiler can figure out that it should/can be inlined.  

This may seem a bit useless, since the only difference between the pre- and post-abstraction
code is having the function connected to a struct, but using that, better abstractions can be provided.

---

### Better function signatures

Looking again at the function pointer that will be invoked for `lseek`:
```rust
unsafe extern "C" fn proc_lseek(
    file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: core::ffi::c_int,
) -> kernel::bindings::loff_t {
    ...
}
```

It can be described as a pure-rust-function like this: 
```rust
fn proc_lseek(file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: core::ffi::c_int) -> kernel::bindings::loff_t;
```

Or even better like this: 

```rust
/// lseek valid variants [See the lseek docs for more detail](https://man7.org/linux/man-pages/man2/lseek.2.html)
#[repr(u32)]
pub enum Whence {
    /// See above doc link
    SeekSet = kernel::bindings::SEEK_SET,
    /// See above doc link
    SeekCur = kernel::bindings::SEEK_CUR,
    /// See above doc link
    SeekEnd = kernel::bindings::SEEK_END,
    /// See above doc link
    SeekData = kernel::bindings::SEEK_DATA,
    /// See above doc link
    SeekHole = kernel::bindings::SEEK_HOLE,
}

impl TryFrom<u32> for Whence {
    type Error = kernel::error::Error;

    fn try_from(value: u32) -> core::result::Result<Self, Self::Error> {
        Ok(match value {
            kernel::bindings::SEEK_SET => Self::SeekSet,
            kernel::bindings::SEEK_CUR => Self::SeekCur,
            kernel::bindings::SEEK_END => Self::SeekEnd,
            kernel::bindings::SEEK_DATA => Self::SeekData,
            kernel::bindings::SEEK_HOLE => Self::SeekHole,
            _ => return Err(EINVAL),
        })
    }
}
fn proc_lseek(file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: Whence) -> kernel::bindings::loff_t;
```

Or even better, since even though the bindings specify a `*mut`, [converting that to a mutable reference 
is likely going to cause UB](https://doc.rust-lang.org/nomicon/aliasing.html), but converting it to 
an immutable reference is slightly more likely be safe.

Postfix edit: It's definitely not guaranteed to be safe

```rust
fn proc_lseek(file: &kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: Whence) -> Result<kernel::bindings::loff_t>;
```

---

Making a safer abstraction over the bindings struct `file` would be even better, ~~but deemed out of scope, 
the rust-api now communicates that lseek takes a reference to a file that should not be mutated 
(it can safely be mutated with synchronization, again out of scope)~~, an offset, and a `Whence`-enum which 
can only be one of 5 types. 

---

### A safe reference to the `file`-struct

When working with unsafe and raw pointers in `Rust` it's easy to get it wrong, it's best to keep `Rust`'s aliasing 
rules top of mind when trying: 
> There can only be one mutable reference and no other references to some object, alternatively there can be 
> however many immutable reference to an object at a given time.
> The data behind an immutable reference must not change immutably while holding the reference.

What this means in practice is that if an immutable reference is taken to a `file`-struct backed by a pointer 
that the kernel provides, and that pointer is changed while holding the reference, that's UB.  

There is something to be said about how big of a problem that actually is, it depends on the situation. As a general rule, 
avoiding UB will save you from a headache now and in the future, so how can the `file`-struct be made safe?

Sometimes the kernel code guarantees operation serialization when reading a file, looking at the handler for 
the [read syscall](https://man7.org/linux/man-pages/man2/read.2.html) for example [(it's here)](https://github.com/MarcusGrass/linux/blob/mg/proc-fs/fs/read_write.c#L608)
and looks like this:
```c
ssize_t ksys_read(unsigned int fd, char __user *buf, size_t count)
{
	struct fd f = fdget_pos(fd);
	ssize_t ret = -EBADF;

	if (f.file) {
		loff_t pos, *ppos = file_ppos(f.file);
		if (ppos) {
			pos = *ppos;
			ppos = &pos;
		}
		ret = vfs_read(f.file, buf, count, ppos);
		if (ret >= 0 && ppos)
			f.file->f_pos = pos;
		fdput_pos(f);
	}
	return ret;
}
SYSCALL_DEFINE3(read, unsigned int, fd, char __user *, buf, size_t, count)
{
	return ksys_read(fd, buf, count);
}
```

A process can enter this syscall-handler with (theoretically) limitless concurrency.  

`vfs_read` will call the `proc_open`-handler that was defined, both with a pointer to the `file`, and 
a pointer to the `file`'s offset-field. That means that if `Rust`-code is holding a reference to the file
and mutating the pointer at the same time, that's UB (oops).  

There's a way of sidestepping this issue, working directly with the pointer:

```rust
pub struct ProcOpFileHandle(core::ptr::NonNull<kernel::bindings::file>);

impl ProcOpFileHandle {
    /// Gets the file flags
    pub fn get_flags(&self) -> core::ffi::c_uint {
        unsafe {
            // Safety: flags are only set on open, any time
            // code gets here it's not going to be modified anymore
            let flags_offset = offset_of!(kernel::bindings::file, f_flags);
            self.0
                .cast::<u8>()
                .add(flags_offset)
                .cast::<core::ffi::c_uint>()
                .read()
        }
    }

    fn pos_ptr(&self) -> core::ptr::NonNull<kernel::bindings::loff_t> {
        unsafe {
            let pos_offset = offset_of!(kernel::bindings::file, f_pos);
            self.0
                .cast::<u8>()
                .add(pos_offset)
                .cast::<kernel::bindings::loff_t>()
        }
    }

    /// Reading the position is inescapably subject to raciness.  
    /// The kernel will, on this file-pointer, update position after each read and write,
    /// see ksys_read, ksys_write at read_write.c.  
    /// If the file is opened with f_mode `FMODE_ATOMIC_POS`, the proc-function is run under
    /// a pos-lock if needed, in which case this is safe from data-races.  
    /// Which means its up to the user to make sure concurrent read-writes doesn't happen if
    /// they want the offset to make sense.
    /// # Safety:
    /// This number may or may not make any sense, bounds checking is still necessary
    /// to retain safety
    pub unsafe fn read_pos_unsync(&self) -> kernel::bindings::loff_t {
        unsafe { self.pos_ptr().read() }
    }

    /// Same raciness problems as [`Self::read_pos_unsync`].
    /// # Safety:
    /// This number may or may not make any sense, bounds checking is still necessary
    /// to retain safety
    pub unsafe fn write_pos_unsync(&self, offset: loff_t) {
        unsafe {
            self.pos_ptr().write(offset);
        }
    }
}
```

In this case the `Rust`-code does not take any reference, and thus side-steps the aliasing-problems completely, 
instead using pointer-arithmetic to find the correct field on the `file`-struct, and reading that directly.  

#### Data-races

If the comments were read another problem has now become apparent, there's a data-race if there isn't exclusive access 
to the pos-pointer.  

Looking back at the `C`-code: 

In `ksys_read` `fdget_pos(fd)` was [invoked here](https://github.com/MarcusGrass/linux/blob/mg/proc-fs/fs/read_write.c#L610).

`fdget_pos` looks like this:

```c
static inline struct fd fdget_pos(int fd)
{
	return __to_fd(__fdget_pos(fd));
}
```

It proxies the call to `__fdget_pos` and then converts the result to an `fd`.

`__fdget_pos` is defined [here in file.c](https://github.com/MarcusGrass/linux/blob/mg/proc-fs/fs/file.c#L1180)

```c
unsigned long __fdget_pos(unsigned int fd)
{
	unsigned long v = __fdget(fd);
	struct file *file = (struct file *)(v & ~3);

	if (file && file_needs_f_pos_lock(file)) {
		v |= FDPUT_POS_UNLOCK;
		mutex_lock(&file->f_pos_lock);
	}
	return v;
}
```

The code implies that sometimes a `file` is determined to need a `pos_lock`, digging into 
`file_needs_f_pos_lock` that's defined [here](https://github.com/MarcusGrass/linux/blob/mg/proc-fs/fs/file.c#L1174): 

```c
/*
 * Try to avoid f_pos locking. We only need it if the
 * file is marked for FMODE_ATOMIC_POS, and it can be
 * accessed multiple ways.
 *
 * Always do it for directories, because pidfd_getfd()
 * can make a file accessible even if it otherwise would
 * not be, and for directories this is a correctness
 * issue, not a "POSIX requirement".
 */
static inline bool file_needs_f_pos_lock(struct file *file)
{
	return (file->f_mode & FMODE_ATOMIC_POS) &&
		(file_count(file) > 1 || file->f_op->iterate_shared);
}
```

In short: If the `file` has `f_mode` `FMODE_ATOMIC_POS`, and (there are multiple open handles or 
the `file` has the file operation `iterate_shared` defined), then the `pos` will be locked.  

The kernel generally doesn't mess with the flags, they are set by the user, so there is no guarantee that 
the `file`'s `pos` won't be shared while the `Rust`-code is using it.

#### An acceptable data race

In practice, for the `pos`-field, this means that when reading to it, the `Rust`-code may get an old-value, 
or worse, an incomplete or unexpected value, it's undefined.  

That issue cannot be worked around, and in some cases, directly reading the value would be UB, 
for example if the `Rust`-code expects a struct where all bit-patterns aren't valid.

In the case of the `proc`-handler, and `pos`-field, the `Rust`-code is trying to read an `loff_t` which on 
`x86_64` is an `i64`, but on other platforms it's an equally simple number.  

`loff_t` is valid for all bit-patterns, so reading it is not UB by itself, it's correctly initialized memory, 
but the value of it may be garbage.  

As the above `Rust`-code comments describe, the read value shall never be trusted and always be subject to 
validation, the reading itself is `safe`, but the function is marked `unsafe` anyway to make that fact extra clear.  

#### Handling reading racy data for more complex structs

Since reading `pos` from `file` happened to be simple, ways of handling more complex cases wasn't explained.
Shortly, if `Rust`-code wants to read some struct from a pointer that could contain any bit-pattern, and the 
struct cannot tolerate any bit-pattern, the programmer would need to read into something else first.

```rust
use std::ptr::NonNull;

struct MyStruct {
  field_a: Inner,
  field_b: OtherThing,
}

/// # Safety
unsafe fn read_my_struct_from_pointer(ptr: *mut MyStruct) -> Option<MyStruct> {
  // Comp-time size of the struct in bytes
  const LEN: usize = core::mem::size_of::<MyStruct>();
  // Zeroed byte-array that can hold that number of bytes
  let mut bytes = [0u8; LEN];
  let byte_ptr = (&mut bytes) as *mut u8;
  // Copy the raw data into the byte-array
  ptr.cast::<u8>()
          .copy_to_nonoverlapping(byte_ptr, LEN);
  // Validate that the data is well-formed
  MyStruct::try_from_bytes(bytes);
}
```

That may look trivial, but implementing `try_from_bytes` is where memory-layout-requirements have to be checked, 
there are crates for that, like [bytemuck](https://docs.rs/bytemuck/latest/bytemuck/), if encountering that 
kind of situation, looking into that is recommended.  

---

Now the signature looks like this:

```rust
unsafe fn plseek(
    file: &mut ProcOpFileHandle,
    offset: kernel::bindings::loff_t,
    whence: Whence,
) -> Result<kernel::bindings::loff_t>;
```

There's a mutable reference to `ProcOpFileHandle` which wraps a raw `file`-pointer. 
It's marked as mutable to prevent race-conditions by shared modifications, they are inescapable since 
the inner pointer is shared with `C`-code, but there's no reason to make a bad problem worse.

---

### Continuing the abstraction

Continuing, something needs to wrap this `Rust`-function, validate that `Whence` can be converted from the provided `int` 
from the `C`-style function, check that the file-pointer is non-null and create a `ProcOpsFileHandle`, and lastly handle 
the `Result`. 

Here's an example of how that could look: 

```rust
/// Raw C-entrypoint
unsafe extern "C" fn proc_lseek(
    file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: core::ffi::c_int,
) -> kernel::bindings::loff_t {
    let Ok(whence_u32) = u32::try_from(whence) else {
        return EINVAL.to_errno().into();
    };
    let Ok(whence) = Whence::try_from(whence_u32) else {
        return EINVAL.to_errno().into();
    };
    let mut file_ref = if let Some(ptr) = core::ptr::NonNull::new(file) {
        ProcOpFileHandle(ptr)
    } else {
        return EINVAL.to_errno().into();
    };
    match (T::LSEEK)(&mut file_ref, offset, whence) {
        core::result::Result::Ok(offs) => offs,
        core::result::Result::Err(e) => {
            return e.to_errno().into();
        }
    }
}
```

The `T::LSEEK` comes from a generic bound, as with the minimal example, this function-pointer comes from 
a struct, which is bounded on a struct implementing a trait.

The definition of the generated `proc_ops` looks like this:
```rust 
pub struct proc_ops {
    pub proc_flags: core::ffi::c_uint,
    pub proc_open: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut inode, arg2: *mut file) -> core::ffi::c_int,
    >,
    pub proc_read: ::core::option::Option<
        unsafe extern "C" fn(
            arg1: *mut file,
            arg2: *mut core::ffi::c_char,
            arg3: usize,
            arg4: *mut loff_t,
        ) -> isize,
    >,
    pub proc_read_iter: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut kiocb, arg2: *mut iov_iter) -> isize,
    >,
    pub proc_write: ::core::option::Option<
        unsafe extern "C" fn(
            arg1: *mut file,
            arg2: *const core::ffi::c_char,
            arg3: usize,
            arg4: *mut loff_t,
        ) -> isize,
    >,
    pub proc_lseek: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut file, arg2: loff_t, arg3: core::ffi::c_int) -> loff_t,
    >,
    pub proc_release: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut inode, arg2: *mut file) -> core::ffi::c_int,
    >,
    pub proc_poll: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut file, arg2: *mut poll_table_struct) -> __poll_t,
    >,
    pub proc_ioctl: ::core::option::Option<
        unsafe extern "C" fn(
            arg1: *mut file,
            arg2: core::ffi::c_uint,
            arg3: core::ffi::c_ulong,
        ) -> core::ffi::c_long,
    >,
    pub proc_compat_ioctl: ::core::option::Option<
        unsafe extern "C" fn(
            arg1: *mut file,
            arg2: core::ffi::c_uint,
            arg3: core::ffi::c_ulong,
        ) -> core::ffi::c_long,
    >,
    pub proc_mmap: ::core::option::Option<
        unsafe extern "C" fn(arg1: *mut file, arg2: *mut vm_area_struct) -> core::ffi::c_int,
    >,
    pub proc_get_unmapped_area: ::core::option::Option<
        unsafe extern "C" fn(
            arg1: *mut file,
            arg2: core::ffi::c_ulong,
            arg3: core::ffi::c_ulong,
            arg4: core::ffi::c_ulong,
            arg5: core::ffi::c_ulong,
        ) -> core::ffi::c_ulong,
    >,
}
```

It's a struct containing a bunch of optional function-pointers. Here's what it looks after abstracting most of the `C`-parts away
(only implementing `open`, `read`, `write`, and `lseek`). 

```rust
/// Type alias for open function signature
pub type ProcOpen<'a> = &'a dyn Fn(&mut ProcOpFileHandle) -> Result<i32>;
/// Type alias for read function signature
pub type ProcRead<'a> =
&'a dyn Fn(&mut ProcOpFileHandle, UserSliceWriter, loff_t) -> Result<(usize, usize)>;
/// Type alias for write function signature
pub type ProcWrite<'a> =
&'a dyn Fn(&mut ProcOpFileHandle, UserSliceReader, loff_t) -> Result<(usize, usize)>;
/// Type alias for lseek function signature
pub type ProcLseek<'a> = &'a dyn Fn(&mut ProcOpFileHandle, loff_t, Whence) -> Result<loff_t>;

/// Proc file ops handler
pub trait ProcHandler<'a> {
    /// Open handler
    const OPEN: ProcOpen<'a>;
    /// Read handler
    const READ: ProcRead<'a>;
    /// Write handler
    const WRITE: ProcWrite<'a>;
    /// Lseek handler
    const LSEEK: ProcLseek<'a>;
}
/// Wrapper for the kernel type `proc_ops`
/// Roughly a translation of the expected `extern "C"`-function pointers that
/// the kernel expects into Rust-functions with a few more helpful types.
pub struct ProcOps<'a, T>
where
    T: ProcHandler<'static>,
{
    ops: bindings::proc_ops,
    _pd: PhantomData<&'a T>,
}
impl<'a, T> ProcOps<'a, T>
where
    T: ProcHandler<'static>,
{
    /// Create new ProcOps from a handler and flags
    pub const fn new(proc_flags: u32) -> Self {
        Self {
            ops: proc_ops {
                proc_flags,
                proc_open: Some(ProcOps::<'a, T>::proc_open),
                proc_read: Some(ProcOps::<'a, T>::proc_read),
                proc_read_iter: None,
                proc_write: Some(ProcOps::<'a, T>::proc_write),
                proc_lseek: Some(ProcOps::<'a, T>::proc_lseek),
                proc_release: None,
                proc_poll: None,
                proc_ioctl: None,
                proc_compat_ioctl: None,
                proc_mmap: None,
                proc_get_unmapped_area: None,
            },
            _pd: PhantomData,
        }
    }
    unsafe extern "C" fn proc_open(
        inode: *mut kernel::bindings::inode,
        file: *mut kernel::bindings::file,
    ) -> i32 {
        ...
        // Call T::OPEN 
        ...
    }
    unsafe extern "C" fn proc_read(
        file: *mut kernel::bindings::file,
        buf: *mut core::ffi::c_char,
        buf_cap: usize,
        read_offset: *mut kernel::bindings::loff_t,
    ) -> isize {
        ...
        // Call T::READ 
        ...
    }
    unsafe extern "C" fn proc_write(
        file: *mut kernel::bindings::file,
        buf: *const core::ffi::c_char,
        buf_cap: usize,
        write_offset: *mut kernel::bindings::loff_t,
    ) -> isize {
        ...
        // Call T::WRITE 
        ...
    }
    unsafe extern "C" fn proc_lseek(
        file: *mut kernel::bindings::file,
        offset: kernel::bindings::loff_t,
        whence: core::ffi::c_int,
    ) -> kernel::bindings::loff_t {
        ...
        // Call T::LSEEK 
        ...
    }
}
```

Some details are elided for brevity, the above code defines a trait `ProcHandler`, which contains 
constants for each of the functions to be provided. Those constants are `'static`-references to rust functions. 

Then it defines the `ProcOps`-struct, which is generic over `ProcHandler`, it defines the correct `C`-style 
functions which do conversions and call the provided `ProcHandler`'s `'&static`-functions and return their results.  

---

Using this, the `C`-style proc_create function can get a `Rust`-abstraction taking that `ProcOps`-struct:

```rust
/// Create a proc entry with the filename `name`
pub fn proc_create<'a, T>(
    name: &'static kernel::str::CStr,
    mode: bindings::umode_t,
    dir_entry: Option<&ProcDirEntry<'a>>,
    proc_ops: &'a ProcOps<'a, T>,
) -> Result<ProcDirEntry<'a>>
where
    T: ProcHandler<'static>,
{
    // ProcOps contains the c-style struct, give the kernel a pointer to the address of that struct
    let pops = core::ptr::addr_of!(proc_ops.ops);
    let pde = unsafe {
        let dir_ent = dir_entry
            .map(|de| de.ptr.as_ptr())
            .unwrap_or_else(core::ptr::null_mut);
        bindings::proc_create(
            name.as_ptr() as *const core::ffi::c_char,
            mode,
            dir_ent,
            pops,
        )
    };
    match core::ptr::NonNull::new(pde) {
        None => Err(ENOMEM),
        Some(nn) => Ok(ProcDirEntry {
            ptr: nn,
            _pd: core::marker::PhantomData::default(),
        }),
    }
}
```

---

### Using the abstraction

Now it's time to use the abstraction, it looks like this:

```rust
struct ProcHand;

/// Implement `ProcHandler`, providing static references to rust-functions
impl ProcHandler<'static> for ProcHand {
    const OPEN: kernel::proc_fs::ProcOpen<'static> = &popen;

    const READ: kernel::proc_fs::ProcRead<'static> = &pread;

    const WRITE: kernel::proc_fs::ProcWrite<'static> = &pwrite;

    const LSEEK: kernel::proc_fs::ProcLseek<'static> = &plseek;
}

unsafe fn popen(file: &mut ProcOpFileHandle) -> Result<i32> {
    Ok(0)
}

unsafe fn pread(
    _file: &mut ProcOpFileHandle,
    mut user_slice: UserSliceWriter,
    offset: kernel::bindings::loff_t,
) -> Result<(usize, usize)> {
    ...
}

unsafe fn pwrite(
    file: &mut ProcOpFileHandle,
    user_slice_reader: UserSliceReader,
    offset: kernel::bindings::loff_t,
) -> Result<(usize, usize)> {
    ...
}

unsafe fn plseek(
    file: &mut ProcOpFileHandle,
    offset: kernel::bindings::loff_t,
    whence: Whence,
) -> Result<kernel::bindings::loff_t> {
    ...
}

```

---

#### User pointers

Oh right, the `__user`-part.  

On the first iterations of this module I conveniently ignored it, when the kernel is passed a buffer from a user 
that is marked `__user`, it needs to copy that memory from the user to be able to use it, it can't directly read from 
the provided buffer. The same goes for writing, it needs to copy memory into the buffer, it can't just directly use 
the buffer. 

On the `C`-side, this is done by the functions exposed by `linux/uaccess.h` 
[copy_from_user](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/include/linux/uaccess.h#L189)
and [copy_to_user](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/include/linux/uaccess.h#L201).  

The functions will: 

1. Check if the operation should fault, a bit complicated and I don't fully understand where faults may be injected, 
but the documentation is [here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/Documentation/fault-injection/fault-injection.rst).  
2. Check that the memory is a valid user space address
3. Check that the object has space to be written into/read from a valid address (no OOB reads into memory the user
doesn't have access to).
4. Do the actual copying

The `Rust` kernel code fairly conveniently wraps this into an api [here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/kernel/uaccess.rs).  

---

The api is used in the wrapper for `PropOps`, it looks like this: 

```rust
unsafe extern "C" fn proc_read(
    file: *mut kernel::bindings::file,
    buf: *mut core::ffi::c_char,
    buf_cap: usize,
    read_offset: *mut kernel::bindings::loff_t,
) -> isize {
    ...
    let buf = buf as *mut u8 as usize;
    let buf_ref = UserSlice::new(buf, buf_cap);
    let buf_writer = buf_ref.writer();
    ...
    match (T::READ)(file_ref, buf_writer, offset) {
        ...
    }
}
```

The code takes the raw `buf`-ptr which lost its `__user`-annotation through bindgen, turns it into 
a raw address, and makes a `UserSlice` out of it, it then turns that slice into a `UserSliceWriter` (the user reads 
data, then the kernel needs to write data), and passes that into the module's supplied `READ`-function. 
Which again, has a signature that looks like this: 

```rust
pub type ProcRead<'a> =
&'a dyn Fn(&mut ProcOpFileHandle, UserSliceWriter, loff_t) -> Result<(usize, usize)>;

```

---

### Writing the module

The module is defined by this convenient `module!`-macro:

```rust
struct RustProcRamFile;

module! {
    type: RustProcRamFile,
    name: "rust_proc_ram_file",
    author: "Rust for Linux Contributors",
    description: "Rust proc ram file example",
    license: "GPL",
}

```

Most of that is metadata. But, the name will be the same name that can be [modprobe'd](https://linux.die.net/man/8/modprobe) 
to load the module, e.g. `modprobe rust_proc_ram_file`.  

All that remains is implementing `kernel::Module` for `RustProcRamFile`, which is an arbitrary struct to represent 
module data.

```rust
impl kernel::Module for RustProcRamFile {
    fn init(_module: &'static ThisModule) -> Result<Self> {
        // Initialization-code
        ...
        Self
    }
}
```

One hitch is that the module needs to be safe for concurrent access, it needs to be both `Send` + `Sync`.  

Remembering that the objective is to build a `file` that is backed by just bytes (a `Vec<u8>` being most convenient), 
creating a `RustProcRamFile(Vec<u8>)` won't cut it.

There's a need for shared mutable state and that's where this gets tricky.

---

### Mutex

One of the simplest ways of creating (simplest by mental model at least) is by wrapping the state with a mutual-exclusion
lock, a `Mutex`.  

Through the Kernel's `C`-API it's trivial to do that statically. 

```c
static DEFINE_MUTEX(my_mutex);
```

It statically defines a mutex ([definition here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/include/linux/mutex.h#L75))
which can be interacted with, by e.g. 
[mutex_lock](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/include/linux/mutex.h#L173), 
[mutex_unlock](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/include/linux/mutex.h#L192),
etc. 

In `Rust`-land there's a safe API for creating mutexes, it looks like this: 

```rust
let pin_init_lock = kernel::new_mutex!(Some(data), "proc_ram_mutex");
```

`pin_init_lock` is something that implements [PinInit](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/kernel/init.rs#L838), 
the most important function of which is `__pinned_init(self, slot: *mut T)`  
which takes uninitialized memory that fits a `T` and initializes the variable there.  
What pinning is, why it's necessary, and how to use it properly I won't get into, people have 
explained it significantly better than I ever could [Without boats](https://without.boats/blog/pin/) for example.
For this purpose, `PinInit` could be thought of as a function looking for some memory to place its value.

For reasons that will become clearer later, the `mutex` will be initialized into static memory.  

---

Finally, to initialize the data that the `file` will be backed by, the code looks like this:

```rust
mod backing_data {
    use core::cell::UnsafeCell;
    use kernel::sync::lock::{mutex::MutexBackend, Lock};
    use super::*;
    static mut MAYBE_UNINIT_DATA_SLOT: MaybeUninit<Mutex<Option<alloc::vec::Vec<u8>>>> =
        MaybeUninit::uninit();
    ...

    /// Initialize the backing data of this module, letting new
    /// users access it.
    /// # Safety
    /// Safe if only called once during the module's lifetime
    pub(super) unsafe fn init_data(
        lock_ready: impl PinInit<Lock<Option<alloc::vec::Vec<u8>>, MutexBackend>>,
    ) -> Result<()> {
        unsafe {
            let slot = MAYBE_UNINIT_DATA_SLOT.as_mut_ptr();
            lock_ready.__pinned_init(slot)?;
        }
        Ok(())
    }
    ...
    /// Get's the initialized data as a static reference
    /// # Safety
    /// Safe only if called after initialization, otherwise
    /// it will return a pointer to uninitialized memory.  
    pub(super) unsafe fn get_initialized_data() -> &'static Mutex<Option<alloc::vec::Vec<u8>>> {
        unsafe { MAYBE_UNINIT_DATA_SLOT.assume_init_ref() }
    }
    ...
}

impl kernel::Module for RustProcRamFile {
    fn init(_module: &'static ThisModule) -> Result<Self> {
        ...
        let data = alloc::vec::Vec::new();
        let lock = kernel::new_mutex!(Some(data), "proc_ram_mutex");
        unsafe {
            // Safety: Only place this is called, has to be invoked before `proc_create`
            backing_data::init_data(lock)?
        }
        ...
    }
}
```

That's quite a lot.

---

First off, the `static mut MAYBE_UNINIT_DATA_SLOT: MaybeUninit<Mutex<Option<alloc::vec::Vec<u8>>>> = MaybeUninit::uninit();` 
creates static uninitialized memory, that's represented by the [MaybeUninit](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html).
The memory has space for a `Mutex` containing an `Option<alloc::vec::Vec<u8>>`.  
Using `static mut` is heavily discouraged, some more details [here](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html#static-mut-refs), 
it's extremely easy to get it wrong, using it as in the above code is fine however. Messing with the `static mut` is 
delegated to a submodule to encapsulate the handling more.  

The reason for having the inner data be `Option` is to be able to remove it on module-unload and properly cleaning it up. 
The `Drop`-code will show how that cleanup works in more detail, and it's likely a bit pedantic but definitively 
prevents the backing data from leaking. Guaranteeing that when the module is unloaded, the data is deallocated.  

---

Second, in the module's `init`, a `Vec` is created, and put into a `PinInit -> Mutex` that needs memory for initialization.  
That `PinInit` is passed to `init_data` which takes a pointer to the static memory `MAYBE_UNINIT_DATA_SLOT` and writes 
the mutex into it.  

Now There's an initialized `Mutex`.  

---

### Storing the ProcDirEntry

Now `proc_create` can be called which will create a `proc`-file. 

```rust
mod backing_data {
    ...
    struct SingleAccessPdeStore(UnsafeCell<Option<ProcDirEntry<'static>>>);
    unsafe impl Sync for SingleAccessPdeStore {}
    static ENTRY: SingleAccessPdeStore = SingleAccessPdeStore(UnsafeCell::new(None));
    ...

    /// Write PDE into static memory
    /// # Safety
    /// Any concurrent access is unsafe.  
    pub(super) unsafe fn set_pde(pde: ProcDirEntry<'static>) {
        unsafe {
            ENTRY.0.get().write(Some(pde));
        }
    }

    /// Remove the PDE
    /// # Safety
    /// While safe to invoke regardless of PDE initialization,
    /// any concurrent access is unsafe.  
    pub(super) unsafe fn take_pde() -> Option<ProcDirEntry<'static>> {
        unsafe {
            let mut_ref = ENTRY.0.get().as_mut()?;
            mut_ref.take()
        }
    }
}

fn init(_module: &'static ThisModule) -> Result<Self> {
        const POPS: ProcOps<'static, ProcHand> = ProcOps::<'static, ProcHand>::new(0);
        // Struct defined inline since this is the only safe place for it to be used
        struct ProcHand;
        impl ProcHand {
            ...
        }
        let data = alloc::vec::Vec::new();
        let lock = kernel::new_mutex!(Some(data), "proc_ram_mutex");
        unsafe {
            // Safety: Only place this is called, has to be invoked before `proc_create`
            backing_data::init_data(lock)?
        }

        // This is technically unsound, e.g. READ is not safe to invoke until
        // `init_data` has been called, but could theoretically be invoked in a safe context before
        // then, so don't, it's ordered like this for a reason.
        impl ProcHandler<'static> for ProcHand {
            const OPEN: kernel::proc_fs::ProcOpen<'static> = &|f| unsafe { Self::popen(f) };

            const READ: kernel::proc_fs::ProcRead<'static> =
                &|f, u, o| unsafe { Self::pread(f, u, o) };

            const WRITE: kernel::proc_fs::ProcWrite<'static> =
                &|f, u, o| unsafe { Self::pwrite(f, u, o) };

            const LSEEK: kernel::proc_fs::ProcLseek<'static> =
                &|f, o, w| unsafe { Self::plseek(f, o, w) };
        }

        let pde = proc_create(c_str!("rust-proc-file"), 0666, None, &POPS)?;
        unsafe {
            // Safety: Only place this is called, no concurrent access
            backing_data::set_pde(pde);
        }
        pr_info!("Loaded /proc/rust-proc-file\n");
        Ok(Self)
    }
```

That's also quite a lot.
Now the code is encountering issues with unsoundness (an API that is not marked as unsafe but is unsafe under some conditions).  

---

Starting from the top:

Calling `proc_create` returns a `ProcDirEntry` which when dropped removes the `proc`-file. The entry should be kept alive 
until the module is dropped. Therefore, a static variable `ENTRY` is created to house it, it will get removed on 
the module's `Drop`.  

`static`-entries need to be [Sync](https://doc.rust-lang.org/std/marker/trait.Sync.html) i.e. it can be shared between threads, 
`UnsafeCell` is not `Sync`, it therefore needs to be wrapped in the [newtype](https://doc.rust-lang.org/rust-by-example/generics/new_types.html)
`SingleAccessPdeStore`. It is indeed safe to be shared between threads in some conditions, so 
`Sync` is unsafely implemented through: 

```rust
unsafe impl Sync for SingleAccessPdeStore {}
```

It tells the compiler that even though it doesn't look `Sync` it should treat is as `Sync`.
(`Sync` and `Send` are examples of automatic trait implementations, if a `struct` contain types that all implement
`Send` and/or `Sync`, that struct will also implement `Send` or `Sync`, a bit more on that [here](https://doc.rust-lang.org/stable/unstable-book/language-features/auto-traits.html)).  

---

Next comes two `unsafe` functions. One sets the `ENTRY` to a provided `ProcDirEntry<'static>`, 
the operation is safe as long as it doesn't happen concurrently, that would create a data-race.  

The other takes the `ProcDirEntry` from `ENTRY`, this is done on module teardown, when the module is unloaded, for example 
through [rmmod](https://linux.die.net/man/8/rmmod), `rmmod rust_proc_ram_file`. 

Entering the `init`-function, there are struct definitions and trait-implementations defined inside the function.  
The reasons for this is to make some inherent `unsoundness` about the memory-lifecycle less dangerous, it's worth getting 
into why that it is, and what the trade-offs of having some `unsoundness` is.

---

### Memory lifecycle, you, me, and `C`

Again, the C-api looks like this:

```c
struct proc_ops {
	unsigned int proc_flags;
	int	(*proc_open)(struct inode *, struct file *);
	ssize_t	(*proc_read)(struct file *, char __user *, size_t, loff_t *);
	ssize_t (*proc_read_iter)(struct kiocb *, struct iov_iter *);
	ssize_t	(*proc_write)(struct file *, const char __user *, size_t, loff_t *);
	/* mandatory unless nonseekable_open() or equivalent is used */
	loff_t	(*proc_lseek)(struct file *, loff_t, int);
	int	(*proc_release)(struct inode *, struct file *);
	__poll_t (*proc_poll)(struct file *, struct poll_table_struct *);
	long	(*proc_ioctl)(struct file *, unsigned int, unsigned long);
#ifdef CONFIG_COMPAT
	long	(*proc_compat_ioctl)(struct file *, unsigned int, unsigned long);
#endif
	int	(*proc_mmap)(struct file *, struct vm_area_struct *);
	unsigned long (*proc_get_unmapped_area)(struct file *, unsigned long, unsigned long, unsigned long, unsigned long);
} __randomize_layout;

struct proc_dir_entry *proc_create(const char *name, umode_t mode, struct proc_dir_entry *parent, const struct proc_ops *proc_ops);
```

The module needs to call the function `proc_create` supplying a pointer `const struct proc_ops *proc_ops`
which itself contains function pointers. What are the lifetime requirements?

---

`const struct proc_ops *proc_ops` has a requirement to live until `proc_remove` is called on the returned `proc_dir_entry*`, 
that's easily represented in `Rust`, we could model the API to accept something with the lifetime `'a` and return 
a `ProcDirEntry<'a>`, taking ownership of the reference to `ProcOps` and calling `proc_remove` in the destructor.  

But how long do the function pointers that are themselves contained in `proc_ops` need to live?

On could assume it's the same, `'a`, but let's consider how the kernel 'routes' a user through the module and the 
lifecycle of an interaction.

---

#### A user interaction

A user wants to open the file, by name.

1. The user issues the [open](https://man7.org/linux/man-pages/man2/open.2.html) syscall.
2. The kernel picks up the open syscall, and finds this `*proc_dir_entry`.
3. The kernel enters the `proc_open`-function.
4. The kernel sets the correct register return address value.
5. The kernel yields execution.

---

The kernel handles two pointers from the module, non-atomically, in separate steps, multiple users could trigger 
this interaction concurrently (the reason for the lock).  

In the case that there exists a `*proc_dir_entry` but the `proc_open`-function pointer is 
[dangling](https://en.wikipedia.org/wiki/Dangling_pointer),
because the lifetime of it is less than `*proc_dir_entry`, or they have the same lifetime but the mechanics of 
the free happens in an unfavourable order. In that case, the kernel will try to access a dangling pointer, 
which may or may not cause chaos. A dangling pointer is worse than a null-pointer in this case, since a 
null-pointer is often acceptable for `*proc_ops`-functions.  

---

In another case, the `proc_dir_entry` may definitively be removed first, but since some process may have read the 
function pointer `proc_open` from it, but not started executing it (race) yet, `proc_open` can theoretically 
never be safely destroyed. The reason for that is because in a [time-sharing OS](https://en.wikipedia.org/wiki/Time-sharing) 
no guarantees are made about the timeliness of operations. Therefore, the lifetime requirement of 
`proc_open` is `'static` as represented by:

```rust
...
const OPEN: kernel::proc_fs::ProcOpen<'static> = &Self::popen;
...
```

---

#### Constraints caused by `'static`-lifetimes

Static (sloppily expressed) means 'for the duration of the program', if there's a `'static`-requirement for a variable 
it means that that variable needs its memory to be allocated in the binary. 

An example would be a string literal

```rust
// The `'static` lifetime can be elided
const MY_STR: &'static str = "hello";
// Implicitly also `'static`
static MY_STR2: & str = "hello";
// or 
fn my_fn() {
    let my_str = "hello";
}
```

---

In all cases the string-literal exists in the binary, the difference between these cases are that in the 
case of the `const`-variable some space is allocated in the binary that fits a reference to a `str`, 
which may point to some data that exist in the `data`-section of the binary (or somewhere else, implementation dependent).  
`const` also dictates that this value may never change. 

`static` also makes sure that the binary has space for the variable (still a reference to a string), it will also 
point to some data that is likely to be in the `data`-section, but it is theoretically legal to change the data that 
it's pointing to (with some constraints).  

In the function, space is made available on the stack for the reference, but the actual `hello` is likely again in 
the `data`-section.  

---

#### Using static data for the backing storage

Looking back at the purpose of the module, data needs to be stored with a static lifetime, there are multiple ways 
to achieve this in `Rust`, the data can be owned directly, like a member of the module `RustProcRamFile`. 
However, this means that when the module is dropped, the data is dropped as well. Since the function-pointers 
have a `'static`-requirement that doesn't work.  

Even if the data is wrapped in a `Box`, or an `Arc`, the `RustProcRamFile`-module can't own it for the above reason, 
the functions needs to live for the duration of the program (and be valid), a global static is necessary (sigh).  

But, the killer that makes it impossible to make the state a part of `RustProcRamFile` is that 
the function-pointers that are exposed cannot capture state, if the state is a part of `RustProcRamFile`, to access 
it through a function, the signature would have to be:

```rust
fn popen(&self, ...) ... {
    ...
}
```

Which cannot be made to fit the required function signature of the `C`-api.

Here is where the globals come in: 

```rust
...
static mut MAYBE_UNINIT_DATA_SLOT: MaybeUninit<Mutex<Option<alloc::vec::Vec<u8>>>> =
        MaybeUninit::uninit();
...
static ENTRY: SingleAccessPdeStore = SingleAccessPdeStore(UnsafeCell::new(None));
...
const POPS: ProcOps<'static, ProcHand> = ProcOps::<'static, ProcHand>::new(0);
```

---

Looking at the definitions, two of these contain data that can (and will) be changed, those are therefore `static`, 
one (the container of the functions that are passed through the `C`-api) is marked as `const`, since it will never change.  

`MAYBE_UNINIT_DATA_SLOT` is MaybeUninit, when the program starts, there is already space made available in 
the binary for the data it will contain, on module-initialization data will be written into that space.  

Same goes for `Entry`, `UnsafeCell` does essentially the same thing, there's a reason that both aren't wrapped by 
`UnsafeCell<Option>`, partially performance.  

#### MaybeUninit<T> vs UnsafeCell<Option<T>>

[MaybeUninit<T>](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html) contains potentially uninitialized data.
Accessing that data, by for example creating a reference to it, is UB if that data is not yet initialized.  
Which means that the requirements for safe-access is only possible if: 
1. Non-modifying access happens after initialization.
2. Modifying access happens in a non-concurrent context.

---

[UnsafeCell<Option<T>>](https://doc.rust-lang.org/std/cell/struct.UnsafeCell.html) does not contain potentially 
uninitialized data, the uninitialized state is represented by the `Option`. 
Safe access only requires that there is no concurrent access (of any kind) at the same time as mutable access. 
It's a bit easier to make safe.  

I would prefer `UnsafeCell<Option<T>>` in both cases, but as the `PinInit`-api is constructed (that is needed for 
the `Mutex`), a slot of type `T` (being the `Mutex`) needs to be provided. Therefore, it would have to be 
`static UnsafeCell<Lock<..>>` which cannot be instantiated at compile-time in the same way that an `UnsafeCell<Option<T>>` 
can (`static MY_VAR: UnsafeCell<Option<String>> = UnsafeCell::new(None)` for example).  

One could make it work anyway, by some wrangling and implementation using `PinInit` but for this project I decided
not to.  

#### Global POPS and an unsound API

Back again to POPS, the `init`-function and unsoundness:

```rust
fn init(_module: &'static ThisModule) -> Result<Self> {
        const POPS: ProcOps<'static, ProcHand> = ProcOps::<'static, ProcHand>::new(0);
        // Struct defined inline since this is the only safe place for it to be used
        struct ProcHand;
        impl ProcHand {
            ...
        }

        let data = alloc::vec::Vec::new();
        let lock = kernel::new_mutex!(Some(data), "proc_ram_mutex");
        unsafe {
            // Safety: Only place this is called, has to be invoked before `proc_create`
            backing_data::init_data(lock)?
        }

        // This is technically unsound, e.g. READ is not safe to invoke until
        // `init_data` has been called, but could theoretically be invoked in a safe context before
        // then, so don't, it's ordered like this for a reason.
        impl ProcHandler<'static> for ProcHand {
            const OPEN: kernel::proc_fs::ProcOpen<'static> = &|f| unsafe { Self::popen(f) };

            const READ: kernel::proc_fs::ProcRead<'static> =
                &|f, u, o| unsafe { Self::pread(f, u, o) };

            const WRITE: kernel::proc_fs::ProcWrite<'static> =
                &|f, u, o| unsafe { Self::pwrite(f, u, o) };

            const LSEEK: kernel::proc_fs::ProcLseek<'static> =
                &|f, o, w| unsafe { Self::plseek(f, o, w) };
        }

        let pde = proc_create(c_str!("rust-proc-file"), 0666, None, &POPS)?;
        unsafe {
            // Safety: Only place this is called, no concurrent access
            backing_data::set_pde(pde);
        }
        pr_info!("Loaded /proc/rust-proc-file\n");
        Ok(Self)
    }
```

`ProcHand::pread, ProcHand::pwrite, and ProcHand::plseek` all access data that is not safe to 
access any time before initialization, but safe to access after, therefore they are marked as unsafe.

However, since the API (that I wrote...) takes a safe-function, they are wrapped by a `'static` closure that 
is safe, then uses an `unsafe`-block internally.  

This wrapping is implemented AFTER the code that initializes the data that is safe to access after initialization.
However, the API is still `unsound`, since the function could theoretically be called before that initialization, 
even though it's defined after it.  

One note on the wrapping, running it through [godbolt](https://godbolt.org/z/qrTW5PTW8) again shows it's still being inlined.  

This problem can be worked around, by for example, creating a `static INITIALIZED: AtomicBool = AtomicBool::new(false);`, 
and then setting that during initialization. But that requires an atomic-read on each access for something that 
is set once on initialization. This is a tradeoff of soundness vs performance, in this case performance is chosen, 
because the plan for this code is not to be distributed to someone else's production environment, 
or having to be maintained by someone else. In that case opting for soundness may be preferable, although the 
'window' for creating UB here is quite slim.  


#### Deallocation

Finally, the data is set up, and can be used with some constraints, now the teardown.  

```rust
impl Drop for RustProcRamFile {
    fn drop(&mut self) {
        // Remove the PDE if initialized
        // Drop it to remove the proc entry
        unsafe {
            // Safety:
            // Runs at most once, no concurrent access
            backing_data::take_pde();
        }

        // Remove and deallocate the data
        unsafe {
            // Safety:
            // This module is only instantiated if data is initialized, therefore
            // the data is initialized when this destructor is run.
            backing_data::get_initialized_data().lock().take();
        }
        // There is theoretically a race-condition, where module-users are currently in a
        // proc handler, the handler itself is 'static, so the kernel will be trusted
        // to keep function-related memory initialized until it's no longer needed.
        // There is a race-condition where it's impossible that the file can be removed, and it's made sure that all users
        // get a 'graceful' exit, i.e. all users who can see a file and start a proc-op gets to
        // finish it. This is because the module recording that a user has entered, and removing
        // the proc-entry can't happen atomically together. It's impossible to ensure that there
        // isn't a gap between a user entering the proc-handler, then recording its presence, and
        // removing the proc-entry and checking if the user registered.
        // In that case, the user will get an EBUSY
    }
}

```

First, the `ProcDirEntry` is dropped, invoking the kernel's `proc_remove` removing the proc-file.  
After that, a reference to the initialized data is taken, and the mutex is accessed to remove the backing-data for the 
'file'. When that data is dropped, the backing data will be deallocated. 
With that, all runtime-created data is removed, the only thing that may remain are function pointers which were static 
anyway, and accessing them will produce a safe error.  

## Testing

Now that the module is 'complete', how can it be tested, and what is needed for testing?

### Objective retrospective

The objective was to write a `proc`-file that functions as a regular `file` with memory in `RAM`.  
It should handle `open`, `read`, `write`, and `lseek`.  

### Implementing tests

A simple way of testing is to `modprobe rust_proc_ram_file && cat /proc/rust-proc-file`. 
See that nothing is there.

Then `echo "abcd" > /proc/rust-proc-file && cat /proc/rust-proc-file` and 
see that `abcd` is displayed in the terminal. 

Then `echo "defg" > /proc/rust-proc-file && cat /proc/rust-proc-file` and 
see that only `defg` is displayed in the terminal.

Then `echo "defg" >> /proc/rust-proc-file && cat /proc/rust-proc-file` and 
see that `defg\nabcd` is displayed in the terminal.  

That's a simple test to cover very basic `open`, `read`, and `write` functionality, 
but no concurrency or `seeking`.  

I wrote this small tester that will: 

1. Check opening the file with different open-options (like `trucate` truncates the file).  
2. Check reading and writing. 
3. Check writing, seeking, and reading.
4. Check writing, seeking, and overwriting.
5. Check writing concurrently, and then reading.
6. Check writing concurrently while the module is unloaded/reloaded.  

If this was a serious module that should be shipped to users, then further testing 
of edge-conditions, weird user inputs, and fuzzing would be appropriate, but 
for a simple demo-module that will have to be enough.  

## Summing up

All important parts are now covered, the actual implementation of `pread`, `pwrite`, `plseek`, is fairly boring 
and straight-forward, the full code can be found [here](https://github.com/MarcusGrass/linux/tree/8e8c948133ca1a0cbf8f8add191daa739a193d99) 
if that, and the rest of the implementation is interesting.  

### Generating bindings

First off bindings for the Linux `C`-API for creating a `proc-file` had to be generated, it only required adding 
a header in the list [here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/bindings/bindings_helper.h#L19)

### Wrapping the API with reasonable lifetimes

The `C`-API has some lifetime requirements, those are encoded in the [proc_fs.rs](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/kernel/proc_fs.rs).  

The `C`-API-parts that take function-pointers can be wrapped by a `Rust`-fn with zero-cost ([as was show here](https://godbolt.org/z/qrTW5PTW8)), allowing a more `Rust`-y API
to be exposed.

### Dealing with static data in a concurrent context

Some static data needs to be initialized at runtime but not concurrently mutably accessed, that was represented by a `MaybeUninit`.  

Some static data does not need to be initialized at runtime, but cannot be mutable access concurrently, that was 
represented by an `UnsafeCell<Option<T>>`.  

Some static data was also constant, never mutable, and safe for all non-mutable access, that was represented by a 
regular `const <VAR>`.  

### Tradeoff between soundness and performance

Lastly, there was a tradeoff where some functions were arbitrarily marked as safe, even though they are unsafe under 
same conditions. Whether that tradeoff is justified is up to the programmer.  

### Testing 

Some tests were created and run to ensure 

### Shortcomings

There are a few things that should be fixed up to make this module properly safe.

1. ~~Make sure that the `*file` can be turned into an immutable reference, or better yet, 
create a `Rust`-abstraction for it. It itself contains locks, and data that is safe to mutate 
behind those locks. For it to safely be an immutable reference, that data must not be changed
while holding the immutable reference, with or without the lock, since the data isn't modeled
to be guarded, from `Rust`'s point of vue that immutable data changed when we promised not to.
That can't happen from `Rust`-code because of the immutable reference, but if `C`-code changes it
that's UB.~~
2. Make the module-api sound by implementing or using `PinInit` in such a way that an
`static UnsafeCell<Option<..>>` can be used instead of a `static mut MaybeUninit`, 
there should be no performance hit if using `unwrap_unchecked` on the option anyway, it's just
better.  
