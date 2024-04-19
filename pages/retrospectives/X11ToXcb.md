# Rewrite it in Rust, a cautionary tale

RIIR (Rewrite It In Rust) is a pretty fun joke, at my current workplace my team writes 
essentially everything in Rust, for good and bad. We like to have a bit of 
fun with it, pushing the RIIR-agenda around the company.  

But, this short retrospective is about when porting something from C-bindings to Rust 
just made life harder.  

## Security advisory on Rust XCB-bindings

I've written a lot about [XCB](https://en.wikipedia.org/wiki/XCB) and 
[X11](https://en.wikipedia.org/wiki/X_Window_System) in my project write-ups
about my [x11-wm](https://github.com/MarcusGrass/pgwm), I'm not going 
to get into it here, but for these purposes `XCB` can be summarized as a 
library to handle displaying things on a desktop.  

One day when building a project, a security advisory comes up on [Rust's XCB bindings](https://github.com/rust-x-bindings/rust-xcb).

### Bindings

Generally if you want to use an existing big library, you can take the approach of reinventing the wheel, 
or creating bindings to a C-library that already exists. For example, 
Rust has a [zstd crate](https://crates.io/crates/zstd) which contains bindings 
to [libzstd](https://github.com/facebook/zstd). If you want to use that, 
you need to have `libzstd` available to the binary. Sometimes, it's built as 
part of a build-script and statically compiled into the binary, then you don't 
have to worry about it at all ([Rocksdb does this I think](https://docs.rs/rocksdb/latest/rocksdb/)). 
There's also a pure Rust implementation of [zstd decompression](https://github.com/KillingSpark/zstd-rs), 
which is the other approach, same algorithm, different implementation.  

### Why not?

There are some good reasons to RIIR, all the good things about using Rust can go here.
But, there are some very good reasons not to, apart from the effort.  
The one this retrospective is about is maturity, and the robustness that can come from it.  

### Porting x11-clipboard from C-bindings to Rust implementation

The security advisory comes up, transitively through [x11-clipboard](https://github.com/quininer/x11-clipboard), 
but the advisory is on the `XCB`-bindings.  
As I mentioned, my previous work on my WM had made me familiar with a Rust 
library that replaces the bindings: [x11rb](https://github.com/psychon/x11rb).  

To be clear, `x11rb` is a great library, and the story is not about how it contained some unexpected bug, 
it didn't, it was the act of replacement that became the issue.

[I made a PR on June16, 2022](https://github.com/quininer/x11-clipboard/pull/29) to replace usage of the bindings, to 
`x11rb` in `x11-clipboard. The PR is fairly large, but very procedural. The rust-api
is essentially the same as the C-one, it was mostly a matter of changing the types.  

## Creeping issues

`x11-clipboard` is a library that handles copying and pasting withing x11-sessions. It's used for a lot of Rust's
gui-applications, so people are likely to run into mistakes if you make them, and there were mistakes.

### Bug report through alacritty

9 months later, [alacritty gets a bug report](https://github.com/alacritty/alacritty/issues/6760), where 
when things are pasted FROM alacritty into other applications, they hang.  

The bug report is floated into [x11-clipboards issue tracker](https://github.com/quininer/x11-clipboard/issues/33) after 
a bisection shows that the problem comes from the version update caused by my change.  

Debugging it was medium-difficult, it was easy to reproduce, but difficult to understand, but in the end it was 
resolved by a [+1 -1 change](https://github.com/quininer/x11-clipboard/pull/34), 

From this:
```rust
        time: event.time,
        requestor: event.requestor,
        selection: event.selection,
        target,
        property: event.property
    }
);
```

To this:
```rust
        time: event.time,
        requestor: event.requestor,
        selection: event.selection,
        target: event.target,
        property: event.property
    }
);
```

The error was interesting, it caused some clients (a client in this context is an application like 
[Brave browser](https://brave.com/)) to hang waiting for a notification that the application never sent.  

A funny note about `X11` is that the protocol has been around for so long, and seen so much misuse, that a lot of 
clients are built to handle this kind of mistake, so the error doesn't show up on for example 
[Firefox](https://www.mozilla.org/en-US/firefox/new/).

### Bug report through pot-app

[On Jan 17, 2024 a bug report comes in from pot-app/Selection](https://github.com/pot-app/Selection/issues/3).  

[Pot App is:](https://github.com/pot-app)

> 🌈一个跨平台的划词翻译和OCR软件 | A cross-platform software for text translation and recognition.

To be fair, I think this was a pre-existing bug, but I was kind of on the hook at this point, and it was interesting.  

The clipboard library spawns a thread that listens for events, this threads holds a claim to the connection to the 
x-server, blocking waiting for a reply. Even if the handle that's given to the user is dropped that thread stays alive, keeping 
the connection alive. This means that if you're recreating the structure in a loop for example, you start leaking 
connections until the connection-pool is drained, which means that no new clients can connect. Or in other words, 
no more applications can start because you clogged up the server.

A problem here is that the thread needs to know from the structure that spawned it, that it's done and should quit. 
There are not many nice way of signalling threads like that they are blocked waiting for something.  

The thread waits like this:

```rust
while let Ok(event) = context.connection.wait_for_event() {
```

The API doesn't have other facilities for waiting other than polling in a loop, and ideally one doesn't want to 
run the thread at 100% CPU just waiting.  

However, you can get the underlying file descriptor for the connection like this:

```rust
let stream_fd = context.connection.stream().as_fd();
```

And if you have an FD, you can use Linux's APIs to check for readiness, instead of what's exposed through the 
`x11rb` API. This is only running on Linux anyway, so why not? (This is foreshadowing).  

In the end [I make a PR](https://github.com/quininer/x11-clipboard/pull/46) that uses [libc](https://github.com/rust-lang/libc), 
the [Linux Poll API](https://man7.org/linux/man-pages/man2/poll.2.html), and an, 
[eventfd](https://man7.org/linux/man-pages/man2/eventfd.2.html). 
If the struct is dropped, it'll write an event on the `eventfd`. On the other side, the thread polls for 
either a new message on the stream, or an event on the `eventfd`, if an event arrives on the stream, it'll handle that 
like before, if it arrives through the `eventfd` it just quits.  That solved the issue.  

### Bug report through the regular issue tracker

[On Feb 28, 2024 a bug report is posted on x11-clipboard](https://github.com/quininer/x11-clipboard/issues/48).  

Now, I figured `X11` was only used on Linux, Mac and Windows have their own display systems. But, I forgot about 
the BSDs, those operation systems can run `X11`, and I should have thought about that before picking the 
Linux specific `eventfd`.  

#### POSIX

[POSIX](https://en.wikipedia.org/wiki/POSIX) is an OS-compatibility standard, if you use POSIX-compliant OS-apis, 
can generally get away with using APIs that interface with the OS for Linux and they'll still work for the BSDs, 
some examples: `poll`, [read](https://man7.org/linux/man-pages/man2/read.2.html), [write](https://man7.org/linux/man-pages/man2/write.2.html), 
[pipe](https://man7.org/linux/man-pages/man2/pipe.2.html). `eventfd` is a counter-example.  

What my bugfix was trying to achieve was a drop of the struct exposed through the `x11-clipboard` API causing something 
pollable to happen in the running thread. I thought `eventfd` was a good fit, but something POSIX-compliant would be 
to create a `pipe`, two fds, a read-end and a write-end, put the write-end in the user struct, the read-end in the 
thread, and poll for a `POLLHUP` (hangup), that gets sent to one end when the other end's `FD` is closed.  

Now I could use the existing RAII-closing of the write-end on the user struct, and just listen to a hangup on the running 
thread, and it works on the BSDs!

## Conclusion

For now that's been it, I'll update this if more stuff comes in. I think that lessons learned here are that there's a 
maintenance cost to any change. While RIIR might be fun, it's good to think twice about how reasonable it is.  

Of course, there may be lurking bugs in the C-implementation that isn't seen because of selection bias, but I don't have 
any basis for that.  

Last of all, I'm sorry for the hassle [quininer](https://github.com/quininer), I know you don't want to maintain this 
project anymore, and I made your life a bit more difficult.  
