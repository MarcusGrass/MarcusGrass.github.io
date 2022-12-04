const RAW_HTML: &str = "<h1>PGWM 0.3, tiny-std, and xcb-parse</h1>
<p>I recently made a substantial rewrite of my (now) pure rust x11 window manager and want to collect my thoughts on it
somewhere.</p>
<h2>X11 and the Linux desktop</h2>
<p>PGWM is an educational experience into Linux desktop environments,
the <a href=\"https://en.wikipedia.org/wiki/X_Window_System\">x11 specification</a>
first came about in 1984 and has for a long time been the only mainstream way for gui-applications on Linux to
show what they need on screen for their users.</p>
<p>When working on desktop applications for Linux, the intricacies of that protocol are mostly hidden by the desktop
frameworks a developer might encounter. In <code>Rust</code>,
the cross-platform library <a href=\"https://github.com/rust-windowing/winit\">winit</a> can be used for this purpose,
and applications written in <code>Rust</code> like the terminal emulator <a href=\"https://github.com/alacritty/alacritty\">Alacritty</a>
uses winit.</p>
<p>At the core of the Linux desktop experience lies the Window Manager, either alone or accompanied by a Desktop
Enviroment (DE). The Window Manager makes decisions on how windows are displayed.</p>
<h3>The concept of a Window</h3>
<p>'Window' is a loose term often used to describe some surface that can be drawn to on screen.<br />
In X11, a window is a <code>u32</code> id that the <code>xorg-server</code> keeps information about. It has properties, such as a height and
width, it can be visible or not visible, and it enables the developer to ask the server to subscribe to events.</p>
<h3>WM inner workings and X11</h3>
<p>X11 works by starting the <code>xorg-server</code>, the <code>xorg-server</code> takes care of collecting input
from <a href=\"https://en.wikipedia.org/wiki/Human_interface_device\">HIDs</a>
like the keyboard and mouse, collecting information about device state,
such as when a screen is connected and disconnected,
and coordinates messages from running applications, including the Window Manager.<br />
This communication goes over a socket, TCP or Unix. The default is <code>/tmp/.X11-unix/X0</code> for a single-display desktop
Linux environment.</p>
<p>The details of the communication are specified in xml files in Xorg's gitlab
repo <a href=\"https://gitlab.freedesktop.org/xorg/proto/xcbproto/-/tree/master/src\">xcbproto</a>.
The repo contains language bindings, xml schemas that specify how an object passed over the socket should be structured
to be recognized by the xorg-server.
The name for the language bindings is XCB for 'X protocol C-language Binding'.<br />
Having this kind of protocol means that a developer who can't or won't directly link to and use the <code>xlib</code> C-library
can instead construct their own representations of those objects and send them over the socket.</p>
<p>In PGWM a <code>Rust</code> language representation of these objects are used, containing serialization and deserialization methods
that turn Rust structs into raw bytes that can be transmitted on the socket.</p>
<p>If lunching PGWM through <a href=\"https://wiki.archlinux.org/title/xinit\">xinit</a>, an xorg-server is started at the beginning
of the script, if PGWM is launched inside that script it will try to become that server's Window Manager.</p>
<p>When an application starts within the context of x11, a handshake takes place. The application asks for setup
information from the server, and if the server replies with a success the application can start interfacing
with the server.<br />
In a WM's case, it will request to set the <code>SubstructureRedirectMask</code> on the root X11 window.<br />
Only one application can have that mask on the root window at a given time. Therefore, there can only be one WM active
for a running xorg-server.<br />
If the change is granted, layout change requests will be sent to the WM. From then on the WM can make decisions on the
placements of windows.</p>
<p>When an application wants to be displayed on screen it will send a <code>MapRequest</code>, when the WM gets that request it will
make a decision whether that window will be shown, and its dimensions, and forward that decision to the xorg-server
which is responsible for drawing it on screen. Changing window dimensions works much the same way.</p>
<p>A large part of the trickiness of writing a WM, apart from the plumbing of getting the socket communication right, is
handling focus.<br />
In X11, focus determines which window will receive user input, aside from the WM making the decision of what should
be focused at some given time, some <code>Events</code> will by default trigger focus changes, making careful reading of the
protocol an important part of finding maddening bugs.<br />
What is currently focused can be requested from the xorg-server by any application, and notifications on focus changes
are produced if requested. In PGWM, focus becomes a state that needs to be kept on both the WM's and X11's side to
enable swapping between <code>workspaces</code> and having previous windows re-focused, and has been a constant source of bugs.</p>
<p>Apart from that, the pure WM responsibilities are not that difficult, wait for events, respond by changing focus or
layout, rinse and repeat.
The hard parts of PGWM has been removing all C-library dependencies, and taking optimization to a stupid extent.</p>
<h1>Remove C library dependencies, statically link PGWM 0.2</h1>
<p>I wanted PGWM to be statically linked, small and have no C-library dependencies for 0.2. I had one problem.</p>
<h2>Drawing characters on screen</h2>
<p>At 0.1, PGWM used language bindings to the <a href=\"https://en.wikipedia.org/wiki/Xft\">XFT</a>(X FreeType interface library)
C-library, through the Rust <code>libx11</code> bindings library <a href=\"https://crates.io/crates/x11\">X11</a>. XFT handles font rendering.
It was used to draw characters on the status bar.</p>
<p>XFT provides a fairly nice interface, and comes with the added bonus
of <a href=\"https://en.wikipedia.org/wiki/Fontconfig\">Fontconfig</a> integration.
Maybe you've encountered something like this <code>JetBrainsMono Nerd Font Mono:size=12:antialias=true</code>, it's
an excerpt from my <code>~/.Xresources</code> file and configures the font for Xterm. Xterm uses fontconfig to figure out where
that font is located on my machine. Removing XFT and fontconfig with it means that fonts have to specified by path,
now this is necessary to find fonts: <code>/usr/share/fonts/JetBrains\\ Mono\\ Medium\\ Nerd\\ Font\\ Complete\\ Mono.ttf</code>, oof.
I still haven't found a non <code>C</code> replacement for finding fonts without specifying an absolute path.</p>
<p>One step in drawing a font is taking the font data and creating a vector of light intensities, this process is called
Rasterization. Rust has a font rasterization library <a href=\"https://github.com/mooman219/fontdue\">fontdue</a>
that at least at one point claimed to be the fastest font rasterizer available.
Since I needed to turn the fonts into something that could be displayed as a vector of bytes,
I integrated that into PGWM. The next part was drawing it in the correct place. But, instead of looking
at how XFT did it I went for a search around the protocol and found the <code>shm</code> (shared memory) extension (This maneuver
cost me about a week).</p>
<h3>SHM</h3>
<p>The X11 <code>shm</code> extension allows an application to share memory with X11, and request the xorg-server to draw what's in
that shared memory at some chosen location.
So I spent some time encoding what should be displayed, pixel by pixel from the background color, with the characters as
bitmaps rasterized by <code>fontdue</code> on top, into a shared memory segment, then having the xorg-server draw from that
segment.
It worked, but it took a lot of memory, increased CPU usage, and was slow.</p>
<h3>Render</h3>
<p>I finally went to look at XFT's code and found that it uses the <code>render</code> extension, an extension that can register byte
representations as glyphs, and then draw those glyphs at specified locations, by glyph-id. This is the sane way to do
it. After implementing that, font rendering was again working, and the performance was good.</p>
<h1>PGWM 0.3 how can I make this smaller and faster?</h1>
<p>I wanted PGWM to be as resource efficient as possible, I decided to dig into the library that I used do serialization
and deserialization of <code>Rust</code> structs that were to go over the socket to the xorg-server.</p>
<p>The library I was using was <a href=\"https://github.com/psychon/x11rb\">X11rb</a> an excellent safe and performant library for doing
just that.
However, I was taking optimization to a ridiculous extent, so I decided to make that library optimized for my specific
use case.</p>
<h2>PGWM runs single threaded</h2>
<p>X11rb can handle multithreading, making the execution path for single threaded applications longer than necessary.<br />
I first rewrote the connection logic from interior mutability (the connection handles synchronization) to exterior
mutability
(user handles synchronization, by for example wrapping it in an <code>Arc&lt;RwLock&lt;Connection&gt;&gt;</code>).<br />
This meant a latency
decrease of about 5%, which was pretty good. However, it did mean
that <a href=\"https://en.wikipedia.org/wiki/Resource_acquisition_is_initialization\">RAII</a>
no longer applied and the risk of memory leaks went up.
I set the WM to panic on leaks in debug and cleaned them up where I found them to handle that.</p>
<h2>Optimize generated code</h2>
<p>In X11rb, structs were serialized into owned allocated buffers of bytes, which were then sent over the socket.
This means a lot of allocations. Instead, I created a connection which holds an out-buffer, structs are always
serialized directly into it, that buffer is then flushed over the socket. Meaning no allocations are necessary during
serialization.</p>
<p>The main drawback of that method is management of that buffer. If it's growable then the largest unflushed batch
will take up memory for the user-application's runtime, or shrink-logic needs to be inserted after each flush.
If the buffer isn't growable, some messages might not fit depending on how the
buffer is proportioned. It's pretty painful in edge-cases. I chose to have a fixed-size buffer of 64kb.</p>
<p>At this point I realized that the code generation was hard to understand and needed a lot of changes to support my
needs. Additionally, making my WM <code>no_std</code> and removing all traces of <code>libc</code> was starting to look achievable.</p>
<h3>Extreme yak-shaving, generate XCB from scratch</h3>
<p>This was by far the dumbest part of the process, reworking the entire library to support <code>no_std</code> and generate the
structures and code from scratch. From probing the Wayland specification I had written a very basic <code>Rust</code> code
generation library <a href=\"https://github.com/MarcusGrass/codegen-rs\">codegen-rs</a>, I decided to use that for code generation.</p>
<p>After a few weeks I had managed to write a parser for the <code>xproto.xsd</code>, a parser for the actual protocol files, and a
code generator that I could work with.<br />
A few more weeks followed and I had finally generated a <code>no_std</code> fairly optimized library for interfacing with <code>X11</code>
over socket, mostly by looking at how x11rb does it.</p>
<h3>Extreme yak-shaving, pt 2, no libc allowed</h3>
<p>In <code>Rust</code>, <code>libc</code> is the most common way that the standard library interfaces with the OS, with some direct syscalls
where necessary.
There are many good reasons for using <code>libc</code>, even when not building cross-platform/cross-architecture libraries,
I wanted something pure <code>Rust</code>, so that went out the window.</p>
<h4>Libc</h4>
<p><code>libc</code> does a vast amount of things, on Linux there are two implementations that dominate, <code>glibc</code> and <code>musl</code>.
I won't go into the details of the differences between them, but simplified, they are C-libraries that make your C-code
run on Linux.<br />
As libraries they expose methods to interface with the OS, for example reading or writing to a file,
or connecting to a socket.<br />
Some functions are essentially just a proxies for <code>syscalls</code> but some do more things behind the scenes, like
synchronization of shared application resources such as access to the environment pointer.</p>
<h3>Removing the std-library functions and replacing them with syscalls</h3>
<p>I decided to set PGWM to <code>!#[no_std]</code> and see what compiled. Many things in <code>std::*</code> are just re-exports from <code>core::*</code>
and were easily replaced. For other things like talking to a socket I used raw syscalls through the
excellent <a href=\"https://github.com/japaric/syscall.rs\">syscall crate</a>
and some glue-code to approximate what <code>libc</code> does. It was a bit messy,
but not too much work replacing it, PGWM is now 100% not cross-platform.</p>
<h3>No allocator</h3>
<p>Since the standard library provides the allocator I had to find a new one, I decided to
use <a href=\"https://github.com/alexcrichton/dlmalloc-rs\">dlmalloc</a>,
it works <code>no_std</code>, it was a fairly simple change.</p>
<h3>Still libc</h3>
<p>I look into my crate graph and see that quite a few dependencies still pull in libc:</p>
<ol>
<li><a href=\"https://github.com/time-rs/time\">time.rs</a></li>
<li><a href=\"https://github.com/toml-rs/toml-rs\">toml.rs</a></li>
<li><a href=\"https://github.com/alexcrichton/dlmalloc-rs\">dlmalloc-rs</a></li>
<li><a href=\"https://github.com/notflan/smallmap\">smallmap</a></li>
</ol>
<p>I got to work forking these libraries and replacing libc with direct syscalls.<br />
<code>time</code> was easy, just some <code>Cargo.toml</code> magic that could easily be upstreamed.<br />
<code>toml</code> was a bit trickier, the solution was ugly and I decided not to upstream it.<br />
<code>dlmalloc-rs</code> was even harder, it used the pthread-api to make the allocator synchronize, and implementing that
was beyond even my yak-shaving. Since PGWM is single threaded anyway I left it as-is.<br />
<code>smallmap</code> fairly simple, upstreaming in progress.</p>
<h3>The ghost of libc, time for nightly</h3>
<p>With no traces of <code>libc</code> I try to compile the WM. It can't start, it doesn't know how to start.<br />
The reason is that <code>libc</code> provides the application's entrypoint <code>_start</code>, without linking <code>libc</code> <code>Rust</code> doesn't
know how to create an entrypoint.<br />
As always the amazing <a href=\"https://fasterthanli.me/series/making-our-own-executable-packer/part-12\">fasterthanli.me</a> has
a write-up about how to get around that issue. The solution required nightly and some assembly.<br />
Now the application won't compile, but for a different reason, I have no global alloc error handler.<br />
When running a <code>no_std</code> binary with an allocator, <code>Rust</code> needs to know what to do if allocation fails, but there is
at present no way to provide it with a way without another nightly feature
<a href=\"https://github.com/rust-lang/rust/pull/102318\">default_global_alloc_handler</a> which looks like it's about to be
stabilized soon (TM).<br />
Now the WM works, <code>no_std</code> no <code>libc</code>, life is good.</p>
<h2>Tiny-std</h2>
<p>I was looking at terminal emulator performance. Many new terminal emulators seem to
have <a href=\"https://www.reddit.com/r/linux/comments/jc9ipw/why_do_all_newer_terminal_emulators_have_such_bad/\">very poor input performance</a>
.
I had noticed this one of the many times PGWM crashed and sent me back to the cold hard tty, a comforting
speed. <code>alacritty</code> is noticeably sluggish at rendering keyboard input to the screen,
I went back to <code>xterm</code>, but now that PGWM worked I was toying with the idea to write a fast, small,
terminal emulator in pure rust.<br />
I wanted to share the code I used for that in PGWM with this new application, and clean it up in the process: <code>tiny-std</code>
.</p>
<p>The goal of <code>tiny-std</code> is to make a std-compatible <code>no_std</code> library with no <code>libc</code> dependencies available for use with
Linux <code>Rust</code> applications on x86_64 and aarch64, which are the platforms I'm interested in. Additionally, all
functionality
that can work without an allocator should. You shouldn't need to pull in <code>alloc</code> to read/write from a file, just
provide your own buffer.</p>
<h3>The nightmare of cross-architecture</h3>
<p>Almost immediately I realize why <code>libc</code> is so well-used. After a couple of hours of debugging a segfault, and it turning
out to be incompatible field ordering depending on architecture one tends to see the light.
Never mind the third time that happens.<br />
I'm unsure of the best way to handle this, perhaps by doing some libgen straight from the kernel source, but we'll see.</p>
<h3>Start, what's this on my stack?</h3>
<p>I wanted to be able to get arguments and preferably environment variables
into <code>tiny-std</code>. <a href=\"https://fasterthanli.me/series/making-our-own-executable-packer/part-12\">Fasterthanli.me</a>
helped with the args, but for the rest I had to go to the <a href=\"https://git.musl-libc.org/cgit/musl\">musl source</a>.<br />
When an application starts on Linux, the first 8 bytes of the stack contains <code>argc</code>, the number of input arguments.
Following that are the null-terminated strings of the arguments, then a null pointer, then comes a pointer to the
environment variables.<br />
<code>musl</code> then puts that pointer into a global mutable variable, and that's the environment.<br />
I buckle under and do the same, I see a world where arguments and environment are passed to main, and it's the
application's job, not the library, to decide to handle it in a thread-safe way.<br />
Being no better than my predecessors, I store the environment pointer in a static variable, things like spawning
processes becomes a lot more simple that way, <code>C</code> owns the world, we just live in it.</p>
<h3>VDSO (virtual dynamic shared object), what there's more on the stack?</h3>
<p>Through some coincidence when trying to make sure all the processes that I spawn don't become zombies I encounter
the <a href=\"https://en.wikipedia.org/wiki/VDSO\">VDSO</a>.<br />
<code>ldd</code> has whispered the words, but I never looked it up.</p>
<pre><code class=\"language-shell\">[gramar@grarch marcusgrass.github.io]$ ldd $(which cat)
        linux-vdso.so.1 (0x00007ffc0f59c000)
        libc.so.6 =&gt; /usr/lib/libc.so.6 (0x00007ff14e93d000)
        /lib64/ld-linux-x86-64.so.2 =&gt; /usr/lib64/ld-linux-x86-64.so.2 (0x00007ff14eb4f000)
