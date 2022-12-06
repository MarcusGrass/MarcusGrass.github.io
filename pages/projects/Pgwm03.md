# PGWM 0.3, tiny-std, and xcb-parse

I recently made a substantial rewrite of my (now) pure rust x11 window manager and want to collect my thoughts on it
somewhere.

## X11 and the Linux desktop

PGWM is an educational experience into Linux desktop environments,
the [x11 specification](https://en.wikipedia.org/wiki/X_Window_System)
first came about in 1984 and has for a long time been the only mainstream way for gui-applications on Linux to
show what they need on screen for their users.

When working on desktop applications for Linux, the intricacies of that protocol are mostly hidden by the desktop
frameworks a developer might encounter. In `Rust`,
the cross-platform library [winit](https://github.com/rust-windowing/winit) can be used for this purpose,
and applications written in `Rust` like the terminal emulator [Alacritty](https://github.com/alacritty/alacritty)
uses `winit`.

At the core of the Linux desktop experience lies the Window Manager, either alone or accompanied by a Desktop
Enviroment (DE). The Window Manager makes decisions on how windows are displayed.

### The concept of a Window

*Window* is a loose term often used to describe some surface that can be drawn to on screen.  
In X11, a window is a `u32` id that the `xorg-server` keeps information about. It has properties, such as a height and
width, it can be visible or not visible, and it enables the developer to ask the server to subscribe to events.

### WM inner workings and X11 (no compositor)

X11 works by starting the `xorg-server`, the `xorg-server` takes care of collecting input
from [HIDs](https://en.wikipedia.org/wiki/Human_interface_device)
like the keyboard and mouse, collecting information about device state,
such as when a screen is connected or disconnected,
and coordinates messages from running applications including the Window Manager.  
This communication goes over a socket, TCP or Unix. The default is `/tmp/.X11-unix/X0` for a single-display desktop
Linux environment.

The details of the communication are specified in xml files in Xorg's gitlab
repo [xcbproto](https://gitlab.freedesktop.org/xorg/proto/xcbproto/-/tree/master/src).
The repo contains language bindings, xml schemas that specify how an object passed over the socket should be structured
to be recognized by the xorg-server.
The name for the language bindings is XCB for 'X protocol C-language Binding'.  
Having this kind of protocol means that a developer who can't or won't directly link to and use the `xlib` C-library
can instead construct their own representations of those objects and send those over the socket.

In PGWM a `Rust` language representation of these objects are used, containing serialization and deserialization methods
that turn Rust structs into raw bytes that can be transmitted on the socket.

If launching PGWM through [xinit](https://wiki.archlinux.org/title/xinit), an xorg-server is started at the beginning
of that script, if PGWM is launched inside that script it will try to become that server's Window Manager.

When an application starts within the context of X11, a handshake takes place. The application asks for setup
information from the server, and if the server replies with a success the application can start interfacing
with the server.  
In a WM's case, it will request to set the `SubstructureRedirectMask` on the root X11 window.  
Only one application can have that mask on the root window at a given time. Therefore, there can only be one WM active
for a running xorg-server.  
If the change is granted, layout change requests will be sent to the WM. From then on the WM can make decisions on the
placements of windows.

When an application wants to be displayed on screen it will send a `MapRequest`, when the WM gets that request it will
make a decision whether that window will be shown, and its dimensions, and forward that decision to the xorg-server
which is responsible for drawing it on screen. Changing window dimensions works much the same way.

A large part of the trickiness of writing a WM, apart from the plumbing of getting the socket communication right, is
handling focus.  
In X11, focus determines which window will receive user input, aside from the WM making the decision of what should
be focused at some given time, some `Events` will by default trigger focus changes, making careful reading of the
protocol an important part of finding maddening bugs.  
What is currently focused can be requested from the xorg-server by any application, and notifications on focus changes
are produced if requested. In PGWM, focus becomes a state that needs to be kept on both the WM's and X11's side to
enable swapping between `workspaces` and having previous windows re-focused, and has been a constant source of bugs.

Apart from that, the pure WM responsibilities are not that difficult, wait for events, respond by changing focus or
layout, rinse and repeat.
The hard parts of PGWM has been removing all C-library dependencies, and taking optimization to a stupid extent.

# Remove C library dependencies, statically link PGWM 0.2

I wanted PGWM to be statically linked, small and have no C-library dependencies for 0.2. I had one problem.

## Drawing characters on screen

At 0.1, PGWM used language bindings to the [XFT](https://en.wikipedia.org/wiki/Xft)(X FreeType interface library)
C-library, through the Rust `libx11` bindings library [X11](https://crates.io/crates/x11). XFT handles font rendering.
It was used to draw characters on the status bar.

XFT provides a fairly nice interface, and comes with the added bonus
of [Fontconfig](https://en.wikipedia.org/wiki/Fontconfig) integration.
Maybe you've encountered something like this `JetBrainsMono Nerd Font Mono:size=12:antialias=true`, it's
an excerpt from my `~/.Xresources` file and configures the font for Xterm. Xterm uses fontconfig to figure out where
that font is located on my machine. Removing XFT and fontconfig with it, means that fonts have to specified by path,
now this is necessary to find fonts: `/usr/share/fonts/JetBrains\ Mono\ Medium\ Nerd\ Font\ Complete\ Mono.ttf`, oof.
I still haven't found a non `C` replacement for finding fonts without specifying an absolute path.

One step in drawing a font is taking the font data and creating a vector of light intensities, this process is called
Rasterization. Rust has a font rasterization library [fontdue](https://github.com/mooman219/fontdue)
that at least at one point claimed to be the fastest font rasterizer available.
Since I needed to turn the fonts into something that could be displayed as a vector of bytes,
I integrated that into PGWM. The next part was drawing it in the correct place. But, instead of looking
at how XFT did it I went for a search around the protocol and found the `shm` (shared memory) extension (This maneuver
cost me about a week).

### SHM

The X11 `shm` extension allows an application to share memory with X11, and request the xorg-server to draw what's in
that shared memory at some chosen location.
So I spent some time encoding what should be displayed, pixel by pixel from the background color, with the characters as
bitmaps rasterized by `fontdue` on top, into a shared memory segment, then having the xorg-server draw from that
segment.
It worked, but it took a lot of memory, increased CPU usage, and was slow.

### Render

I finally went to look at XFT's code and found that it uses
the [render](https://gitlab.freedesktop.org/xorg/proto/xcbproto/-/blob/master/src/render.xml)
extension, an extension that can register byte representations as glyphs, and then draw those glyphs at specified
locations, by glyph-id. This is the sane way to do
it. After implementing that, font rendering was again working, and the performance was good.

# PGWM 0.3 how can I make this smaller and faster?

I wanted PGWM to be as resource efficient as possible, I decided to dig into the library that I used do serialization
and deserialization of `Rust` structs that were to go over the socket to the `xorg-server`.

The library I was using was [X11rb](https://github.com/psychon/x11rb) an excellent safe and performant library for doing
just that.
However, I was taking optimization to a ridiculous extent, so I decided to make that library optimized for my specific
use case.

## PGWM runs single threaded

X11rb can handle multithreading, making the execution path for single threaded applications longer than necessary.  
I first rewrote the connection logic from interior mutability (the connection handles synchronization) to exterior
mutability (user handles synchronization, by for example wrapping it in an `Arc<RwLock<Connection>>`).  
This meant a latency decrease of about 5%, which was pretty good. However, it did mean
that [RAII](https://en.wikipedia.org/wiki/Resource_acquisition_is_initialization)
no longer applied and the risk of memory leaks went up.
I set the WM to panic on leaks in debug and cleaned them up where I found them to handle that.

## Optimize generated code

In X11rb, structs were serialized into owned allocated buffers of bytes, which were then sent over the socket.
This means a lot of allocations. Instead, I created a connection which holds an out-buffer, structs are always
serialized directly into it, that buffer is then flushed over the socket. Meaning no allocations are necessary during
serialization.

The main drawback of that method is management of that buffer. If it's growable then the largest unflushed batch
will take up memory for the WM's runtime, or shrink-logic needs to be inserted after each flush.
If the buffer isn't growable, some messages might not fit depending on how the
buffer is proportioned. It's pretty painful in edge-cases. I chose to have a fixed-size buffer of 64kb.

At this point I realized that the code generation was hard to understand and needed a lot of changes to support my
needs. Additionally, making my WM `no_std` and removing all traces of `libc` was starting to look achievable.

### Extreme yak-shaving, generate XCB from scratch

This was by far the dumbest part of the process, reworking the entire library to support `no_std` and generate the
structures and code from scratch. From probing the Wayland specification I had written a very basic `Rust` code
generation library [codegen-rs](https://github.com/MarcusGrass/codegen-rs), I decided to use that for code generation.

After a few weeks I had managed to write a parser for the `xproto.xsd`, a parser for the actual protocol files, and a
code generator that I could work with.  
A few more weeks followed and I had finally generated a `no_std` fairly optimized library for interfacing with `X11`
over socket, mostly by looking at how x11rb does it.

### Extreme yak-shaving, pt 2, no libc allowed

In `Rust`, `libc` is the most common way that the standard library interfaces with the OS, with some direct
[syscalls](https://en.wikipedia.org/wiki/System_call) where necessary.
There are many good reasons for using `libc`, even when not building cross-platform/cross-architecture libraries,
I wanted something pure `Rust`, so that went out the window.

#### Libc

`libc` does a vast amount of things, on Linux there are two implementations that dominate, `glibc` and `musl`.
I won't go into the details of the differences between them, but simplified, they are C-libraries that make your C-code
run as you expect on Linux.  
As libraries they expose methods to interface with the OS, for example reading or writing to a file,
or connecting to a socket.  
Some functions are essentially just a proxies for `syscalls` but some do more things behind the scenes, like
synchronization of shared application resources such as access to the environment pointer.

### Removing the std-library functions and replacing them with syscalls

I decided to set PGWM to `!#[no_std]` and see what compiled. Many things in `std::*` are just re-exports from `core::*`
and were easily replaced. For other things like talking to a socket I used raw `syscalls` through the
excellent [syscall crate](https://github.com/japaric/syscall.rs)
and some glue-code to approximate what `libc` does. It was a bit messy,
but not too much work replacing it, PGWM is now 100% not cross-platform, although it wasn't really before either...

### No allocator

Since the standard library provides the allocator I had to find a new one, I decided to
use [dlmalloc](https://github.com/alexcrichton/dlmalloc-rs),
it works `no_std`, it was a fairly simple change.

### Still libc

I look into my crate graph and see that quite a few dependencies still pull in libc:

1. [time.rs](https://github.com/time-rs/time)
2. [toml.rs](https://github.com/toml-rs/toml-rs)
3. [dlmalloc-rs](https://github.com/alexcrichton/dlmalloc-rs)
4. [smallmap](https://github.com/notflan/smallmap)

I got to work forking these libraries and replacing libc with direct syscalls.  
`time` was easy, just some `Cargo.toml` magic that could easily be upstreamed.  
`toml` was a bit trickier, the solution was ugly and I decided not to upstream it.  
`dlmalloc-rs` was even harder, it used the pthread-api to make the allocator synchronize, and implementing that
was beyond even my yak-shaving. Since PGWM is single threaded anyway I left it as-is and `unsafe impl`'d
`Send` and `Sync`.   
`smallmap` fairly simple, upstreaming in progress.

### The ghost of libc, time for nightly

With no traces of `libc` I try to compile the WM. It can't start, it doesn't know how to start.  
The reason is that `libc` provides the application's entrypoint `_start`, without linking `libc` `Rust` doesn't
know how to create an entrypoint.  
As always the amazing [fasterthanli.me](https://fasterthanli.me/series/making-our-own-executable-packer/part-12) has
a write-up about how to get around that issue. The solution required nightly and some assembly.  
Now the application won't compile, but for a different reason, I have no global alloc error handler.  
When running a `no_std` binary with an allocator, `Rust` needs to know what to do if allocation fails, but there is
at present no way to provide it with a way without another nightly feature
[default_global_alloc_handler](https://github.com/rust-lang/rust/pull/102318) which looks like it's about to be
stabilized soon (TM).  
Now the WM works, `no_std` no `libc`, life is good.

## Tiny-std

I was looking at terminal emulator performance. Many new terminal emulators seem to
have [very poor input performance](https://www.reddit.com/r/linux/comments/jc9ipw/why_do_all_newer_terminal_emulators_have_such_bad/)
.
I had noticed this one of the many times PGWM crashed and sent me back to the cold hard tty, a comforting
speed. `alacritty` is noticeably sluggish at rendering keyboard input to the screen,
I went back to `xterm`, but now that PGWM worked I was toying with the idea to write a fast, small,
terminal emulator in pure rust.  
I wanted to share the code I used for that in PGWM with this new application, and clean it up in the process: `tiny-std`
.

The goal of `tiny-std` is to make a std-compatible `no_std` library with no `libc` dependencies available for use with
Linux `Rust` applications on x86_64 and aarch64, which are the platforms I'm interested in. Additionally, all
functionality
that can work without an allocator should. You shouldn't need to pull in `alloc` to read/write from a file, just
provide your own buffer.

### The nightmare of cross-architecture

Almost immediately I realize why `libc` is so well-used. After a couple of hours of debugging a segfault, and it turning
out to be incompatible field ordering depending on architecture one tends to see the light.
Never mind the third time that happens.   
I'm unsure of the best way to handle this, perhaps by doing some libgen straight from the kernel source, but we'll see.

### Start, what's this on my stack?

I wanted to be able to get arguments and preferably environment variables
into `tiny-std`. [Fasterthanli.me](https://fasterthanli.me/series/making-our-own-executable-packer/part-12)
helped with the args, but for the rest I had to go to the [musl source](https://git.musl-libc.org/cgit/musl).  
When an application starts on Linux, the first 8 bytes of the stack contains `argc`, the number of input arguments.
Following that are the null-terminated strings of the arguments (`argv`), then a null pointer,
then comes a pointer to the environment variables.  
`musl` then puts that pointer into a global mutable variable, and that's the environment.  
I buckle under and do the same, I see a world where arguments and environment are passed to main, and it's the
application's job, not the library, to decide to handle it in a thread-safe way
(although you can use `env_p` as an argument to `main` in `C`).  
Being no better than my predecessors, I store the environment pointer in a static variable, things like spawning
processes becomes a lot more simple that way, `C` owns the world, we just live in it.

### vDSO (virtual dynamic shared object), what there's more on the stack?

Through some coincidence when trying to make sure all the processes that I spawn don't become zombies I encounter
the [vDSO](https://en.wikipedia.org/wiki/VDSO).  
`ldd` has whispered the words, but I never looked it up.

```shell
[gramar@grarch marcusgrass.github.io]$ ldd $(which cat)
        linux-vdso.so.1 (0x00007ffc0f59c000)
        libc.so.6 => /usr/lib/libc.so.6 (0x00007ff14e93d000)
        /lib64/ld-linux-x86-64.so.2 => /usr/lib64/ld-linux-x86-64.so.2 (0x00007ff14eb4f000)
```

It turns out to be a shared library between the Linux kernel and a running program, mapped into that program's memory.  
When I read that it provides faster ways to interface with the kernel I immediately stopped reading and started
implementing, I could smell the nanoseconds.

#### Aux values

To find out where the VDSO is mapped into memory for an application, the application needs to inspect the
[AUX values](https://man7.org/linux/man-pages/man3/getauxval.3.html) at runtime.
After the environment variable pointer comes another null pointer, following that are the `AUX` values.
The `AUX` values are key-value(like) pairs of information sent to the process.
Among them are 16 random bytes, the `pid` of the process, the `gid`, and about two dozen more entries of
possibly useful values.  
I write some more code into the entrypoint to save these values.

### A memory mapped elf-file

Among the aux-values is `AT_SYSINFO_EHDR`, a pointer to the start of the `vDSO` which is a full
[ELF-file](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) mapped into the process' memory.  
I know that in this file is a function pointer for the `clock_gettime` function through the
[Linux vDSO docs](https://man7.org/linux/man-pages/man7/vdso.7.html). I had benchmarked `tiny-std`'s
`Instant::now()` vs the standard library's, and found it to be almost seven times slower.
I needed to find this function pointer.

After reading more Linux documentation, and ELF-documentation, and Linux-ELF-documentation,
I managed to write some code that parses the ELF-file to find the address of the function.
Of course that goes into another global variable, you know, `C`-world and all that.

I created a feature that does the vDSO parsing, and if `clock_gettime` is found, uses that instead of the syscall.
This increased the performance if `Instant::now()` from `~std * 7` to `< std * 0.9`. In other words, it now outperforms
standard by taking around 12% less time to get the current time from the system.

# Conclusion

I do a lot of strange yak-shaving, mostly for my own learning, I hope that this write-up might have given you something
too.  
The experience of taking PGWM to `no_std` and no `libc` has been incredibly rewarding, although I think PGWM is mostly
the same, a bit more efficient, a bit less stable.  
I'll keep working out the bugs and API och `tiny-std`, plans to do a minimal terminal emulator are still in the back of
my mind, we'll see if I can find the time.  
