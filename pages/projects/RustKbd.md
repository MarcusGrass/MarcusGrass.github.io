# Building keyboard firmware in Rust, an embedded journey

[Last time](/kbd-smp), I wrote about enabling Symmetric Multiprocessing on a keyboard using 
[QMK](https://qmk.fm/) (and [Chibios](https://www.chibios.org/dokuwiki/doku.php)).  
This was discovered to be a bad idea, as I was told by a maintainer, or at least the way I was doing it, QMK 
is not made for multithreading (yet).

My daughter sleeps a lot during the days, so I decided to step up the level of ambition a bit: 
Can keyboard firmware be reasonably written from "scratch" using Rust, I asked myself, and found out that it can.

## Overview

This writeup is about how I wrote multicore firmware using Rust for a [lily58 PCB](https://splitkb.com/products/aurora-lily58?variant=43553010090243), 
and a [Liatris](https://splitkb.com/products/liatris?_pos=1&_sid=9363d742f&_ss=r) ([rp2040-based](https://www.raspberrypi.com/products/rp2040/))
microcontroller. The code for it is [here](https://github.com/MarcusGrass/rp2040-kbd).  

1. Callback to the last writeup
2. Embedded on Rust
3. Development process (Serial interfaces)
4. Figuring out the MCU<->PCB interplay using QMK
5. Split keyboard communication woes
6. Keymaps
7. USB HID Protocol
8. OLED displays
9. BUUUUGS
10. Performance
11. Epilogue

## On the last episode of 'Man wastes time reinventing wheel'

Last time I did a pretty thorough dive into QMK, explaining keyboard basics, and most of the jargon used.  
I'm not going to be as thorough this time, but briefly:

### Enthusiast keyboards

There are communities building enthusiast keyboards, often soldering components together themselves, and tailoring their 
own firmware to fit their needs (or wants). 

Generally, a keyboard consists of the PCB, microcontroller (sometimes integrated with the PCB), switches that go on the PCB, 
and keycaps that go on the switches. Split keyboards are also fairly popular, those keyboards generally have two separate PCBs 
that are connected to each other by wire, I've been using the split keyboard
[iris](https://keeb.io/collections/iris-split-ergonomic-keyboard) for a long time. 
There are also peripherals, such as [rotary encoders](https://keeb.io/products/rotary-encoder-ec11?_pos=1&_sid=0becfc852&_ss=r), 
[oled](https://en.wikipedia.org/wiki/OLED) displays, sound emitters, RGB lights and many more that can be integrated 
with the keyboard. Pretty much any peripheral that the microcontroller can interface with is a possible add-on to 
a user's keyboard.


#### QMK

To get the firmware together, an open source firmware repo called QMK can be used. There are a few others but to my 
knowledge QMK is the most popular and mature alternative. You can make a keymap without writing any code at all, 
but if you want to interface with peripherals, or execute advanced logic, some C-code will be necessary.  


### Back to last time

I bought a microcontroller which has dual cores, and I wanted to use them to offload oled-drawing to the core that 
doesn't handle latency-sensitive activities, and did a deep dive into enabling that for my setup. 
While it worked it was not thread-safe and generally discouraged by the maintainers.

That's when I decided to write my own firmware in Rust.

## Embedded on Rust

I hadn't written code for embedded targets before my last foray into keyboard firmware, I had some tangential experience 
with the [heapless](https://github.com/rust-embedded/heapless) library which exposes stack-allocated collections.
These can be useful for performance in some cases, but very useful if you haven't got a heap at all, like you 
often will not have on embedded devices.  

I searched for rp2040 Rust and found [rp-hal](https://github.com/rp-rs/rp-hal), hal stands for Hardware 
Abstraction Layer, and the crate exposes high-level code to interface with low-level processor and peripheral functionality.  

For example, spawning a task on the second core, resetting to bootloader, reading [GPIO](https://en.wikipedia.org/wiki/General-purpose_input/output)
pins, and more. This was a good starting point, when I found this project I had already soldered together 
the keyboard and was ready to write firmware for it. 

### CPU and board

rp-hal provides access to the basic CPU-functionality, but that CPU is mounted on a board in itself, which has 
peripherals, in this case it's the [Liatris](https://splitkb.com/products/liatris), the mapping of the outputs 
of the board to code is called a Board support package (BSP), and can be put in the 
[rp-hal-boards](https://github.com/rp-rs/rp-hal-boards) repo so that they can be shared. 
I haven't made a PR for [my fork yet](https://github.com/marcusgrass/rp-hal-boards), 
I'm planning to do it when I've worked out all remaining bugs in my code, but it's very much based on the
[rp-pico BSP](https://github.com/rp-rs/rp-hal-boards/tree/main/boards/rp-pico).  

## Starting development

Now I wanted to get any firmware running just to see that it's working.

### USB serial

The Liatris MCU has an integrated USB-port, I figured that the easiest way to see if the firmware boots and works 
at all was to implement some basic communication over that port, until I can get some information out of the MCU 
I'm flying completely blind.  

The [rp-pico BSP examples](https://github.com/rp-rs/rp-hal-boards/blob/main/boards/rp-pico/examples/pico_usb_serial.rs) 
were excellent, using them I could set up a serial interface which just echoed back what was written to it to the OS.

Hooking the serial interface up to the OS was another matter though. I compiled the firmware and 
flashed it to the keyboard by holding down the onboard boot-button and pressing reset, then went to 
figure out the OS parts.  

#### USB CDC ACM

After some searching I realize that I need some drivers to connect to the serial device: 
USB CDC ACM, USB and two meaningless letter combinations. Together they stand for 

> Universal Serial Bus Communication Device Class Abstract Control Model

When the correct drivers are installed, and the keyboard plugged in, [dmesg](https://man7.org/linux/man-pages/man1/dmesg.1.html) 
tells me that there's a new device under `/dev/ttyACM0`. 

```bash
echo "Hello!" >> /dev/ttyACM0
```

No response.

I do some more searching and find out that two-way communication with serial devices over the CDC-ACM-driver 
isn't as easy as echoing and `cat`ing a file. [minicom](https://linux.die.net/man/1/minicom) is a program 
that can interface with this kind of device, but the UX was obtuse, looking for alternatives I found 
[picocom](https://linux.die.net/man/8/picocom) which serves the same purpose but is slightly nicer to use:

```bash
[root@grentoo /home/gramar]# picocom -b 115200 -l /dev/ttyACM0
picocom v3.1

port is        : /dev/ttyACM0
flowcontrol    : none
baudrate is    : 115200
parity is      : none
databits are   : 8
stopbits are   : 1
escape is      : C-a
local echo is  : no
noinit is      : no
noreset is     : no
hangup is      : no
nolock is      : yes
send_cmd is    : sz -vv
receive_cmd is : rz -vv -E
imap is        : 
omap is        : 
emap is        : crcrlf,delbs,
logfile is     : none
initstring     : none
exit_after is  : not set
exit is        : no

Type [C-a] [C-h] to see available commands
Terminal ready
```

There's a connection! Enabling echo and writing `hello` gives the output `hHeElLlLoO`, the Liatris responding 
with a capitalized echo. 

#### Making DevEx nicer

I write some code that checks the last entered characters and executes commands depending on what they are.
First off, making a reboot easier:

```rust
if last_chars.ends_with(b"boot") {
    reset_to_usb_boot(0, 0);
}
```

Great, now I can connect to the device and type boot, and it'll boot into flash-mode so that I can load new firmware 
onto it, this made iterating much faster. Since everything was soldered and mounted, I had to use a (wooden) skewer 
to reach under the oled and press the boot button on the microcontroller before this. I recommend not soldering on 
components blocking access to the boot-button if doing this kind of programming.  

## Developing actual keyboard functionality

There are [schematics for the pcb](https://docs.splitkb.com/hc/en-us/articles/6942088875292-Aurora-Lily58-schematics) 
online, as well as a [schematic of the pinout of the elite-c MCU](https://docs.splitkb.com/hc/en-us/articles/6485704310044-Elite-Pi-Technical-data), 
which the developers told me were the same as for the Liatris, this seems to be true.  

Rows and columns are connected to GPIO-pins in the MCU, switches connect rows and columns, if switches are pressed a current can flow between them. 
My first thought was that if a switch that sits between `row0` and `col0` is pressed, the pin for `row0` and `col0` would read 
`high` (or `low`), that's not the case.

### PullUp and PullDown resistors

Here is where my complete ignorance of embedded comes to haunt me, GPIO pins can be configured to be either PullUp or 
PullDown, what that meant was beyond me, it still is to a large extent. The crux of it is that either 
there's a resistor connected to power or ground, up or down respectively. 

That made some sense to me, I figure either the rows or columns should be PullUp while the other is PullDown. 
This did not produce any reasonable results either. 
At this point, I had written some debug-code which scanned all GPIO-pins and printed if their state changed, and 
I was mashing keyboard buttons with strange output as a result.  

I was getting frustrated with non-progress and decided to look into QMK, there's a lot of `__weak__`-linkage, 
the [abstract class of C](https://en.wikipedia.org/wiki/Weak_symbol), so actually following the code in QMK 
can be difficult, which is why I hadn't browsed it in more depth earlier.  

But I did find the problem. All pins, rows and columns, should be pulled `high` (PullUp), 
then the column that should be checked is set `low`, and then all rows are checked, if any row goes `low` then the switch 
connecting the checked column and that row is being pressed. In other words:

Set `col0` to `low`, if `row0` is still `high`, switch `0, 0` top-left for example, is not pressed.
If `row1` is now `low`, it means that switch `1, 0`, first key on the second row, is being pressed.  

Now I can detect which keys are being pressed, useful functionality for a keyboard.  

### Split keyboards

Looking back at the [schematic](https://docs.splitkb.com/hc/en-us/article_attachments/8356613654940) I see that there's a pin
labeled side-indicator, that either goes to ground or voltage. After a brief check it reads, as expected, `high` on the left
side, and `low` on the right side.

Now that I can detect which keys are being pressed, by coordinates, and which side is being run,
it's time to transmit key-presses from the right-side to the left. 

The reason to do it that way is that the left is the side that I'm planning on connecting to the computer with a 
usb-cable. Now, I could have written to code to be side-agnostic, checking whether a USB-cable is connected and choosing 
whether to send key-presses over the wire connecting the sides, or the USB-cable. However, that approach both increases 
complexity and binary size, so I opted not to.  

#### Stupid note

I could also have made each side a separate independent keyboard, which would have been pretty fun, but problematic 
for a lot of reasons, like using left shift pressing a right-key, I'd have to have software on the computer to patch them 
together.

#### Bits over serial

Looking at the schematics again, I see that one pin is labeled `DATA`, that pin is the one connected to the 
pad that the [TRRS cable](https://splitkb.com/products/coiled-angled-trrs-cable) connects the sides with.  
However, there is only one pin on each side, which means that all communication is limited to setting/reading 
`high`/`low` on a single pin. Transfer is therefore limited to one bit at a time.

Looking over the default configuration for my keyboard in QMK the [BitBang](https://github.com/qmk/qmk_firmware/blob/master/docs/serial_driver.md) 
driver is used since nothing else is specified, there are also USART, single- and full-duplex available.  

#### UART/USART

[UART](https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter) stands for Universal Asynchronous 
Receiver-Transmitter, and is a protocol (although the wiki says a peripheral device, terminology unclear) 
to send bits over a wire.  

There is a UART-implementation for the rp2040, in the [rp-hal-crate](https://github.com/rp-rs/rp-hal), but it 
assumes usage of the builtin uart-peripheral, that uses both an RX and TX-pin in a pre-defined set position, in my case 
I want to either have half-duplex communication (one side communicates at a time), or simplex communication from right
to left. That means that the `DATA`-pin on the left side should be UART-RX (receiver) while the `DATA`-pin on 
the right is UART-TX (transmitter).  

I search further for single-pin UART and find out about [PIO](https://tutoduino.fr/en/pio-rp2040-en/).

#### PIO

The rp2040 has blocks with state-machines which can run like a separate processor manipulating and reading 
pin-states, these can be programmed with specific assembly, and there just happens to be someone 
who programmed a uart-implementation in that assembly [here](https://github.com/raspberrypi/pico-examples/blob/master/pio/uart_rx/uart_rx.pio).  

It also turns out that someone ported that implementation to a Rust library [here](https://github.com/Sympatron/pio-uart).  

I hooked up the RX-part to the left side, and the TX to the right, and it worked!

*Note* 

You could probably make a single-pin half-duplex uart implementation by modifying the above pio-asm by not that much.
You'd just have to figure out how to wait on either data in the input register from the user program, or communication 
starting from the other side. There's a race-condition there though, maybe I'll get to that later.

#### Byte-protocol

Since I'm using hardware to send data bit-by-bit I made a slimmed-down protocol. The right side has 28 buttons and a
rotary-encoder. A delta can be fit into a single byte. 

Visualizing the keyboard's keys as a matrix with `5` rows, and `6` columns there's at most 30 keys. 
The keys can be translated into a matrix-index where `0,0` => `0`, `1,0` -> `6`, `2, 3` -> `15`, by rolling out 
the `2d`-array into a `1d` one.

In the protocol, the first 5 bits gives the matrix-index of the key that changed. The 6th bit is whether 
that key was pressed or released, the 7th bit indicates whether the rotary-encoder has a change, and the 8th 
bit indicates whether that change was clock- or counter-clockwise.  

For better or worse, almost all bit-patterns are valid, some may represent keys that do not exist, since there are 
28 keys, but 32 slots for the 5 bits indicating the matrix-index.  

I used the [bitvec](https://docs.rs/bitvec/latest/bitvec/) crate for bit-manipulation when prototyping, 
that library is excellent.  
I warmly recommend it, even though I went with a more custom solution for performance reasons (I made some 
specific optimizations to my use-case, see 'Performance').  

## Keymap

Now, to send key-presses to the OS, [of course there's a crate for that](https://docs.rs/usbd-hid/latest/usbd_hid/).

It helps with the plumbing and exposes the struct that I've got to send to the OS (and the API to do the sending), 
I just have to fill it with reasonable values: 

```rust
/// Struct that the OS wants
pub struct KeyboardReport {
    pub modifier: u8,
    pub reserved: u8,
    pub leds: u8,
    pub keycodes: [u8; 6],
}
```

I found [this pdf from usb.org](https://usb.org/sites/default/files/hut1_3_0.pdf), which specifies keycode and modifier 
values. I encoded those [as a struct](https://github.com/MarcusGrass/rp2040-kbd/blob/main/rp2040-kbd/src/hid/keycodes.rs#L3).

```rust
#[repr(transparent)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct KeyCode(pub u8);

#[allow(dead_code)]
impl KeyCode {
    //Keyboard = 0x01; //ErrorRollOver1 Sel N/A 3 3 3 4/101/104
    //Keyboard = 0x02; //POSTFail1 Sel N/A 3 3 3 4/101/104
    //Keyboard = 0x03; //ErrorUndefined1 Sel N/A 3 3 3 4/101/104
    pub const A: Self = Self(0x04); //a and A2 Sel 31 3 3 3 4/101/104
    pub const B: Self = Self(0x05); //b and B Sel 50 3 3 3 4/101/104
    // ... etc etc etc
```

Now I know which button is pressed by coordinates, and how to translate those to values that the OS can understand.  

And it works! Kind of...

### USB HID Protocol?

I will admit that I did not read the entire PDF, what I did find out was that there's a poll-rate that the OS specifies, 
I set that at the lowest possible value, 1ms. Each 1 ms the OS triggers an interrupt:

```rust
/// Interrupt handler
/// Safety: Called from the same core that publishes
#[interrupt]
#[allow(non_snake_case)]
#[cfg(feature = "hiddev")]
unsafe fn USBCTRL_IRQ() {
    crate::runtime::shared::usb::hiddev_interrupt_poll();
}
```

#### Oh right, interrupts

[Interrupts](https://en.wikipedia.org/wiki/Interrupt) are ways for the processor to interrupt current executing code 
and executing something else, interrupt handlers are similar to [Linux signal handlers](https://man7.org/linux/man-pages/man7/signal.7.html).

In this specific case, the USB-peripheral generates an interrupt when polled, the core that registered an interrupt 
handler for that specific interrupt (`USBCTRL_IRQ`) will pause current execution and run the code contained in 
the interrupt-handler.  

This has potential of triggering UB with unsafe code (depending on where the core was stopped, it may have been holding 
a mutable reference which the interrupt handler needs), and deadlocks with code that guards against multiple mutable 
references through locking.  

One way to handle this, if using mutable statics (which you almost certainly have to without an allocator), 
is to execute sensitive code within a `critical_section`, of course, 
[there's a library for that](https://docs.rs/critical-section/latest/critical_section/).  
The critical-section, when entered, causes the core to ignore interrupts until exited.

```Rust
// Both of these functions use the same static mut variable

#[cfg(feature = "hiddev")]
pub unsafe fn try_push_report(keyboard_report: &usbd_hid::descriptor::KeyboardReport) -> bool {
    // This core won't be interrupted while handling the mutable reference.
    // A regular lock without a critical section here would cause a deadlock in the below interrupt handling procedure 
    // if timing is unfortunate.
    critical_section::with(|_cs| {
        USB_HIDDEV
            .as_mut()
            .is_some_and(|hid| hid.try_submit_report(keyboard_report))
    })
}

#[cfg(feature = "hiddev")]
pub unsafe fn hiddev_interrupt_poll() {
    // This core won't be interrupted, because there's only one interrupt registered, so there's nothing to interrupt this.
    // Since it's already interrupted the core that handles the other mutable reference to this variable 
    // we can be certain that this is the only mutable reference active without a critical section or other lock.
    if let Some(hid) = USB_HIDDEV.as_mut() {
        hid.poll();
    }
}
```

### USB HID protocol

Back to the protocol, the API has two ends, one for polling the OS, one for submitting HID-reports.  
It turns out that even if you don't expect any data from the OS the device needs to be polled to communicate.  

In my first shot I just pushed keyboard reports on every diff and polling immediately after. This caused 
key-actions to disappear, they didn't reach the OS. 

I still haven't quite figured out why since I'm not overflowing the buffer, digging into the code didn't help me 
understand much either, but it was pretty opaque.  

I settled for pushing at most one keyboard report per poll, that means at most one per ms. 
This means a worst case latency of 1ms on a key-action assuming there's no queue-backup, I keep eventual unpublishable 
reports in a queue that's drained 1 entry per poll. Again, there may be something written in the specifications 
about this, but it's good enough for now.

## Oled displays

One of the motivators for using multiple cores were the ability to render to oled on-demand with low latency.  

Drawing to an oled display is comparatively slow, so offloading that to a separate core was something that I was interested 
in doing.  

I created a shared message queue guarded by a spin-lock:

```rust
#[derive(Debug, Copy, Clone)]
pub enum KeycoreToAdminMessage {
    // Notify on any user action
    Touch,
    // Send loop count to calculate scan latency
    Loop(LoopCount),
    // Output which layer is active
    LayerChange(KeymapLayer),
    // Output bytes received over UART
    Rx(u16),
    // Write a boot message then trigger usb-boot
    Reboot,
}
```

When displayed it looks like this:

![oleds](/static/rust-kbd-oled.jpg)

Setting it up was pretty trivial, there's a library for [SSD1306 oleds](https://docs.rs/ssd1306/latest/ssd1306/) 
which works great!

Now I have a keyboard that can submit key-presses to the OS, and display some debug information on its oleds, 
time to get into the bugs.  

## BUUUUUUUGS

Almost immediately when trying to type I discovered that keys would be repeated, pressing t would result in 
19 t's for example.

### Spooky electrons, debounce!

I looked into QMK once more, since my keyboard with QMK firmware doesn't have issues (IE not a hardware problem).  
All excepts of C below are from [QMK](https://github.com/qmk/qmk_firmware), [license here](https://github.com/qmk/qmk_firmware/blob/master/license_GPLv3.md).  

Here's the function that reads pins: 

```c
/// quantum/matrix.c
__attribute__((weak)) void matrix_read_rows_on_col(matrix_row_t current_matrix[], uint8_t current_col, matrix_row_t row_shifter) {
    bool key_pressed = false;

    // Select col
    if (!select_col(current_col)) { // select col
        return;                     // skip NO_PIN col
    }
    matrix_output_select_delay();

    // For each row...
    for (uint8_t row_index = 0; row_index < ROWS_PER_HAND; row_index++) {
        // Check row pin state
        if (readMatrixPin(row_pins[row_index]) == 0) {
            // Pin LO, set col bit
            current_matrix[row_index] |= row_shifter;
            key_pressed = true;
        } else {
            // Pin HI, clear col bit
            current_matrix[row_index] &= ~row_shifter;
        }
    }

    // Unselect col
    unselect_col(current_col);
    matrix_output_unselect_delay(current_col, key_pressed); // wait for all Row signals to go HIGH
}
```

I had looked at it previously, but disregarded those delays (`matrix_output_select_delay()` and 
`matrix_output_unselect_delay(current_col, key_pressed); // wait for all Row signals to go HIGH`), because 
we're trying to be speedy here. `Thread.sleep()` isn't speedy, everyone knows that.  

However, it turns out that they are important. Again I have to follow weak functions, a nightmare: 

```c
/// quantum/matrix_common.c
__attribute__((weak)) void matrix_output_select_delay(void) {
    waitInputPinDelay();
}

// Found implementation in -> 

/// platform/chibios/_wait.h
#ifndef GPIO_INPUT_PIN_DELAY
#    define GPIO_INPUT_PIN_DELAY (CPU_CLOCK / 1000000L / 4)
#endif

#define waitInputPinDelay() wait_cpuclock(GPIO_INPUT_PIN_DELAY)

```

I get no editor support in this project, so I have to grep through countless board implementations until I found 
the correct one, which isn't exactly easy to tell. But, after setting the `col`-pin to `low`, there's a `250ns` wait.

I implement it, and it changes nothing. On to the next!

```c
/// quantum/matrix_common.c
__attribute__((weak)) void matrix_output_unselect_delay(uint8_t line, bool key_pressed) {
    matrix_io_delay();
}
/// quantum/matrix_common.c
/* `matrix_io_delay ()` exists for backwards compatibility. From now on, use matrix_output_unselect_delay(). */
__attribute__((weak)) void matrix_io_delay(void) {
    wait_us(MATRIX_IO_DELAY);
}
// quantum/matrix_common.c
#ifndef MATRIX_IO_DELAY
#    define MATRIX_IO_DELAY 30
#endif
```

for all of the above symbols, I need to check that it's not specifically overridden by my keyboard implementation, 
none were. `matrix_output_unselect_delay(current_col, key_pressed)` therefore waits `30μs`. 

I add the delay and the number of t's go from 19 to sometimes *many*, good not great. But, my scan-rate which is directly influencing 
latency on presses goes from around `40μs` to `200μs+` (6 columns, each with a `30μs` sleep), unacceptable. The above code did come with a comment, 
it wants the row-pins to settle back into `high`, so I could just check for that instead!

```rust
// Wait for all rows to settle
for row in rows {
    while matches!(row.0.is_low(), Ok(true)) {}
}
```

Now latency lands around `50μs`. I still have that issue of the many t's, but at least the problem didn't get worse.

I hook up the keyboard to `picocom` and start reading output lines.  
I output each state-delta as `M0, R0, C0 -> true [90237]`, matrix index, row_index, column index, and whether the key
is pressed or not, followed by the number of microseconds since the last state-change.

I can see that the activation-behavior is strange, sometimes, immediately (generally around `250μs` after a 
legitimate key-action) state-flips unexpectedly and holds in the ghost-state for `100-2500μs`. 
It's not a rogue flip, the state is actually changed as if the switch is pressed (or released) for quite some time.  

However much I tried, I could not get these ghosts out of my keyboard, I had to learn to live with them.  

#### Debouncing

Debouncing is a way to regulate signals (I think, this really isn't my field, don't roast me on the definitions), and 
is a broad concept which can be applied to noisy signals in all kinds of areas.  

I wanted to implement debouncing in a way that affected latency minimally, luckily this behaviour is only triggered 
after legitimate key-actions, and on a per-key basis. IE. I only have to regulate keys after the first signal which I 
know is good, and only for the same key that produced the good signal.  

I record the last key-action and set up quarantine logic, it goes like this:

> If a key has a delta shortly (implemented with a constant, 10_000 micros at writing) after the previous delta,
> require that the new state is repeated for a short (same as above) time before producing a signal.

My fastest repeated key-pressing of a single key is around `40_000μs` between presses, so this should not activate 
on good presses. Furthermore, if it does and that state is held for long enough the key comes through anyway.  

This worked like a charm, on a given keypress it should not increase latency at all, but it killed the noise.  

### Mysterious halting

At some point of developing the keymap, the keyboard would start freezing on boot, not producing any output. 
I couldn't understand why, but `core1`, which handles key-presses wouldn't report anything. Once more I had to 
get the dedicated boot-skewer out to flash new firmware.  

I started removing the latest changes and realized that scanning 5 columns for changes but not 6 on the left side 
would work fine. Adding back scanning 6 columns would freeze immediately again.  

I took a break and when doing something else it suddenly struck me, here!

```rust
#[allow(static_mut_refs)]
if let Err(_e) = mc.cores()[1].spawn(unsafe { &mut CORE_1_STACK_AREA }, move || {
    run_core1(
        receiver,
        left_buttons,
        timer,
        #[cfg(feature = "hiddev")]
        usb_bus,
    )
})
```

Can you see it?

Well?

The unsafe draws the attention, but I'm manually setting the stack area for core1:  

`static mut CORE_1_STACK_AREA: [usize; 1024] = [0; 1024];`

When adding the code for a 6th row, the stack overflows and the core halts, increasing the stack area 
immediately solved the issue.

## Performance

Now the keyboard is actually usable, time for the fun part, performance. This is my first real embedded project, 
and I learned a lot programming for a different target.

### Real time

First off, since there's not much of a scheduler running (disregarding interrupts) the displayed scan rate on the 
oleds gives very direct feedback on changes in performance, usually it's much more difficult to see how code-changes 
impact performance, but here it's immediate and easy to spot.  

### Priorities

Measurement is the key to performance, and the measurements of interests are, in order, scan rate, key-processing-rate, 
and binary size. Scan rate is important, because that determines the latency of key-press -> OS, 
secondly, key-processing can't be too slow since that immediately tacks on to the latency, lastly there's a size restriction 
of 2MB on the produced image. 

### Methodology

The oled displays scan rate, so that's easy. Key-processing-rate can't be measured as easily. However, jamming 
the keyboard at max speed and checking the scan rate was used as a proxy. Binary size can be inspected on compilation.  

## Inlining

When people talk about performance [inlining](https://en.wikipedia.org/wiki/Inline_expansion) often comes up.

Briefly, inlining is replacing a function call with the code from that function at the call-site, here's an example.

```rust

fn my_add(a: i32, b: i32) -> i32 {
    a + b
}

fn not_inlined_caller() {
    // Not inlined the function is called, moving 1, and 2 into the correct ABI-defined registers
    // then invoking the function.
    my_add(1, 2); 
}

fn inlined_caller_after_inlining() {
    // my_add(1, 2) <- disappears
    1 + 2 // <- `my_add` function body copied into this function
}
```

Inlining reduces some overhead, such as shuffling around values to registers, and invoking functions, 
but all that copying of code can produce a lot of instructions, which may thrash the CPU's instruction cache. 

Here's an example of how that could become problematic:

```rust
#[inline]
fn my_very_long_fn() {
    // 1000 lines of spooky code
}

fn my_caller(rarely_true: bool) {
    if rarely_true {
        my_very_long_fn();
    }
}
```

Depending on the CPU, it might, on entering `my_caller`, have to fetch all the instructions contained in `my_very_long_fn` 
draining space in the instruction cache resulting in re-fetches which may take a long time. 
If `rarely_true` is rarely true this could be an unnecessary overhead, and if the function is long enough, the 
eventual savings from inlining may pale in comparison to the execution-time of the inlined function meaning that 
there's no upside in the `rarely_true == true`-case, and huge downside in the `rarely_true == false`-case.

It's hard to draw general conclusions however, you have to measure to be sure, luckily I measured!

### Inlining in practice

There weren't huge surprises on where inlining made the most difference, but I was surprised with how much it mattered.

The general logic of `core1` is this: 

1. Check for changes (uart, gpio, usb).
2. On a change, execute some logic (left side sends a keypress to the OS, right side sends it to the left).
3. Report changes to `core0`.

The vast majority of the time each loop produces no change, here's an excerpt from left side `core1`:

```rust
loop {
    let mut any_change = false;
    if let Some(update) = receiver.try_read() {
        // Right side sent an update
        rx += 1;
        // Update report state
        kbd.update_right(update, &mut report_state);
        any_change = true;
    }
    // Check left side gpio and update report state
    if kbd.scan_left(&mut left_buttons, &mut report_state, timer) {
        any_change = true;
    }
    if any_change {
        push_touch_to_admin();
    }
    #[cfg(feature = "hiddev")]
    {
        let mut pop = false;
        if let Some(next_update) = report_state.report() {
            // Publish the next update on queue if present
            unsafe {
                pop = crate::runtime::shared::usb::try_push_report(next_update);
            }
        }
        if pop {
            // Remove the sent report (it's down here because of the borrow checker)
            report_state.accept();
        }
    }

    if let Some(change) = report_state.layer_update() {
        push_layer_change(change);
    }

    if rx > 0 && push_rx_change(rx) {
        rx = 0;
    }
    if loop_count.increment() {
        let now = timer.get_counter();
        let lc = loop_count.value(now);
        if push_loop_to_admin(lc) {
            loop_count.reset(now);
        }
    }
}
```

Some of the code in that loop is only triggered in certain cases, I followed the philosophy of inlining most of what 
always runs, and refusing to inline things that are conditionally called, Rust has facilities for this: 

`#[inline]`, `#[inline(never)]`, and `#[inline(always)]`, the compiler is usually smart enough that it makes 
the correct call if `#[inline]` is specified or not, so `#[inline(never)]`, and `#[inline(always)]` aren't that necessary.  

[More information here](https://nnethercote.github.io/perf-book/inlining.html) on cross-crate stuff, but I'm compiling 
with [fat-lto](https://doc.rust-lang.org/rustc/codegen-options/index.html) anyway, so it doesn't really matter to me here.

The most impressive change was removing `#[inline]` from `kbd.update_right(update, &mut report_state);` inside the 
if-statement above, that took the current scan latency from `80μs` to around `36μs`. Not inlining it halved the 
scan latency.  

Last notes on inlining, the compiler makes decisions about inlining that can be very hard to understand, you change 
something seemingly irrelevant, and suddenly the binary increases in size by 25% and latency increases by about 
the same amount because the compiler decided to inline something that doesn't fit with your performance goals. 
I want the scan-loop to be fast, but the compiler saw an opportunity to make something else fast at the expense of 
the scan-loop, for example. It's not a *bad* decision, but it's a bad fit.  
Making small changes and testing them is therefore important, and interesting!  

## Const evaluation, bounds checking

Fewer instructions are often better, fewer instructions are generally faster to execute than more instructions, 
they take up less space in the instruction-cache, and may therefore make an inlining-tradeoff make more sense.  

This `get_unchecked` which elides the bounds-check made a massive difference in performance. 

```rust
/// self.buffer[self.tail] -> unsafe {self.buffer.get_unchecked_mut(self.tail)};
```

It did it in two parts, it caused the compiler to inline the function, that in itself did a lot. 
I manually marked it inline and reverted the change, and it still provided a several microsecond benefit. 
Since I do bounds-checking elsewhere, I was confident keeping this `unsafe`.

To further improve performance I wanted to evaluate as much as possible at compilation time, so that things are 
accessed efficiently, if I can assert that indices are in bounds at comptime, I can safely use unsafe 
index accesses. Rust's type system provides tools for that, and since I know how many keys I have on my keyboard, 
I don't have to have any dynamically sized arrays.  

Here's an example: 

```rust
#[repr(transparent)]
#[derive(Debug, Copy, Clone)]
pub struct RowIndex(pub u8);

impl RowIndex {
    #[must_use]
    #[allow(clippy::missing_panics_doc)]
    pub const fn from_value(ind: u8) -> Self {
        assert!(
            ind < NUM_ROWS,
            "Tried to construct row index from a bad value"
        );
        Self(ind)
    }

    #[inline]
    #[must_use]
    pub const fn index(self) -> usize {
        self.0 as usize
    }
}
```

The `RowIndex`-struct only accepts indices that are valid, therefore it's always safe to use to index into 
structures with `NUM_ROWS` length or more.

Using this strategy to elide bounds-checking shaved more microseconds off the loop-times. Since pin-indexing 
is done on the `gpio` pin-scan on each loop, these improvements makes quite the difference.  

## Macros to avoid branching

I abhor macros, they're difficult to follow and understand, and professionally I try to avoid them like the plague. 
But, here in my private life it's all about the performance, and they can be useful to avoid branching.

Consider the connection of the actual GPIO-pin, and the struct that I use to keep a pin's state in memory.

They have different types, all the GPIO-pins have different types, and all the keys as well, they can't be 
kept in a collection together without using a [v-table](https://doc.rust-lang.org/std/keyword.dyn.html). This, in my opinion, is fixable in `Rust`. 
The reason that the buttons, for example, can't be kept together, is that each button may have a different memory layout.

In my case they all have the same layout and all expose the same function, here's an example: 

```rust
impl KeyboardButton for LeftRow0Col0 {
    fn on_press(&mut self, keyboard_report_state: &mut KeyboardReportState) {
        keyboard_report_state.push_key(KeyCode::TAB);
    }
    fn on_release(
        &mut self,
        _last_press_state: LastPressState,
        keyboard_report_state: &mut KeyboardReportState,
    ) {
        keyboard_report_state.pop_key(KeyCode::TAB);
    }
}
```

I generate the key-structs from a macro, they all have the exact same layout. 
I should be able to store them in an array (assuming that the function addresses of each respective button's methods are knowable 
which thinking about it, they might not be).  

Macros are a way around this though: 

```rust
macro_rules! impl_read_pin_col {
    ($($structure: expr, $row: tt,)*, $col: tt) => {
        paste! {
            pub fn [<read_col _ $col _pins>]($([< $structure:snake >]: &mut $structure,)* left_buttons: &mut LeftButtons, keyboard_report_state: &mut KeyboardReportState, timer: Timer) -> bool {
                // Safety: Make sure this is properly initialized and restored
                // at the end of this function, makes a noticeable difference in performance
                let col = unsafe {left_buttons.cols.$col.take().unwrap_unchecked()};
                let col = col.into_push_pull_output_in_state(PinState::Low);
                // Just pulling chibios defaults of 0.25 micros, could probably be 0
                crate::timer::wait_nanos(timer, 250);
                let mut any_change = false;
                $(
                    {
                        if [< $structure:snake >].check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value($row)), keyboard_report_state, timer) {
                            any_change = true;
                        }
                    }

                )*
                left_buttons.cols.$col = Some(col.into_pull_up_input());
                $(
                    {
                        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value($row)) {}
                    }
                )*
                any_change
            }

        }

    };
}
```

Here's how it's used: 
```rust
impl_read_pin_col!(
    LeftRow0Col1, 0,
    LeftRow1Col1, 1,
    LeftRow2Col1, 2,
    LeftRow3Col1, 3,
    LeftRow4Col1, 4,
    ,1
); 
// Produces function `read_col_1_pins` with proper typechecking
let col1_change = read_col_1_pins(
    &mut self.left_row0_col1,
    &mut self.left_row1_col1,
    &mut self.left_row2_col1,
    &mut self.left_row3_col1,
    &mut self.left_row4_col1,
    left_buttons,
    keyboard_report_state,
    timer,
);
```

In practice the macro code is inlined like this: 

```rust 
pub fn read_col_1_pins(left_row0_col1: &mut LeftRow0Col1, left_row1_col1: &mut LeftRow1Col1, left_row2_col1: &mut LeftRow2Col1, left_row3_col1: &mut LeftRow3Col1, left_row4_col1: &mut LeftRow4Col1, left_buttons: &mut LeftButtons, keyboard_report_state: &mut KeyboardReportState, timer: Timer) -> bool {
    let col = unsafe {
        left_buttons.cols.1
            .take().unwrap_unchecked()
    };
    let col = col.into_push_pull_output_in_state(PinState::Low);

    crate::timer::wait_nanos(timer, 250);
    let mut any_change = false;
    {
        if left_row0_col1.check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(0)), keyboard_report_state, timer) {
            any_change = true;
        }
    }
    {
        if left_row1_col1.check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(1)), keyboard_report_state, timer) {
            any_change = true;
        }
    }
    {
        if left_row2_col1.check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(2)), keyboard_report_state, timer) {
            any_change = true;
        }
    }
    {
        if left_row3_col1.check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(3)), keyboard_report_state, timer) {
            any_change = true;
        }
    }
    {
        if left_row4_col1.check_update_state(left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(4)), keyboard_report_state, timer) {
            any_change = true;
        }
    }
    left_buttons.cols.1
        = Some(col.into_pull_up_input());
    {
        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(0)) {}
    }
    {
        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(1)) {}
    }
    {
        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(2)) {}
    }
    {
        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(3)) {}
    }
    {
        while left_buttons.row_pin_is_low(rp2040_kbd_lib::matrix::RowIndex::from_value(4)) {}
    }
    any_change
}
```

There is no access by index for the pins here, they are manually checked one-by-one. 

### Performance summary

In the end I took 4 measurements on the left side: 

1. Scan latency
2. Change originating from left scan loop latency
3. Change originating from right scan loop latency
4. Inter-core message queue capacity

And 3 on the right:

1. Scan latency
2. Change loop latency
3. Inter-core message queue capacity

The scan latency has been talked about, it ended up at about `20μs` after optimizations, 
that is, each pin is checked every `20μs` if the keyboard is idle (on both sides).

Changes originating from the left measures the loop latency, the time it takes before discovering a change 
to completely processing it, when a change comes from the left side gpio pins. That landed on about 
`60μs`. In other words, from starting to check for changes, to discovering and handling a change is 
`60μs`.

Changes originating from the right measures the same as above but from the right side, that takes about 
`70μs`.

Inter-core message queue capacity sits firmly at 0 on both sides, even though the consumer-core writes messages to oled, 
it doesn't get overwhelmed. 

On the right-side the latency on changes is only `25μs` however, since the 
left side handles all the logic contained in the keymap, this makes sense.  

#### Rough calculation of worst case latency

This means that the keyboard *should* at most add a `70μs` latency overhead from the left, and `25μs` on the right, 
and be able to detect a change lasting for `20μs` or more on both sides.

The transfer rate between sides is set by the uart baud-rate which is `781 250` bits per second.  
This calculates to `10.24μs` per byte sent, all messages sent are at most `1` byte.  

Worst case scenario *should* therefore be the `os_poll_latency + left_side_right_change_latency + right_side_latency + transfer_latency`,
which would be `1000μs + 70μs + 25μs + 10μs = 1105μs`, when a single key is pressed on the right side,`os_poll_latency + left_side_left_change_latency = 1060μs` on the left. 

#### Caveat

This only holds for single presses, if the keymap outputs sequences like when I press `^`, on eu keyboards 
that needs a second press to activate, so that you can send symbols like `â`. However, I don't do that, I want `^` 
to go out immediately so when `^` is pressed, I send KeyDown `^` + KeyUp `^` + KeyDown `^` 
which makes the os-latency alone be `3000μs`.  

## End

This has been my longest writeup yet, it was my first real foray into embedded development, and it ended with 
me writing this on a keyboard running my own firmware.

There's still stuff to iron out with the keymap, but I'm really happy with the result.  
The firmware is fast and works, the two things that I care about, the code can be found [here](https://github.com/MarcusGrass/rp2040-kbd).

### Thoughts on QMK

I went on a bit of a rant on QMK, but it's a great robust codebase, it could probably be reimplemented in Rust 
if one really wanted to, but it seems unnecessary, and my firmware does not at all attempt to do it.  
Mostly the macro-parts would need some thinking over, because the way I did keymaps were a real mess of boilerplate-code 
that is not nice to work with.  