</code></pre>
<p>It turns out to be a shared library between the Linux kernel and a running program, mapped into that program's memory.<br />
When I read that it provides faster ways to interface with the kernel I immediately stopped reading and started
implementing, I could smell the nanoseconds.</p>
<h4>Aux values</h4>
<p>To find out where the VDSO is mapped into memory for an application, the application needs to inspect the
<a href=\"https://man7.org/linux/man-pages/man3/getauxval.3.html\">AUX values</a> at runtime.
After the environment variable pointer comes another null pointer, following that are the <code>AUX</code> values.
The <code>AUX</code> values are key-value pairs of information sent to the process. To be perfectly honest I'm unsure about their
collective purpose. Among them are 16 random bytes, the <code>pid</code> of the process, the <code>gid</code>, and about two dozen more.<br />
I write some more code into the entrypoint to save these values.</p>
<h3>A memory mapped elf-file</h3>
<p>Among the aux-values is <code>AT_SYSINFO_EHDR</code>, a pointer to the start of the <code>VDSO</code> which is a full
<a href=\"https://en.wikipedia.org/wiki/Executable_and_Linkable_Format\">ELF-file</a> mapped into the process' memory.<br />
I know that in this file is a function pointer for the <code>clock_gettime</code> function through the
<a href=\"https://man7.org/linux/man-pages/man7/vdso.7.html\">Linux vDSO docs</a>. I had benchmarked <code>tiny-std</code>'s
<code>Instant::now()</code> vs the standard library's, and found it to be almost seven times slower.
I needed to find this function pointer.</p>
<p>After reading more Linux documentation, and ELF-documentation, and Linux-ELF-documentation,
I managed to write some code that parses the ELF-file to find the address of the function.
Of course that goes into another global variable, you know, <code>C</code>-world and all that.</p>
<p>I created a feature that does the VDSO parsing, and if <code>clock_gettime</code> is found, uses that instead of the syscall.
This increased the performance if <code>Instant::now()</code> from <code>~std * 7</code> to <code>&lt; std * 0.9</code>. In other words, it now outperforms
standard by taking around 12% less time to get the current time from the system.</p>
<h1>Conclusion</h1>
<p>I do a lot of strange yak-shaving, mostly for my own learning, I hope that this write-up might have given you something
too.<br />
The experience of taking PGWM to <code>no_std</code> and no <code>libc</code> has been incredibly rewarding, although I think PGWM is mostly
the same, a bit more efficient, a bit less stable.<br />
I'll keep working out the bugs and API och <code>tiny-std</code>, plans to do a minimal terminal emulator are still in the back of
my mind, we'll see if I can find the time.</p>
";

pub fn page_html() -> yew::Html {
	let div = gloo_utils::document().create_element("div").unwrap();
	div.set_inner_html(RAW_HTML);
	div.set_class_name("markdown-body");
	yew::Html::VRef(div.into())
}

