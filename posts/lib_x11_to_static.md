# Writing a WM without C.

It's that time again, time to plug my WM. 
I was finally able to rebuild it in pure safe `Rust`, as well as share useless knowledge about x11 that nobody wants to 
listen to in my real life, and maybe pick up some suggestions on the way.

About a month ago [I posted](https://old.reddit.com/r/rust/comments/u00vxm/i_wrote_an_x11_tiling_window_manager_inspired_by/) the [x11 window manager that I’ve been working on/using for a while](https://github.com/MarcusGrass/pgwm), and got some good feedback.
I didn’t address any of that, and instead went along to implement what I wanted for 0.2.0. 

Ok no that’s not it, I did implement hot reloading without a hackish ~/.xinitrc maneuver, fixed a few bugs, and updated the docs. But the big thing to me was being able to rewrite it to be purely safe `Rust`, from having to link with system libraries.

## A bit of background on X11
The X window system protocol has been at version 11 since 1987. 
It’s a server-client setup where you start the X11 server, 
which listens to a unix (or TCP for remote connections) socket and has responsibility for, 
among other things, drawing and making decisions about things on a screen.
When you write a graphical application targeting a machine using an X11 display server, 
communication about how your applications windows are displayed go through this socket. 
The X11 display server sends events to the client such as “Your window is now visible” (MapNotify), 
and a client can send an event such as “I want this window to be visible” (MapRequest). 
To make decisions about how, when, and where windows are displayed, another client called the Window Manager is required. 
On starting the x11-server, the first client connecting and sending a request to listen to certain events gets to be WM. 
It’s a race, although in practice there shouldn’t be any contention.
The WM gets notified that a MapRequest has been sent, sends its own request on socket map_window, 
X11 maps that window if the request is well-formed and makes sense, then produces the MapNotify, 
it looks something like this.  
```Client -> MapRequest -> X11 -> forward MapRequest -> WM -> max_window -> X11 maps window -> MapNotify -> (All Interested in MapNotify events).```


## X11 tooling is almost exclusively written in C
All WMs that I know of are written in `C`. This is convenient since xorg has produced c-libraries for interfacing with the socket exposing structs and functions that will send and interpret the bytes coming over the socket.

Something that really bothered me was the fact that I was unable to compile for musl, 
as well as link the binary statically without a lot of hassle.  
[I posted a thread about binary distribution](https://old.reddit.com/r/rust/comments/ubiu8o/binary_distribution_with_statically_linked/) 
and while the answers were good in a general case, for a minimal WM they were not ideal. 
However, there is another way, the protocol is language agnostic [(xcb)](https://cgit.freedesktop.org/xcb/proto/tree/doc/xml-xcb.txt) 
and any language that can send bytes on a socket could do what libX11 does.  
The Rust library [x11rb](https://github.com/psychon/x11rb) does exactly this.  

The problem with the XCB protocol is that it is extremely poorly documented, 
the protocol specification is about 20 years old and in my experience about 70% of arguments are undocumented, 
the documentation found online are just generated from that specification, 
comments and all, meaning that if you search for example `xcb_change_window_attributes` you will get hits from xorg, 
the ubuntu docs, and probably five more unique places, all with documentation that says something like `arg1 - TODO: DOCUMENT`.
To make this worse a lot of arguments are Ids.  
All ids are u32s and there are probably a 100 or so different kinds of Ids, the most commonly used are `Window` and `Pixmap`.  
Many arguments are ints describing a setting which is produced by bitmasks, these may or may not have constants documented in xcb.  
So if implementing a WM using solely the xcb protocol, your only option is inspecting the appropriate C-library, 
(like libXft) to find out what that u32 is supposed to represent. 
Another translation problem is that libX11 has a cleaner API than xcb does, 
one especially frustrating example was a function from libXrender that looks like (C) [(documentation here)](https://www.x.org/releases/X11R7.5/doc/libXrender/libXrender.txt)
```C
func(..., src_x: int, src_y: int, dest_x: int, dest_y: int, glyphs: *GlyphElt8…)
``` 
while in xcb it looks like (Rust) (didn't manage to find docs for this one at all, it's `xcb_composite_glyphs8`)
```Rust
func(&self, ..., src_x: int, src_y: int, glyph_cmds: &[u8])
``` 
what I’m supposed to do here is create to create a packed struct representation of GlyphElt8 in u8s, 
but prepend them with the i16s dest_x and dest_y encoded as ne_bytes, 
there does not exist documentation for that. 
But in general using libX11 as a guide works okay, usually the functions vs their xcb counterparts are similar enough.

Just using the libX11 equivalent functions is enough for basic WM functionality, but I want to have a status bar, 
so I need to draw fonts.

## Font's are hard it turns out

Historically, the X11 display server has rendered fonts server side, and you can still use those fonts through 
libX11 but they're deprecated and the fonts that are available are few.  
Since a while back, client side rendering of fonts has been the preferred way of doing things.  
We’re in the C-world and xorg has produced a library for exactly this purpose: [libXft](https://gitlab.freedesktop.org/xorg/lib/libxft). 
I used [dwm](https://dwm.suckless.org/) as an inspiration and just bit the bullet, pulled in [rust bindings for libX11](https://crates.io/crates/x11), 
and did essentially what dwm does to draw fonts.  
This forced me to link to system libraries because of the C-library dependency which made build complexity increase, 
and made it difficult to statically link the application.  

Last month when I had a working version to show I got some feedback, fixed it, then thought "what’s next?".  
I would like to be able to statically link the WM, so I decided to revisit fonts.

At this point I did not know that what libXft does is use fontconfig, harfbuzz, libXrender, (etc) 
to render glyphs and register them on the X11 display server for later rendering.  
All I knew is: 
1. A font could be represented as pixels.
2. I should be able to convert pixels to a pixmap and send that to X11 over the socket.

and that’s when I discovered the SHM extension.

## More X11 backstory
X11 has gotten extended functionality over the years, a lot of them, one of them is the SHM extension.  
SHM uses shared memory between a client (the WM is a client) and the xorg-server, 
that memory can be treated as a pixmap and there’s a protocol for telling X11 to draw that pixmap on screen at 
some position.  

## RIIR
I found a pure Rust [fast font rasterization library](https://github.com/mooman219/fontdue), 
that can load a font file and produce a vector of alpha values.  
So to draw fonts, I use some unsafe code the allocate shared memory through the [nix crate](https://docs.rs/nix/latest/nix/), 
then I register that memory with the xorg server, rasterize my font into a byte vector, map that into a pixel vector, 
(alhpa -> RGBA (actually BGRA, or ARGB, or something else... you find this out at runtime by querying the xorg-server).   
When I want to draw something i take the chars, copy in their pixel representation into the appropriate place of 
the shared pixmap bytebuffer, then ask X11 to draw it.  
And it worked!  

However, this means that I need to keep a lot of data in memory depending on monitor size, and manipulating 
that data array is slow, my cpu and ram usage both saw an order of magnitude increase.
After seeing the results I realized that I was going about this entirely the wrong way and decided to examine the 
libXft codebase, it’s a fairly small library, and that’s when I discovered the X11 xrender extension [(libXrender)](https://gitlab.freedesktop.org/xorg/lib/libxrender).  
Xrender exposes a wire protocol which allows you to register your rendered glyphs and you can then ask xrender to 
draw them on screen. 
I ripped out my shm implementation and replaced it with xrender, and performance improved (cpu and ram usage came out to less than before).

Since I was previously using libXft previously I had to block on some requests.
When using xcb you get a “cookie” back when you send a request on socket, 
you can block for the server to return a response from your request if you wish, or just let it be. 
If you are running single threaded you have a guaranteed message processing order, IE. 
```Rust
let encoded = self
    .loaded_render_fonts
    .encode(text, fonts, text_width - text_x);
// Send an event to fill the background without blocking
self.call_wrapper.fill_xrender_rectangle(
    dbw.window.picture,
    bg.as_render_color(),
    fill_area,
)?;
// Fill a single pixel with my desired color without blocking
self.call_wrapper.fill_xrender_rectangle(
    dbw.pixmap.picture,
    text_color.as_render_color(),
    Dimensions::new(1, 1, 0, 0),
)?;
// Ugh shifting text that needs to be drawn offset
let mut offset = fill_area.x + text_x;
let mut drawn_width = 0;
for chunk in encoded {
    drawn_width += chunk.width;
    // Centering text within the draw area
    let box_shift = (fill_area.height - chunk.font_height as i16) / 2;

    // Make another async request
    self.call_wrapper.draw_glyphs(
        offset,
        fill_area.y + text_y + box_shift,
        chunk.glyph_set,
        dbw,
        &chunk.glyph_ids,
    )?;

    offset += chunk.width as i16;
}
// Done
```

let’s say I want to draw a black background, and then draw white text on that, 
I can send both requests without having to wait for a response, 
and I know my white text won’t be overdrawn by an out of order black background draw request.  
This holds only if I have a single connection to the xorg-server, but if using libXft, 
the library requires me the draw the background, wait for a response that my request has been processed (RTT + draw time), 
then draw the text.  
Since text is drawn fairly often and the WM runs single threaded, 
this blocking wait affects latency in a way that I claim to notice.

On the way to ripping out libX11 I had to map key-constants to rust consts (X11 stores keyboard-key values as it does everything else, u32s), 
so [I created a no-dep library for just those constants](https://github.com/MarcusGrass/x11-keysyms), 
and to generate that library i created [a simple no-dep code generation library](https://github.com/MarcusGrass/codegen-rs).  
I used it to generate some bindings for the Wayland protocol, that may be what I tackle next, 
but the xorg-server gives you a lot of stuff for free when writing a WM, 
even though Wayland very similar to XCB in some ways.

That’s my journey through making my WM pure `Rust` thank you if you read this far.  
Try out the [WM](https://github.com/MarcusGrass/pgwm) if you’d like, 
and if you find some bugs or have suggestions please file an issue!

Ps. The configuration is still pretty nightmarish, maybe that should be the next thing to tackle.
