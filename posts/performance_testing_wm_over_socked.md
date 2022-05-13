# Running a performance test on an x11 WM
The first rule of performance is testing. I had some theories about how to improve the performance 
of parts of a library that I was using, but the only way to actually know if the theories were accurate was to test.

I believe the second rule, or extension to the first is to test in a situation as similar to production use as possible.  
The challenge was to create such a situation.

# Brief background on X11
I went through basics of X11 [in my other write-up](lib_x11_to_static.md), but in short:  
X11 consists of a server (xorg-server) and clients, the WM is one of the clients responsible for the placement of other client's windows, 
and some other things.  
Communication with the xorg-server goes (usually) over a unix-socket at (ususally) `/tmp/.X11-unix/X0`.
The communication is asynchronous over the socket and are labeled events.  
As in event-sourcing.  

# Event sourcing
The main dependency of the WM is the [rust-implementation of the XCB protocol](https://github.com/psychon/x11rb) and it takes care of listening for, 
sending, and parsing events coming over the socket (and some more stuff).  
Conveniently, as an example the team built an example application that proxies traffic between some client 
and the xorg-server.
I write some code to take all the transferred data and group it into `Client` and `Server` messages and just dump that raw data with 
some delimiters into a file. Now I have the events.

The point of EventSourcing is to reach a desired state by playing events back.  
The application itself is stateful, an incoming `MapRequest` will trigger a different response depending on
the preceding events, but the same event order should always produce the same results.

I write a simple runner that reads and parses all the interesting events

