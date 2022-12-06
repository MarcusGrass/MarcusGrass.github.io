It's been quite some time since I last published an update to `pgwm`
and [posted this](https://old.reddit.com/r/rust/comments/u00vxm/i_wrote_an_x11_tiling_window_manager_inspired_by/).  
I've been pretty busy but I've changed a lot about it since then, it's been a learning experience with an insane amount
of yak shaving.

# Some highlights:

- Rewrote the `xcb` interfacing library (really stupid, took an insane amount of time)
- Wrote a tiny std-lib for Linux (essentially only `x86_64`, working with getting everything to work for `aarch64`)
- Migrated the wm to be `no_std` with no libc.

# Why

I was thinking about specializing [x11rb](https://github.com/psychon/x11rb) which is a great library for interfacing
with X11,
to my specific single threaded use case.

At some point I realized that I could try to make the WM entirely `no_std` and then, entirely without libc which was a
really fun challenge.

# Tiny-std

There are a lot of cool things to find when digging into the Linux APIs and `glibc` and `musl` source. I learned a lot
in the process and wrote about
that at some length [here](https://marcusgrass.github.io/pgwm03).   
All in all the binary becomes a lot smaller, most things are same-y in speed, but I did, after finding out how to parse
the vDSO
at runtime, manage to beat the standard library's `Instant::now()` by getting the current time in a bit less than 12% of
the time, seeing that was really cool.

If you want to check out the WM, that can be found [here](https://github.com/MarcusGrass/pgwm).  
If you want to check out tiny-std, which you should by no means use because it's not at all safe,
that's [here](https://github.com/MarcusGrass/tiny-std/).  
As previously mentioned, there's a write-up on all of that [here](https://marcusgrass.github.io/pgwm03).

# Up next

Thinking about some minimal terminal emulator using tiny-std, if I get the time.