# Rust for Linux, how hard is it to write a Kernel module in Rust at present?

Once again I'm back on parental leave, I've been lazily following the [Rust for Linux](https://rust-for-linux.com/) 
effort but finally decided to get into it and write a simple kernel module in `Rust`.  

## Objective

I've been a Linux user for quite a while but have never tried my hand at contributing to the codebase, 
the reason is that I generally spend my free time writing things that I myself would use. Having 
that as a guide leads to me finishing my side-projects. There hasn't been something that I've wanted or needed 
that I've been unable to implement in user-space, so it just hasn't happened.  

Sadly, that's still the case, so I had to contrive something: A proc-file that works just like a regular file.  

### The /proc Filesystem

The stated purpose of the `/proc` filesystem is to "provide information about the running Linux System", read 
more about it [here](https://www.kernel.org/doc/html/latest/filesystems/proc.html).  

On a Linux machine with the `/proc` filesystem you can find process information e.g. under `/proc/<pid>/..`, 
like memory usage, mounts, cpu-usage, fd's, etc. With the above stated purpose, and how the `/proc` filesystem is 
used, the purpose of this module doesn't quite fit, but for simplicity that's what I chose.

#### A proc 'file'

Proc files can be created by the kernels `proc_fs`-api, it lives [here](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h).

The function, [proc_create](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L111), looks like this: 

```c
struct proc_dir_entry *proc_create(const char *name, umode_t mode, struct proc_dir_entry *parent, const struct proc_ops *proc_ops);
```

When properly invoked it will create a file under `/proc/<name>` (if no parent is provided).  

That file is an interface to the kernel, a pseudo-file where the user interacts with it as a regular file on one end, 
and the kernel provides handlers for regular file-functionality on the other end (like `open`, `read`, `write`, `lseek`, 
etc.).  

That interface is provided through the last argument `...,proc_ops *proc_ops);...`

[proc_ops](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L29) is a struct defined like this:

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

#### proc_open

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

There are cases where one would like to do something when the file is opened, in that case, 
the *file pointer could be modified, for example by editing the `void *private_data`-field to add some data 
that will follow the file into its coming operations. 
Read some more about the [file structure here](https://www.oreilly.com/library/view/linux-device-drivers/0596000081/ch03s04.html), 
or check out its definition [here](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/fs.h#L992).  

#### proc_read

Now it's getting into some logic, when a user wants to read from the file 
it provides a buffer and an offset pointer, the signature looks like 
[this:](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L32)

```c
ssize_t	proc_read(struct file *f, char __user *buf, size_t buf_len, loff_t *offset);
```

Again there's the file structure-pointer which could contain data that 
was put there in an `open`-implementation, as well as a suspiciously annotated 
`char __user *buf`.

The kernel should write data into the user buffer, return the number of 
bytes written, and update the offset through the pointer.

#### proc_write

When a user tries to write to the file, it enters through [proc_write](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L34).

Which looks like this: 

```c
ssize_t	(*proc_write)(struct file *f, const char __user *buf, size_t buf_len, loff_t *offset);
```

The user provides the buffer it wants to write into the file along with its length, and 
a pointer to update the offset. Again suspiciously annotating the buffer with `__user`.  

The kernel should write data from the user buffer into the backing storage.  

#### proc_lseek

Lastly, if the file is to be seekable to an offset [proc_lseek](https://github.com/Rust-for-Linux/linux/blob/e31f0a57ae1ab2f6e17adb8e602bc120ad722232/include/linux/proc_fs.h#L36)
has to be implemented.

It's signature looks like this:

```c
loff_t (*proc_lseek)(struct file *f, loff_t offset, int whence);
```

Again the file is provided, the offset to seek to, and `whence` to seek, 
whence is an int which should have one of 5 values, those are described 
more in the docs [here](https://man7.org/linux/man-pages/man2/lseek.2.html), 
the most intuitive one is `SEEK_SET` which means that the file's offset should 
be set to the offset that the user provided.  

Assuming that the offset makes sense, the kernel should return the new offset.  

### Implementing it in Rust

That's it, with those 4 functions implemented there should be a fairly complete working 
file created when they're passed as members of the `proc_ops`-struct, time to start!

#### Generating bindings

Rust for Linux uses Rust-bindings generated from the kernel headers. 
They're conveniently added when building, as long as the correct headers are 
added [here](https://github.com/MarcusGrass/linux/blob/8e8c948133ca1a0cbf8f8add191daa739a193d99/rust/bindings/bindings_helper.h#L19), 
for this module only `proc_fs.h` is needed.  

#### unsafe extern "C" fn

Since Rust is compatible with `C` by jumping through some hoops, 
theoretically the module could be implemented by just using the C-api 
directly as-is through the functions provided by the bindings. 

The power of Rust is being able to take unsafe code and make safe abstractions 
on top of them. But, it's a good start to figure out how the API's work.  

The generated rust functions-pointer-definitions look like this:

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

One key difference between these C-style function declarations and something 
like `Rust`'s [`Fn`-traits](https://doc.rust-lang.org/std/ops/trait.Fn.html) 
is that these function cannot capture any state.  

This necessitates using global-static for persistent state that has to 
be shared between user-calls into the proc-file.
(For modifications that do not have to be shared or persisted after the interaction ends
, the `file`'s private data could be used).  

Another key difference is that that pesky `__user`-annotation is finally gone, let's not 
think more about that, the problem solved itself.  

#### Abstraction

As mentioned previously, one key-point of rust is being able to 
abstract away unsafety, ideally an API would consist of `Rust` function-signatures 
containing refernces instead of `C`-style function-signatures containing raw pointers, 
it's a bit tricky, but it can be done.

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

Through godbolt it produces this assembly:

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
code is having the function connected to a struct, but using that better abstractions can be provided.

#### Better function signatures

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
an immutable reference **should** be safe.

```rust
fn proc_lseek(file: &kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: Whence) -> kernel::bindings::loff_t;
```

Making a safer abstraction over the bindings struct `file` would be even better, but deemed out of scope, 
the rust-api now communicates that lseek takes a reference to a file that should not be mutated 
(it can safely be mutated with synchronization, again out of scope), an offset, and a `Whence`-enum which 
can only be one of 5 types. 

However, something needs to wrap this `Rust`-function, validate that `Whence` can be converted from the provided `int` 
from the `C`-style function, and check that the file-pointer is non-null, and turn it into a reference. 

Here's an example of how that could look: 

```rust
/// Raw C-entrypoint
unsafe extern "C" fn proc_lseek(
    file: *mut kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: core::ffi::c_int,
) -> kernel::bindings::loff_t {
    // Take the `c_int` and Convert to a `Whence`-enum, return an error if invalid
    let Ok(whence_u32) = u32::try_from(whence) else {
        return EINVAL.to_errno().into();
    };
    let Ok(whence) = Whence::try_from(whence_u32) else {
        return EINVAL.to_errno().into();
    };
    // Take the file-pointer, convert to a reference if not null
    let file_ref = unsafe {
        let Some(file_ref) = file.as_ref() else {
            return EINVAL.to_errno().into();
        };
        file_ref
    };
    // Execute the rust-function `T:LSEEK` with the converted arguments, and return the result, or error as an errno
    match (T::LSEEK)(file_ref, offset, whence) {
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
pub type ProcOpen<'a> = &'a dyn Fn(&inode, &file) -> Result<i32>;
/// Type alias for read function signature
pub type ProcRead<'a> = &'a dyn Fn(&file, UserSliceWriter, &loff_t) -> Result<(usize, usize)>;
/// Type alias for write function signature
pub type ProcWrite<'a> = &'a dyn Fn(&file, UserSliceReader, &loff_t) -> Result<(usize, usize)>;
/// Type alias for lseek function signature
pub type ProcLseek<'a> = &'a dyn Fn(&file, loff_t, Whence) -> Result<loff_t>;

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
    T: ProcHandler<'a>,
{
    ops: bindings::proc_ops,
    _pd: PhantomData<&'a T>,
}
impl<'a, T> ProcOps<'a, T>
where
    T: ProcHandler<'a>,
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
}
```

Some details are elided for brevity, the above code defines a trait `ProcHandler`, which contains 
constants for each of the functions to be provided. Those constants are `'static`-references to rust functions. 

Then it defines the `ProcOps`-struct, which is generic over `ProcHandler`, it defines the correct `C`-style 
functions which do conversions and call the provided `ProcHandler`'s `'&static`-functions and return their results.  

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
    T: ProcHandler<'a>,
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

#### Getting to work

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

#[inline]
fn popen(_inode: &kernel::bindings::inode, _file: &kernel::bindings::file) -> Result<i32> {
    Ok(0)
}

fn pread(
    _file: &kernel::bindings::file,
    mut user_slice: UserSliceWriter,
    offset: &kernel::bindings::loff_t,
) -> Result<(usize, usize)> {
    ...
}

fn pwrite(
    file: &kernel::bindings::file,
    user_slice_reader: UserSliceReader,
    offset: &kernel::bindings::loff_t,
) -> Result<(usize, usize)> {
    ...
}

fn plseek(
    file: &kernel::bindings::file,
    offset: kernel::bindings::loff_t,
    whence: Whence,
) -> Result<kernel::bindings::loff_t> {
    ...
}

```

Oh right, the `__user`-part.  

On the first iterations of this module I conveniently ignored it, when the kernel is passed a buffer from a user 
that is marked `__user`, it needs to copy that memory from the user to be able to use it, it can't directly read from 
the provided buffer. The same goes for writing, it needs to copy memory into the buffer, it can't just directly use 
the buffer. 

On the `C`-side, this is done by <find copy_from_user and copy_to_user defs>
