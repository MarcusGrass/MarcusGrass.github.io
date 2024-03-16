# Symmetric multiprocessing in your keyboard

While my daughter sleeps during my parental leave I manage to get up to 
more than I thought I would, this time, a deep-dive into [QMK](https://docs.qmk.fm/#/).

## QMK and custom keyboards

`QMK` contains open source firmware for keyboards, it provides implementations for most custom keyboard functionality, 
like kepyresses (that one's obvious), rotary encoders, and oled screens.  

It can be thought of as an OS for your keyboard, which can be configured by plain `json`, 
with [online tools](https://config.qmk.fm/#/xelus/kangaroo/rev1/LAYOUT_ansi_split_bs_rshift), and other 
simple tools that you don't need to be able to program to use.

But, you can also get right into it if you want, which is where it gets interesting.

## Qmk structure

Saying that `QMK` is like an OS for your keyboard might drive some pedantics mad, since `QMK` packages 
an OS and installs it configured on your keyboard, with your additions.

Most features are toggled by defining constants in different `make` or header files, like:

```C
#pragma once

// Millis
#define OLED_UPDATE_INTERVAL 50
#define OLED_SCROLL_TIMEOUT 0

#define ENCODER_RESOLUTION 2

// Need to propagate oled data to right side
#define SPLIT_TRANSACTION_IDS_USER OLED_DATA_SYNC
```

It also exposes some API's which provide curated functionality,
here's an example from the [oled driver](https://github.com/qmk/qmk_firmware/blob/master/drivers/oled/oled_driver.h):
```C
// Writes a string to the buffer at current cursor position
// Advances the cursor while writing, inverts the pixels if true
void oled_write(const char *data, bool invert);
```
Above is an API that allows you to write text to an `oled` screen, very convenient.

Crucially, `QMK` does actually ship an OS, in my case [chibios](https://chibiforge.org/doc/21.11/full_rm/), 
which is a full-featured [RTOS](https://en.wikipedia.org/wiki/Real-time_operating_system). That OS contains 
the drivers for my microcontrollers, and from my custom code, I can interface with 
the operating system.

## Keyboards keyboards keyboards

I have been building keyboards since I started working as a programmer,
there is much that can be said about them, but not a lot of is particularly interesting, I'll give a brief 
explanation of how they work.

### Keyboard internals

A keyboard is like a tiny computer that tells the OS (The other one, the one not in the keyboard) 
what keys are being pressed.

Here are three arbitrarily chosen important components to a keyboard:

1. The [Printed Circuit Board (PCB)](https://en.wikipedia.org/wiki/Printed_circuit_board), it's a large 
chip that connects all the keyboard components, if you're thinking: "Hey that's a motherboard!", then you 
aren't far off. Split keyboards (usually) have two PCBs working in tandem, connected by (usually) an aux cable.  
2. The microcontroller, the actual computer part that you program. It can be integrated directly with the PCB,
or soldered on to it.
3. [The switches](https://en.wikipedia.org/wiki/Keyboard_technology#Notable_switch_mechanisms), 
the things that when pressed connects circuits on the PCB, which the microcontroller can see 
and interpret as a key being pressed.

## Back to the story

I used an [Iris](https://keeb.io/collections/iris-split-ergonomic-keyboard) for years and loved it, but since some pretty impressive microcontrollers that aren't [AVR](https://en.wikipedia.org/wiki/AVR_microcontrollers), 
but [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) came out, surpassing the AVR ones in cost-efficiency, memory, and speed, while being compatible, 
I felt I needed an upgrade.

A colleague tipped me off about [lily58](https://splitkb.com/products/aurora-lily58), which takes any[pro-micro](https://github.com/sparkfun/Pro_Micro)-compatible microcontroller, 
so I bought it. Alongside a couple of [RP2040](https://www.raspberrypi.com/documentation/microcontrollers/rp2040.html)-based microcontrollers.

### RP2040 and custom microcontrollers

Another slight derailment, the RP2040 microcontroller is a microcontroller with an 
[Arm-cortex-m0+ cpu](https://developer.arm.com/Processors/Cortex-M0-Plus). Keyboard-makers take this kind 
of microcontroller, and customize them to fit keyboards, since pro-micro microcontrollers have influenced a lot 
of the keyboard PCBs, many new microcontroller designs fit onto a PCB the same way that a pro-micro does. Meaning, 
often times you can use many combinations of microcontrollers, with many combinations of PCBs.

The arm-cortex-m0+ cpu is pretty fast, cheap, and has two cores, TWO CORES, why would someone even need that? 
If there are two cores on there, then they should both definitely be used, however.

## Back to the story, pt2

I was finishing up my keyboard and realized that `oled`-rendering is by default set to 50ms, to not impact 
matrix scan rate. (The matrix scan rate is when the microcontroller checks the PCB for what keys are being held down, 
if it takes too long it may impact the core functionality of key-pressing and releasing being registered correctly).

Now I found the purpose of multicore, if rendering to the oled takes time, 
then that job could (and therefore should) be shoveled onto a 
different thread, my keyboard has 2 cores, I should parallelize this by using a thread! 

## Chibios and threading

Chibios is very well documented, it even 
[has a section on threading](https://chibiforge.org/doc/21.11/full_rm/group__threads.html), and it even has a 
convenience function for 
[spawning a static thread](https://chibiforge.org/doc/21.11/full_rm/group__threads.html#gabf1ded9244472b99cef4dfa54caecec4).  

It can be used like this:

```C
static THD_WORKING_AREA(my_thread_area, 512);
static THD_FUNCTION(my_thread_fn, arg) {
    // Cool function body
}
void start_worker(void) {
    thread_t *thread_ptr = chThdCreateStatic(my_thread_area, 512, NORMALPRIO, my_thread_fn, NULL);
}
```

Since my CPU has two cores, if I spawn a thread, work will be parallelized, I thought, so I went for it. (This is 
foreshadowing).  

After wrangling some [mutex locks](https://chibiforge.org/doc/21.11/full_rm/group__mutexes.html), and messing 
with the firmware to remove race conditions, I had a multithreaded implementation that could offload rendering 
to the `oled` display on a separate thread, great! Now why is performance so bad?

## Multithread != Multicore, an RTOS is not the same as a desktop OS

When I printed the core-id of the thread rendering to the `oled`-display, it was `0`. I wasn't 
actually using the extra core which would have core-id `1`.

The assumption that: If I have two cores and I have two threads, the two threads should be running 
or at least be available to accept tasks almost 100% of the time, does not hold here. 
It would hold up better on a regular OS like `Linux`, but on `Chibios` it's a bit more explicit.

**Note:**
Disregarding that `Chibios` spawns both a main-thread, and an idle-thread (on the same core) by default, so it's not just one, 
although that's not particularly important to performance.

### On concurrency vs parallelism

Threading without multiprocessing can produce concurrency, like in [Python](https://www.python.org/) with 
the [GIL](https://wiki.python.org/moin/GlobalInterpreterLock) enabled, 
a programmer can run multiple tasks at the same time and if those tasks don't 
require CPU-time, such as waiting for some io, the tasks can make progress at the same time which 
is why Python with the GIL can still run webservers pretty well. However, tasks that require CPU-time to make 
progress will not benefit from having more threads.  

One more caveat are blocking tasks that do not park the thread, this will come down to how to the OS decides to schedule 
things: In a single-core scenario, the main thread offloads some io-work to a separate thread, 
the OS schedules (simplified) 1 millisecond to the io-thread, but that thread is stuck waiting for io to complete, 
then the application will make no progress. One way to mitigate this is to park the waiting thread inside your 
io-api, then waking it up on some condition, in that case the blocking io won't hang the application.

In my case, SMP not being enabled meant that the oled-drawer-thread just got starved of CPU-time resulting in 
drawing to the oled being painfully slow, but even if it hadn't been, there would have been a performance hit because 
it would have interfered with the regular key-processing.

### Parallelism

I know I have two cores, I'll just have to enable [SMP](https://en.wikipedia.org/wiki/Symmetric_multiprocessing). Symmetric multiprocessing means that the processor can actually
do things in parallel. it's not enabled by default. Chibios has some [documentation on this](https://www.chibios.org/dokuwiki/doku.php?id=chibios:articles:smp_rt7).  

But this time, it wasn't enough. Enabling SMP, is not trivial as it turns out, it needs a config flag for chibios,
a makeflag when building for the platform (rp2040), and some other fixing. 
So I had to mess with the firmware once more, 
but checking some flags in the code, and some internal structures, I can see that `Chibios` is now compiled 
ready to use SMP, it even has a reference that I can use to my other core's context `&ch1` (`&ch0` is core 0).

On `Linux` multicore and multithreading is opaque, you spawn a thread, it runs on some core (also assuming that 
SMP is enabled, but it generally is for servers and desktops). On Chibios, if you
spawn a thread, it runs on the core that spawned it by default.  
Back to the docs, I see that I can instead create a thread from a [thread descriptor](https://chibiforge.org/doc/21.11/full_rm/group__threads.html#gad51eb52a2e308ba1cb6e5cd8a337817e), 
which takes a reference to the instance-context, `&ch1`, perfect, now I'll spawn a thread on the other core, happily ever 
after.  

**WRONG!**  

It still draws from core-0 on the oled.
 
Checking the chibios source code, I see that it falls back to `&ch0` if `&ch1` is null, now why is it null?

### Main 2, a single main function is for suckers

Browsing through the chibios repo I find [the next piece of the puzzle](https://github.com/ChibiOS/ChibiOS/blob/master/demos/RP/RT-RP2040-PICO/c1_main.c), 
a demo someone made of SMP on the RP2040, it needs a separate main function where the instance context (`&ch1`)
for the new core is initialized. I write some shim-code, struggle with some more configuration, and finally, 
core 1 is doing the `oled` work.  

Performance is magical, it's all worth in it the end.  

## Conclusion

My keyboard now runs multicore and I've offloaded all non-trivial 
work to core 1 so that core 0 can do the time-sensitive matrix scanning, 
and I can draw as much and often as I want to the oled display.  

I had to mess a bit with the firmware to specify that there is an extra 
core on the RP2040, and to keep `QMK`s hands off of oled state, since 
that code isn't thread-safe.  

The code is in my fork [here](https://github.com/MarcusGrass/qmk_firmware/tree/mg/lily58), 
with commits labeled `[FIRMWARE]` being the ones messing with the firmware.

The keyboard-specific code is contained
[here](https://github.com/MarcusGrass/qmk_firmware/tree/mg/lily58/keyboards/splitkb/aurora/lily58/keymaps/gramar), 
on the same branch.

I hope this was interesting to someone!
