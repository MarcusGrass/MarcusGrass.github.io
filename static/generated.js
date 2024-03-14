const Location = Object.freeze({
	HOME: {"path": "/", "name": "Home"},
	NAV: {"path": "/table-of-contents", "name": "Nav"},
	NOTFOUND: {"path": "/not-found", "name": "NotFound"},
	META: {"path": "/meta", "name": "Meta"},
	PGWM03: {"path": "/pgwm03", "name": "Pgwm03"},
	BOOT: {"path": "/boot", "name": "Boot"},
	PGWM04: {"path": "/pgwm04", "name": "Pgwm04"},
	THREADS: {"path": "/threads", "name": "Threads"},
	STATICPIE: {"path": "/static-pie", "name": "StaticPie"},
	KBDSMP: {"path": "/kbd-smp", "name": "KbdSmp"},
	TEST: {"path": "/test", "name": "Test"},
});

const HOME_HTML = String.raw`<div class="markdown-body"><h1>About</h1>
<p>This site is a place where I intend to store things I've learned so that I won't forget it.</p>
<h2>This page</h2>
<p>There's not supposed to be a web 1.0 vibe to it, but I'm horrible at front-end styling so here we are.<br>
The site is constructed in <code>javascript</code> but
as with all things in my free time I make things more complicated than they need to be.<br>
There is a <code>Rust</code> runner that takes the md-files, generates html and javascript, and then minifies
that.<br>
The markdown styling is ripped from <a href="https://github.com/sindresorhus/github-markdown-css">this project</a>,
it's GitHub's markdown CSS, I don't want to stray too far out of my comfort zone...</p>
<p>The highlighting is done with the use of <a href="https://github.com/wooorm/starry-night">starry-night</a>.</p>
<p>All page content except for some glue is just rendered markdown contained
in <a href="https://github.com/MarcusGrass/marcusgrass.github.io">the repo</a>.</p>
<h2>Content</h2>
<p>See the menu bar at the top left to navigate to the table of contents,
if I end up writing a lot of stuff here I'm going to have to look into better navigation and search.</p>
<h2>License</h2>
<p>The license for this pages code can be found in the
repo <a href="https://github.com/MarcusGrass/marcusgrass.github.io/blob/main/LICENSE">here</a>.<br>
The license for the styling is under that
repo <a href="https://github.com/sindresorhus/github-markdown-css/blob/main/license">here</a>.<br>
The license for starry night is for some reason kept in this 1MB file in their repo
<a href="https://github.com/wooorm/starry-night/blob/c73aac7b8bff41ada86747f668dd932a791b851b/notice">here</a>
(TLDR it's MIT/Apache2 licensed under MIT)</p>
</div>`;
const NAV_HTML = String.raw`<div class="markdown-body"><h1>Table of contents</h1>
<p>Because I'm terrible at web-dev and unable to make a side menu scale properly,
I made things easier for myself and made navigation happen through this md-page instead.</p>
<h2>Top level navigation</h2>
<ul>
<li><a class="self-link" onclick=page_navigate("/")>Home(also top left on this page)</a></li>
<li><a class="self-link" onclick=page_navigate("/table-of-contents")>Table of contents(here, nothing will happen)</a></li>
</ul>
<h2>Projects</h2>
<ul>
<li><a class="self-link" onclick=page_navigate("/meta")>This page</a></li>
<li><a class="self-link" onclick=page_navigate("/pgwm03")>Pgwm03 - nostd - nolibc window manager</a></li>
<li><a class="self-link" onclick=page_navigate("/boot")>Boot - Writing a tiny bootloader</a></li>
<li><a class="self-link" onclick=page_navigate("/pgwm04")>Pgwm04 - Wm runs on stable, uses io_uring</a></li>
<li><a class="self-link" onclick=page_navigate("/threads")>Threads - Tiny-std has threading support</a></li>
<li><a class="self-link" onclick=page_navigate("/static-pie")>Static pie - Tiny-std can compile as static-pie</a></li>
<li><a class="self-link" onclick=page_navigate("/kbd-smp")>Keyboard SMP - Multithreading in your keyboard</a></li>
<li><a class="self-link" onclick=page_navigate("/test")>Test</a></li>
</ul>
</div>`;
const NOTFOUND_HTML = String.raw`<div class="markdown-body"><h1>Page not found</h1>
<p>You seem to have navigated to a page that doesn't exist, sorry!</p>
<p>You can go back in the navigation menu on the top left, or with <a class="self-link" onclick=page_navigate("/")>this link</a></p>
</div>`;
const BOOT_HTML = String.raw`<div class="markdown-body"><h1>Boot-rs securing a Linux bootloader</h1>
<p>I recently dug into a previously unfamiliar part of Linux, the bootloader.</p>
<p>This is a medium-length write-up of how the Linux boot-process works and how to modify it, told through
the process of me writing my own janky bootloader.</p>
<p>I wanted the boot process to be understandable, ergonomic, and secure.</p>
<h2>Notes about distributions</h2>
<p>I did what's described in this write-up on Gentoo, although it would work the same on any
linux machine. Depending on the distribution this setup might not be feasible. Likely these steps would have to
be modified depending on the circumstance.</p>
<h2>Preamble, Security keys</h2>
<p>I got some <a href="https://www.yubico.com/">Yubikeys</a> recently. Yubikeys are security keys, which essentially is a fancy
name for a drive (USB in this case) created to store secrets securely.</p>
<p>Some secrets that are loaded into the key cannot escape at all, they can even be created on the key, never having seen
the light of day.<br>
Some secrets can escape and can therefore be injected as part of a pipeline in other security processes. An example
of this could be storing a cryptodisk secret which is then passed to <a href="https://gitlab.com/cryptsetup/cryptsetup">cryptsetup</a>
in the case of Linux disk encryption.</p>
<p>I did some programming against the Yubikeys, I published a small runner to sign data with a Yubikey <a href="https://github.com/MarcusGrass/yk-verify">here</a>
but got a bit discouraged by the need for <a href="https://pcsclite.apdu.fr/">pcscd</a>, a daemon with an accompanying c-library to
interface with it, to connect.<br>
Later I managed to do a pure rust integration against the Linux usb interface, and will publish that pretty soon.</p>
<p>I started thinking about ways to integrate Yubikeys into my workflow more, I started
examining my boot process, I got derailed.</p>
<h2>Bootloader woes</h2>
<p>I have used <a href="https://en.wikipedia.org/wiki/GNU_GRUB">GRUB</a> as my bootloader since I started using Linux, it has generally
worked well, but it does feel old.</p>
<p>When I ran <code>grub-mkconfig -o ...</code>, updating my boot configuration, and ran into
<a href="https://www.reddit.com/r/EndeavourOS/comments/wygfds/full_transparency_on_the_grub_issue/">this</a> issue I figured it
was time to survey for other options. After burning another ISO to get back into my system.</p>
<h2>Bootloader alternatives</h2>
<p>I was looking into alternatives, finding <a href="https://wiki.archlinux.org/title/EFISTUB">efi stub</a>, compiling the kernel
into its own bootable efi-image, to be the most appealing option.
If the kernel can boot itself, why even have a bootloader?</p>
<p>With Gentoo, integrating that was fairly easy assuming no disk encryption.</p>
<p>Before getting into this, a few paragraphs about the Linux boot process may be appropriate.</p>
<h2>Boot in short</h2>
<p>The boot process, in my opinion, starts on the motherboard firmware and ends when the kernel hands over execution to <code>/sbin/init</code>.</p>
<h3>UEFI</h3>
<p>The motherboard powers on and starts running UEFI firmware (I'm pretending bios don't exist because I'm not stuck in the past).<br>
UEFI can run images, such as disk, keyboard, and basic display-drivers, kernels, and Rust binaries.</p>
<p>Usually, this stage of the process will be short, as the default task to perform is to check if the user wants to enter
setup and interface with the UEFI system, or continue with the highest priority boot-image.</p>
<p>That boot image could be a grub.efi-program, which may perform some work, such as decrypting your boot partition and then
handing execution over to the kernel image.<br>
It could also be an efi stub kernel image that gets loaded directly, or some other bootloader.</p>
<h3>Kernel boot</h3>
<p>The kernel process starts, initializing the memory it needs, starting tasks, and whatever else the kernel does.</p>
<h3>Initramfs</h3>
<p>When the kernel has performed its initialization, early userspace starts in the initramfs.<br>
<a href="https://en.wikipedia.org/wiki/Initial_ramdisk">Initramfs</a>, also called early userspace, is the first place a Linux user
is likely to spread their bash-spaghetti in the boot-process.</p>
<p>The initramfs is a ram-contained (in-memory) file-system, <a href="https://cateee.net/lkddb/web-lkddb/INITRAMFS_SOURCE.html">it can be baked into the kernel</a>,
or provided where the kernel can find it during the boot process. Its purpose is to set up user-space so that it's ready
enough for <code>init</code> to take over execution. Here is where disk-decryption happens in the case of <code>cryptsetup</code>.</p>
<p>The Initramfs-stage ends by handing over execution to <code>init</code>:</p>
<p><code>exec switch_root &#x3C;root-partition> &#x3C;init></code>, an example could be <code>exec switch_root /mnt/root /sbin/init</code>,
by convention, <code>init</code> is usually found at <code>/sbin/init</code>.</p>
<p>The initramfs prepares user-space, while <code>init</code> "starts" it, e.g. processes, such as <a href="https://wiki.archlinux.org/title/dhcpcd">dhcpcd</a>,
are taken care of by <code>init</code>.</p>
<h3>Init</h3>
<p>Init is the first userspace process to be started, the parent to all other processes, it has PID 1 and if it dies,
the kernel panics.
Init could be any executable, like <a href="https://en.wikipedia.org/wiki/Bash_(Unix_shell)">Bash</a>.</p>
<p>In an example system where bash is init, the user will be dropped into the command-line, in a bash shell, at the destination that the
initramfs specified in <code>switch_root</code>. From a common user's perspective this is barely a functional system, it has no internet,
it will likely not have connections to a lot of peripheral devices, and there is no login management.</p>
<h4>Init daemon</h4>
<p>Usually Linux systems have an init daemon. Some common init-daemons are <a href="https://en.wikipedia.org/wiki/Systemd">systemd</a>, <a href="https://en.wikipedia.org/wiki/OpenRC">openrc</a>,
and <a href="https://en.wikipedia.org/wiki/Runit">runit</a>.<br>
The init daemon's job is to start processes that make the system usable, up to the user's specification. Usually it
will start <code>udev</code> to get device events and populate <code>/dev</code> with device interfaces, as well as ready internet interfaces
and start login management.</p>
<h2>DIY initramfs</h2>
<p>I wanted at least basic security, this means encrypted disks, if I lose my computer, or it gets stolen, I can be fairly sure that
the culprits won't get access to my data without considerable effort.<br>
Looking back up over the steps, it means that I need to create an initramfs, so that my disks can be decrypted on boot.
There are tools to create an initramfs, <a href="https://en.wikipedia.org/wiki/Dracut_(software)">dracut</a> being
one example, <a href="https://wiki.archlinux.org/title/Mkinitcpio">mkinitcpio</a> that Arch Linux uses is another.</p>
<p>Taking things to the most absurd level, I figured I'd write my own initramfs instead.</p>
<h3>The process</h3>
<p>The most basic decrypting initramfs is just a directory which could be created like this:</p>
<div class="highlight highlight-shell"><pre>[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># touch init</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># chmod +x init</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir -p mnt/root</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># ls -lah</span>
total 12K
drwxr-xr-x 3 gramar gramar 4.0K Mar 21 15:11 <span class="pl-c1">.</span>
drwxr-xr-x 4 gramar gramar 4.0K Mar 21 15:11 ..
-rwxr-xr-x 1 gramar gramar    0 Mar 21 15:11 init
drwxr-xr-x 3 gramar gramar 4.0K Mar 21 15:11 mnt
</pre></div>
<p>The init contents being this:</p>
<div class="highlight highlight-shell"><pre><span class="pl-c">#!/bin/bash</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> croot <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> cswap <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> chome <span class="pl-c"># Enter password</span>
<span class="pl-c"># Mount filesystem</span>
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 
<span class="pl-c"># Hand over execution to init</span>
<span class="pl-c1">exec</span> switch_root /mnt/root /sbin/init
</pre></div>
<p>If we point the kernel at this directory, build it, and then try to boot it, we'll find out that this doesn't work at all,
and if you somehow ended up here through Googling and copied that, I'm sorry.</p>
<p>One reason for this is that <code>/bin/bàsh</code> does not exist on the initramfs, we can't call it to execute the commands in the scripts.</p>
<p>If we add it, for example by:</p>
<div class="highlight highlight-shell"><pre>[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir bin</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># cp /bin/bash bin/bash</span>
</pre></div>
<p>Then try again, it still won't work and will result in a kernel panic.<br>
The reason is that bash (if you didn't build it yourself using dark magic), is dynamically
linked, we can see that this is indeed the case using <a href="https://en.wikipedia.org/wiki/Ldd_(Unix)">ldd</a>
to list dynamic dependencies.</p>
<div class="highlight highlight-shell"><pre>[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># ldd bin/bash</span>
        linux-vdso.so.1 (0x00007ffc7f9a1000)
        libreadline.so.8 =<span class="pl-k">></span> /lib64/libreadline.so.8 (0x00007fd040f06000)
        libtinfo.so.6 =<span class="pl-k">></span> /lib64/libtinfo.so.6 (0x00007fd040ec6000)
        libc.so.6 =<span class="pl-k">></span> /lib64/libc.so.6 (0x00007fd040cf3000)
        libtinfow.so.6 =<span class="pl-k">></span> /lib64/libtinfow.so.6 (0x00007fd040cb2000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fd04104f000)
</pre></div>
<p>Now we can just try to appease <code>Bash</code> here and copy these dependencies into the initramfs at the appropriate places,
but there are quite a few files, and we risk cascading dependencies, what if we need to update and the dependencies have changed?</p>
<p>And how about <code>cryptsetup</code>, <code>mount</code>, <code>swapon</code>, and <code>switch_root</code>?</p>
<h4>Static linking and BusyBox</h4>
<p>Many of the tools used to interface with Linux (usually) come from <a href="https://en.wikipedia.org/wiki/GNU_Core_Utilities">GNU coreutils</a>.<br>
There are other sources however, like <a href="https://github.com/uutils/coreutils">the Rust port</a>, but the most popular is likely
<a href="https://en.wikipedia.org/wiki/BusyBox">BusyBox</a>.</p>
<p>BusyBox is a single binary which on my machine is 2.2M big, it contains most of the coreutils.<br>
One benefit of using BusyBox is that it can easily be <a href="https://en.wikipedia.org/wiki/Static_library">statically linked</a>
which means that copying that single binary is enough, no dependencies required.<br>
Likewise <code>cryptsetup</code> can easily be statically linked.</p>
<h3>Busybox initramfs</h3>
<p>The binaries are placed in the initramfs. (I realize that I need a tty, console, and null to run our shell
so I copy those too).</p>
<div class="highlight highlight-shell"><pre>[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># cp /bin/busybox bin/busybox</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir sbin        </span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># cp /sbin/cryptsetup sbin/cryptsetup</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># cp -a /dev/{null,console,tty} dev</span>
</pre></div>
<p>And then change the script's <a href="https://en.wikipedia.org/wiki/Shebang_(Unix)">shebang</a>.</p>
<div class="highlight highlight-shell"><pre><span class="pl-c">#!/bin/busybox sh</span>
<span class="pl-k">export</span> PATH=<span class="pl-s"><span class="pl-pds">"</span>/bin:/sbin:<span class="pl-smi">$PATH</span><span class="pl-pds">"</span></span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> croot <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> cswap <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> chome <span class="pl-c"># Enter password</span>
<span class="pl-c"># Mount filesystem</span>
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 
<span class="pl-c"># Hand over execution to init</span>
<span class="pl-c1">exec</span> switch_root /mnt/root /sbin/init
</pre></div>
<p>Finally, we can execute the init script at boot time, and immediately panic again, <code>cryptsetup</code> can't find the disk.</p>
<h3>Udev</h3>
<p>There are multiple ways to address disks, we could for example, copy the disk we need in the initramfs as it shows up
under <code>/dev</code>, <code>cp -a /dev/sda2 dev</code>.  But the regular disk naming convention isn't static, <code>/dev/sda</code> might be tomorrow's
<code>/dev/sdb</code>. Causing an un-bootable system, ideally we would specify it by uuid.</p>
<p>Udev is a tool that finds devices, listens to device events, and a bit more. What we need it for, is to populate
<code>/dev</code> with the devices that we expect.</p>
<p>I call it Udev because it's ubiquitous, it's actually a <a href="https://en.wikipedia.org/wiki/Udev">systemd project</a>.<br>
There is a fork, that used to be maintained by the Gentoo maintainers, <a href="https://en.wikipedia.org/wiki/Systemd#Forks_and_alternative_implementations">Eudev</a>.<br>
Both of the above are not ideal for an initramfs, what we'd really like is to just oneshot generate <code>/dev</code>.<br>
Luckily for us, there is a perfect implementation that does just that, contained within BusyBox, <a href="https://wiki.gentoo.org/wiki/Mdev">Mdev</a>.</p>
<p>To save us from further panics, I will fast-forward through discovering that we need to mount three pseudo-filesystems
to make mdev work, <code>proc</code>, <code>sys</code>, and <code>dev</code> (<code>dev</code> shouldn't be that surprising). We also need to create the mount points.</p>
<div class="highlight highlight-shell"><pre>[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir proc</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir dev</span>
[gramar@grentoo /home/gramar/misc/initramfs]<span class="pl-c"># mkdir sys</span>
</pre></div>
<h3>Working initramfs</h3>
<div class="highlight highlight-shell"><pre><span class="pl-c">#!/bin/busybox sh</span>
<span class="pl-k">export</span> PATH=<span class="pl-s"><span class="pl-pds">"</span>/bin:/sbin:<span class="pl-smi">$PATH</span><span class="pl-pds">"</span></span>
<span class="pl-c"># Mount pseudo filesystems</span>
mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev
<span class="pl-c"># Mdev populates /dev with symlinks</span>
mdev -s
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> croot <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> cswap <span class="pl-c"># Enter password</span>
cryptsetup open /dev/disk/by-uuid/<span class="pl-k">&#x3C;</span>xxxx<span class="pl-k">></span> chome <span class="pl-c"># Enter password</span>
<span class="pl-c"># Mount filesystem</span>
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 
<span class="pl-c"># Unmount the pseudo filesystems, except dev which is now busy.  </span>
umount /proc
umount /sys
<span class="pl-c"># Hand over execution to init</span>
<span class="pl-c1">exec</span> switch_root /mnt/root /sbin/init
</pre></div>
<h3>Ergonomics</h3>
<p>This setup requires me to enter my password three times, which is easily fixed by saving it in a variable and piping
it into <code>cryptsetup</code>.</p>
<h2>Reflections on security</h2>
<p>While the above setup works, it has less security than my last.<br>
I boot directly into my kernel which now must be unencrypted, and could therefore be tampered with.<br>
This is a different attack-surface than the last considered one: I lose my laptop. It's: Someone tampers with my
boot process to get access to my data on subsequent uses.</p>
<h3>Bootloader tampering</h3>
<p>Depending on your setup, your bootloader (kernel in this case) may be more or less subject to tampering.<br>
Usually, one would have the bootloader in a <code>/boot</code> directory, which may or may not be on a separate partition.</p>
<p>If that directory is writeable only by root, it doesn't really matter if it's on an unmounted partition or not.<br>
Someone with root access to your machine could edit the contents (or mount the partition and then edit the contents).<br>
That means that if someone has root access to your machine then your bootloader could be tampered with remotely.</p>
<h4>Evil maids</h4>
<p>Another possible avenue of compromise is if someone has physical access to the disk on which you store your bootloader.<br>
I am not a high-value target, as far as I know at least, and that kind of attack, also known as an <a href="https://en.wikipedia.org/wiki/Evil_maid_attack">evil maid attack</a>
is fairly high-effort to pull off.  The attacker needs to modify my kernel without me noticing, which for me as a target,
again, is pretty far-fetched.</p>
<p>But this is not about being reasonable, it's never been about that, it's about taking things to the extreme.</p>
<h3>Encrypting the kernel</h3>
<p>The problem with encrypting the kernel is that something has to decrypt it, we need to move further down the boot-chain.<br>
I need to, at the UEFI level, decrypt and then hand over execution to the kernel image.</p>
<h2>Writing a bootloader</h2>
<p>I hinted earlier at UEFI being able to run Rust binaries, indeed there is an <a href="https://github.com/rust-osdev/uefi-rs">UEFI</a> target
and library for Rust.</p>
<h3>Encrypt and Decrypt without storing secrets</h3>
<p>We can't have the bootloader encrypted, it needs to be a ready UEFI image.<br>
This means that we can't store decryption keys in the bootloader, it needs to ask the user for input
and deterministically derive the decryption key from that input.</p>
<p>Best practice for secure symmetric encryption is <a href="https://en.wikipedia.org/wiki/Advanced_Encryption_Standard">AES</a>,
since I want the beefiest encryption, I opt for AES-256, that means that the decryption key is 32 bytes long.</p>
<p>Brute forcing a random set of 32 bytes is currently not feasible, but passwords generally are not random and random brute forcing
would not likely be the method anyone would use to attack this encryption scheme.<br>
What is more likely is that a password list would be used to try leaked passwords,
or dictionary-generated passwords would be used.</p>
<p>To increase security a bit, the 32 bytes will be generated by a good key derivation function, at the moment <a href="https://en.wikipedia.org/wiki/Argon2">Argon2</a>
is the best tool for that as far as I know. This achieves two objectives:</p>
<ol>
<li>Whatever the length of your password, it will end up being 32 random(-ish) bytes long.</li>
<li>The time and computational cost of brute forcing a password will be extended by the time it takes to
run argon2 to the derive a key from each password that is attempted.</li>
</ol>
<p>This leaves the attacker with two options:</p>
<ol>
<li>Randomly try to brute force every 32 byte combination, which is unfeasible.</li>
<li>Use a password list and try every known or generated password after running argon2 on it.</li>
</ol>
<p>Option 2 may or may not be unfeasible, depending on the strength of the password, transforming a bad password
into 32 bytes doesn't do much if the password doesn't take enough attempts to guess.</p>
<h3>Uefi development</h3>
<p>I fire up a new virtual machine, with UEFI support, and start iterating. The development process was less painful than
I thought that It would be. The caveat being that I am writing an extremely simple bootloader, it finds the kernel
on disk, asks the user for a password, derives a key from it using Argon2, decrypts the kernel with that key, and
then hands over execution to the decrypted kernel. The code for it can be found at <a href="https://github.com/MarcusGrass/boot-rs">this repo</a>.</p>
<h2>New reflections on security</h2>
<p>All post-boot content, as well as the kernel is now encrypted, the kernel itself is read straight into RAM and then executed,
the initramfs decrypts the disks after getting password input, deletes itself, and then hands over execution to <code>init</code>.</p>
<h3>Bootloader compromise</h3>
<p>There is still one surface for attack, the unencrypted bootloader.<br>
A malicious actor could replace my bootloader with something else, take my keyboard input, and decrypt my kernel.
Or an attacker could replace my bootloader, take my keyboard input (possibly just discarding it), then boot into a malicious kernel where I enter
my decryption keys, and decrypt my disks.</p>
<h3>Moving cryptodisk secrets into the initramfs</h3>
<p>Since the initramfs is now encrypted, an ergonomic move is to create a new decryption key for my disks,
move that into the initramfs, then use those secrets to decrypt the disks automatically during that stage.</p>
<p>The "boot into malicious kernel attack", becomes more difficult to pull off.
I'd notice if my disks aren't being automatically decrypted.</p>
<h2>Secure boot</h2>
<p>Some people think Secure Boot and UEFI in general is a cynical push by Microsoft to force Linux desktop user share
down to zero (from close to zero).  Perhaps, but Secure Boot can be used to add some security to the most sensitive part
of our now fairly secured boot process.</p>
<p>Secure Boot works by only allowing the UEFI firmware to boot from images that are signed by its stored cryptographic keys.<br>
Microsoft's keys are (almost) always vendored and exist in the store by default, but they can be removed (kind of) and
replaced by your own keys.</p>
<p>The process for adding your own keys to Secure Boot, as well as signing your bootloader, will be left out of this write-up.</p>
<h1>Final reflections on security</h1>
<p>Now my boot-process is about as secure as I am capable of making it while retaining some sense of ergonomics.<br>
The disks are encrypted and can't easily be decrypted. The kernel itself is decrypted and I would notice if it's replaced
by something else through the auto-decryption.<br>
The bootloader cannot be exchanged without extracting my setup password.</p>
<p>The main causes of concerns are now BUGS, and still, evil maids.</p>
<ol>
<li>Bugs in secure boot.</li>
<li>Bugs in my implementation.</li>
<li>Bugs in the AES library that I'm using.</li>
<li>Bugs in the Argon2 library that I'm using.</li>
<li>Bugs in <code>cryptsetup</code>.</li>
<li>Bugs everywhere.</li>
</ol>
<p>But those are hard to get away from.</p>
<h1>Epilogue</h1>
<p>I'm currently using this setup, and I will for as long as I use Gentoo I would guess.
Once set up it's pretty easy to re-compile and re-encrypt the kernel when it's time to upgrade.</p>
<p>Thanks for reading!</p>
</div>`;
const KBDSMP_HTML = String.raw`<div class="markdown-body"><h1>Symmetric multiprocessing in your keyboard</h1>
<p>While my daughter sleeps during my parental leave I manage to get up to
more than I thought I would, this time, a deep-dive into <a href="https://docs.qmk.fm/#/">QMK</a>.</p>
<h2>QMK and custom keyboards</h2>
<p><code>QMK</code> contains open source firmware for keyboards, it provides implementations for most custom keyboard functionality,
like kepyresses (that one's obvious), rotary encoders, and oled screens.</p>
<p>It can be thought of as an OS for your keyboard, which can be configured by plain <code>json</code>,
with <a href="https://config.qmk.fm/#/xelus/kangaroo/rev1/LAYOUT_ansi_split_bs_rshift">online tools</a>, and other
simple tools that you don't need to be able to program to use.</p>
<p>But, you can also get right into it if you want, which is where it gets interesting.</p>
<h2>Qmk structure</h2>
<p>Saying that <code>QMK</code> is like an OS for your keyboard might drive some pedantics mad, since <code>QMK</code> packages
an OS and installs it configured on your keyboard, with your additions.</p>
<p>Most features are toggled by defining constants in different <code>make</code> or header files, like:</p>
<div class="highlight highlight-c"><pre>#<span class="pl-k">pragma</span> once
<span class="pl-c">// Millis</span>
#<span class="pl-k">define</span> <span class="pl-en">OLED_UPDATE_INTERVAL</span> <span class="pl-c1">50</span>
#<span class="pl-k">define</span> <span class="pl-en">OLED_SCROLL_TIMEOUT</span> <span class="pl-c1">0</span>
#<span class="pl-k">define</span> <span class="pl-en">ENCODER_RESOLUTION</span> <span class="pl-c1">2</span>
<span class="pl-c">// Need to propagate oled data to right side</span>
#<span class="pl-k">define</span> <span class="pl-en">SPLIT_TRANSACTION_IDS_USER</span> OLED_DATA_SYNC
</pre></div>
<p>It also exposes some API's which provide curated functionality,
here's an example from the <a href="https://github.com/qmk/qmk_firmware/blob/master/drivers/oled/oled_driver.h">oled driver</a>:</p>
<div class="highlight highlight-c"><pre><span class="pl-c">// Writes a string to the buffer at current cursor position</span>
<span class="pl-c">// Advances the cursor while writing, inverts the pixels if true</span>
<span class="pl-k">void</span> <span class="pl-en">oled_write</span>(<span class="pl-k">const</span> <span class="pl-k">char</span> *data, <span class="pl-k">bool</span> invert);
</pre></div>
<p>Above is an API that allows you to write text to an <code>oled</code> screen, very convenient.</p>
<p>Crucially, <code>QMK</code> does actually ship an OS, in my case <a href="https://chibiforge.org/doc/21.11/full_rm/">chibios</a>,
which is a full-featured <a href="https://en.wikipedia.org/wiki/Real-time_operating_system">RTOS</a>. That OS contains
the drivers for my microcontrollers, and from my custom code, I can interface with
the operating system.</p>
<h2>Keyboards keyboards keyboards</h2>
<p>I have been building keyboards since I started working as a programmer,
there is much that can be said about them, but not a lot of is particularly interesting, I'll give a brief
explanation of how they work.</p>
<h3>Keyboard internals</h3>
<p>A keyboard is like a tiny computer that tells the OS (The other one, the one not in the keyboard)
what keys are being pressed.</p>
<p>Here are three arbitrarily chosen important components to a keyboard:</p>
<ol>
<li>The <a href="https://en.wikipedia.org/wiki/Printed_circuit_board">Printed Circuit Board (PCB)</a>, it's a large
chip that connects all the keyboard components, if you're thinking: "Hey that's a motherboard!", then you
aren't far off. Split keyboards (usually) have two PCBs working in tandem, connected by (usually) an aux cable.</li>
<li>The microcontroller, the actual computer part that you program. It can be integrated directly with the PCB,
or soldered on to it.</li>
<li><a href="https://en.wikipedia.org/wiki/Keyboard_technology#Notable_switch_mechanisms">The switches</a>,
the things that when pressed connects circuits on the PCB, which the microcontroller can see
and interpret as a key being pressed.</li>
</ol>
<h2>Back to the story</h2>
<p>I used an <a href="https://keeb.io/collections/iris-split-ergonomic-keyboard">Iris</a> for years and loved it, but since some pretty impressive microcontrollers that aren't <a href="https://en.wikipedia.org/wiki/AVR_microcontrollers">AVR</a>,
but <a href="https://en.wikipedia.org/wiki/ARM_architecture_family">ARM</a> came out, surpassing the AVR ones in cost-efficiency, memory, and speed, while being compatible,
I felt I needed an upgrade.</p>
<p>A colleague tipped me off about <a href="https://splitkb.com/products/aurora-lily58">lily58</a>, which takes any<a href="https://github.com/sparkfun/Pro_Micro">pro-micro</a>-compatible microcontroller,
so I bought it. Alongside a couple of <a href="https://www.raspberrypi.com/documentation/microcontrollers/rp2040.html">RP2040</a>-based microcontrollers.</p>
<h3>RP2040 and custom microcontrollers</h3>
<p>Another slight derailment, the RP2040 microcontroller is a microcontroller with an
<a href="https://developer.arm.com/Processors/Cortex-M0-Plus">Arm-cortex-m0+ cpu</a>. Keyboard-makers take this kind
of microcontroller, and customize them to fit keyboards, since pro-micro microcontrollers have influenced a lot
of the keyboard PCBs, many new microcontroller designs fit onto a PCB the same way that a pro-micro does. Meaning,
often times you can use many combinations of microcontrollers, with many combinations of PCBs.</p>
<p>The arm-cortex-m0+ cpu is pretty fast, cheap, and has two cores, TWO CORES, why would someone even need that?
If there are two cores on there, then they should both definitely be used, however.</p>
<h2>Back to the story, pt2</h2>
<p>I was finishing up my keyboard and realized that <code>oled</code>-rendering is by default set to 50ms, to not impact
matrix scan rate. (The matrix scan rate is when the microcontroller checks the PCB for what keys are being held down,
if it takes too long it may impact the core functionality of key-pressing and releasing being registered correctly).</p>
<p>Now I found the purpose of multicore, if rendering to the oled takes time,
then that job could (and therefore should) be shoveled onto a
different thread, my keyboard has 2 cores, I should parallelize this by using a thread!</p>
<h2>Chibios and threading</h2>
<p>Chibios is very well documented, it even
<a href="https://chibiforge.org/doc/21.11/full_rm/group__threads.html">has a section on threading</a>, and it even has a
convenience function for
<a href="https://chibiforge.org/doc/21.11/full_rm/group__threads.html#gabf1ded9244472b99cef4dfa54caecec4">spawning a static thread</a>.</p>
<p>It can be used like this:</p>
<div class="highlight highlight-c"><pre><span class="pl-k">static</span> <span class="pl-en">THD_WORKING_AREA</span>(my_thread_area, <span class="pl-c1">512</span>);
<span class="pl-k">static</span> <span class="pl-en">THD_FUNCTION</span>(my_thread_fn, arg) {
    <span class="pl-c">// Cool function body</span>
}
<span class="pl-k">void</span> <span class="pl-en">start_worker</span>(<span class="pl-k">void</span>) {
    <span class="pl-c1">thread_t</span> *thread_ptr = <span class="pl-c1">chThdCreateStatic</span>(my_thread_area, <span class="pl-c1">512</span>, NORMALPRIO, my_thread_fn, <span class="pl-c1">NULL</span>);
}
</pre></div>
<p>Since my CPU has two cores, if I spawn a thread, work will be parallelized, I thought, so I went for it. (This is
foreshadowing).</p>
<p>After wrangling some <a href="https://chibiforge.org/doc/21.11/full_rm/group__mutexes.html">mutex locks</a>, and messing
with the firmware to remove race conditions, I had a multithreaded implementation that could offload rendering
to the <code>oled</code> display on a separate thread, great! Now why is performance so bad?</p>
<h2>Multithread != Multicore, an RTOS is not the same as a desktop OS</h2>
<p>When I printed the core-id of the thread rendering to the <code>oled</code>-display, it was <code>0</code>. I wasn't
actually using the extra core which would have core-id <code>1</code>.</p>
<p>The assumption that: If I have two cores and I have two threads, the two threads should be running
or at least be available to accept tasks almost 100% of the time, does not hold here.
It would hold up better on a regular OS like <code>Linux</code>, but on <code>Chibios</code> it's a bit more explicit.</p>
<p><strong>Note:</strong>
Disregarding that <code>Chibios</code> spawns both a main-thread, and an idle-thread (on the same core) by default, so it's not just one,
although that's not particularly important to performance.</p>
<h3>I have two cores, I just have to enable Symmetric multiprocessing</h3>
<p>I know I have two cores, I'll just have to enable <a href="https://en.wikipedia.org/wiki/Symmetric_multiprocessing">SMP</a>.
Symmetric multiprocessing means that the processor can actually
do things in parallel, it's not enabled by default. Chibios has some <a href="https://www.chibios.org/dokuwiki/doku.php?id=chibios:articles:smp_rt7">documentation on this</a>.</p>
<p>But this time, it wasn't enough. Enabling SMP, is not trivial as it turns out, it needs a config flag for chibios,
a makeflag when building for the platform (rp2040), and some other fixing.
So I had to mess with the firmware once more,
but checking some flags in the code, and some internal structures, I can see that <code>Chibios</code> is now compiled
ready to use SMP, it even has a reference that I can use to my other core's context <code>&#x26;ch1</code> (<code>&#x26;ch0</code> is core 0).</p>
<p>On <code>Linux</code> multicore and multithreading is opaque, you spawn a thread, it runs on some core (also assuming that
SMP is enabled, but it generally is for servers and desktops). On Chibios, if you
spawn a thread, it runs on the core that spawned it by default.<br>
Back to the docs, I see that I can instead create a thread from a <a href="https://chibiforge.org/doc/21.11/full_rm/group__threads.html#gad51eb52a2e308ba1cb6e5cd8a337817e">thread descriptor</a>,
which takes a reference to the instance-context, <code>&#x26;ch1</code>, perfect, now I'll spawn a thread on the other core, happily ever
after.</p>
<p><strong>WRONG!</strong></p>
<p>It still draws from core-0 on the oled.</p>
<p>Checking the chibios source code, I see that it falls back to <code>&#x26;ch0</code> if <code>&#x26;ch1</code> is null, now why is it null?</p>
<h3>Main 2, a single main function is for suckers</h3>
<p>Browsing through the chibios repo I find <a href="https://github.com/ChibiOS/ChibiOS/blob/master/demos/RP/RT-RP2040-PICO/c1_main.c">the next piece of the puzzle</a>,
a demo someone made of SMP on the RP2040, it needs a separate main function where the instance context (<code>&#x26;ch1</code>)
for the new core is initialized. I write some shim-code, struggle with some more configuration, and finally,
core 1 is doing the <code>oled</code> work.</p>
<p>Performance is magical, it's all worth in it the end.</p>
<h2>Conclusion</h2>
<p>My keyboard now runs multicore and I've offloaded all non-trivial
work to core 1 so that core 0 can do the time-sensitive matrix scanning,
and I can draw as much and often as I want to the oled display.</p>
<p>I had to mess a bit with the firmware to specify that there is an extra
core on the RP2040, and to keep <code>QMK</code>s hands off of oled state, since
that code isn't thread-safe.</p>
<p>The code is in my fork <a href="https://github.com/MarcusGrass/qmk_firmware/tree/mg/lily58">here</a>,
with commits labeled <code>[FIRMWARE]</code> being the ones messing with the firmware.</p>
<p>The keyboard-specific code is contained
<a href="https://github.com/MarcusGrass/qmk_firmware/tree/mg/lily58/keyboards/splitkb/aurora/lily58/keymaps/gramar">here</a>,
on the same branch.</p>
<p>I hope this was interesting to someone!</p>
</div>`;
const META_HTML = String.raw`<div class="markdown-body"><h1>Writing these pages</h1>
<p>I did a number of rewrites of this web application, some of which could probably be
found in the repository's history.<br>
The goal has changed over time, but as with all things I wanted to create something that's as small as possible,
and as fast as possible, taken to a ridiculous and counterproductive extent.</p>
<h2>Rust for frontend</h2>
<p>Rust can target <a href="https://en.wikipedia.org/wiki/WebAssembly">WebAssembly</a> through its target
<code>wasm32-unknown-unknown</code>, which can then be run on the web. Whether this is a good idea or not remains to be seen.</p>
<p>I've been working with <code>Rust</code> for a while now, even written code targeting <code>wasm</code>, but hadn't yet written anything
to be served through a browser using <code>Rust</code>.</p>
<p>After thinking that I should start writing things down more, I decided to make a blog to collect my thoughts.<br>
Since I'm a disaster at front-end styling I decided that if I could get something to format markdown, that's good
enough.<br>
I could have just kept them as <code>.md</code> files in a git-repo, and that would have been the reasonable thing to do,
but the concept of a dedicated page for it spoke to me, with GitHub's free hosting I started looking for alternatives
for a web framework.</p>
<h2>SPA</h2>
<p>An SPA (<a href="https://en.wikipedia.org/wiki/Single-page_application">Single Page Application</a>), is a web application where
the user doesn't have to follow a link and load a new page from the server to navigate to different pages of the
application. It dynamically injects html based on path. This saves the user an http round trip when switching
pages within the application, causing the application to feel more responsive.</p>
<p>I've worked with SPAs a bit in the past with the <a href="https://angular.io/">Angular</a> framework, and I wanted to see if I
could implement an SPA using Rust.</p>
<h2>Yew</h2>
<p>I didn't search for long before finding <a href="https://yew.rs/">yew</a>, it's a framework for developing front-end applications
in <code>Rust</code>. It looked pretty good so I started up.</p>
<p>I like how <code>Yew</code> does things, you construct <code>Components</code> that pass messages and react to them, changing their state
and maybe causing a rerender.
Although, I have a personal beef with <code>macros</code> and especially since <code>0.20</code> <code>Yew</code> uses them a lot,
but we'll get back to that.</p>
<p>My first shot was using <a href="https://github.com/raphlinus/pulldown-cmark">pulldown-cmark</a> directly from the <code>Component</code>.<br>
I included the <code>.md</code>-files as <code>include_str!(...)</code> and then converted those to html within the component at view-time.</p>
<h3>How the page worked</h3>
<p>The page output is built using <a href="https://trunkrs.dev/">Trunk</a> a <code>wasm</code> web application bundler.</p>
<p><code>trunk</code> takes my wasm and assets, generates some glue javascript to serve it, and moves it into a <code>dist</code> directory along
with my <code>index.html</code>. From the <code>dist</code> directory, the web application can be loaded.</p>
<p>The code had included my <code>.md</code>-files in the binary, a <code>const String</code> inserted into the <code>wasm</code>. When a
page was to be loaded through navigation, my <code>component</code> checked the path of the <code>url</code>, if for example it was
<code>/</code> it would select the hardcoded string from the markdown of <code>Home.md</code>, convert that to <code>html</code> and then inject
that html into the page.</p>
<h3>Convert at compile time</h3>
<p>While not necessarily problematic, this seemed unnecessary, since the <code>.md</code>-content doesn't change and is just
going to be converted, I might as well only do that once.
The alternatives for that is at compile time or at application load time, opposed to what I was currently doing,
which I guess would be called <code>render time</code> or <code>view-time</code> (in other words, every time content was to be injected).</p>
<p>I decided to make build-scripts which takes my <code>.md</code>-pages, and converts them to <code>html</code>, then my application
could load that <code>const String</code> instead of the old one, skipping the conversion step and the added binary dependency of
<a href="https://github.com/raphlinus/pulldown-cmark">pulldown-cmark</a>.</p>
<p>It was fairly easily done, and now the loading was (theoretically) faster.</p>
<h3>Styling</h3>
<p>I wanted my markdown to look nice, the default markdown-to-html conversion rightfully doesn't apply any styling.
As someone who is artistically challenged I needed to find some off-the-shelf styling to apply.</p>
<p>I thought GitHub's <code>css</code> for their markdown rendering looks nice and wondered if I could find the source for it,
after just a bit of searching I found <a href="https://github.com/sindresorhus/github-markdown-css">github-markdown-css</a>, where
a generator for that <code>css</code>, as well as already generated copies of it. I added that too my page.</p>
<h3>Code highlighting</h3>
<p>Code highlighting was difficult, there are a few alternatives for highlighting.<br>
If I understood it correctly, GitHub uses something similar to <a href="https://github.com/wooorm/starry-night">starry-nigth</a>.<br>
Other alternatives are <a href="https://highlightjs.org/">highlight.js</a> and <a href="https://prismjs.com/">Prism</a>.<br>
After a brief look, <code>highlight.js</code> seemed easy to work with, and produces some nice styling, I went with that.</p>
<p>The easiest way of implementing <code>highlight.js</code> (or <code>prism.js</code>, they work essentially the same), is to load a<br>
<code>&#x3C;script src="highlight.js">&#x3C;/script></code> at the bottom of the page body. Loading the script calls the
<code>highlightAll()</code> function, which takes code elements and highlights them.<br>
This turned out to not be that easy the way I was doing things.<br>
Since I was rendering the body dynamically, previously highlighted elements would be de-highlighted on navigation,
since the <code>highlightAll()</code> function had already been called. While I'm sure that you can call js-functions from <code>Yew</code>,
finding how to do that in the documentation is difficult. Knowing when the call them is difficult as well,
as many comprehensive frameworks, they work as black boxes sometimes. While it's easy to look at page-html with
<code>javascript</code> and understand what's happening and when, it's difficult to view corresponding <code>Rust</code> code and know when
an extern <code>javascript</code> function would be called, if I could figure out how to insert such a call in the <code>component</code>.<br>
I settled for not having highlighting and continued building.</p>
<h3>Navigation</h3>
<p>I wanted a nav-bar, some <a href="https://en.wikipedia.org/wiki/Hamburger_button">hamburger menu</a> which would unfold and
give the user access to navigation around the page. Constructing that with my knowledge of css was a disaster.<br>
It never scaled well, it was difficult putting it in the correct place, and eventually I just gave up
and created a navigation page <code>.md</code>-style, like all other pages in the application.<br>
I kept a menu button for going back to home, or to the navigation page, depending on the current page.</p>
<p>An issue with this is that links in an <code>.md</code>-file, when converted to <code>html</code>, become regular <code>&#x3C;a href=".."</code> links,
which will cause a new page-load. My internal navigation was done using <code>Yew</code> callbacks, swapping out
page content on navigation, that meant I'd have to replace those <code>href</code> links with <code>Yew</code> templating.
I decided to make my build script more complex, instead of serving raw converted <code>html</code>, I would generate small
rust-files which would convert the <code>html</code> into <code>Yew</code>'s <code>html!</code> macro. This was ugly in practice, html that looked like
this</p>
<div class="highlight highlight-text-html-basic"><pre>
&#x3C;<span class="pl-ent">div</span>>
    Content here
&#x3C;/<span class="pl-ent">div</span>>
</pre></div>
<p>Would have to be converted to this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-en">yew</span><span class="pl-k">::</span><span class="pl-en">html!</span> {
    &#x3C;<span class="pl-smi">div</span>>
        {{<span class="pl-s"><span class="pl-pds">"</span>Content here<span class="pl-pds">"</span></span>}}
    &#x3C;<span class="pl-k">/</span><span class="pl-smi">div</span>>
}
</pre></div>
<p>Any raw string had to be double bracketed then quoted.<br>
Additionally, to convert to links, raw <code>html</code> that looked like this:</p>
<div class="highlight highlight-text-html-basic"><pre>&#x3C;<span class="pl-ent">a</span> <span class="pl-e">href</span>=<span class="pl-s"><span class="pl-pds">"</span>/test<span class="pl-pds">"</span></span>>Test!&#x3C;/<span class="pl-ent">a</span>>
</pre></div>
<p>Would have to be converted to this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-en">yew</span><span class="pl-k">::</span><span class="pl-en">html!</span> {
    &#x3C;<span class="pl-smi">a</span> <span class="pl-smi">onclick</span><span class="pl-k">=</span>{<span class="pl-k">move</span> <span class="pl-k">|</span><span class="pl-smi">_</span><span class="pl-k">|</span> <span class="pl-smi">scope</span><span class="pl-k">.</span>navigator<span class="pl-k">.</span><span class="pl-en">unwrap</span>()<span class="pl-k">.</span><span class="pl-en">replace</span>(<span class="pl-k">&#x26;</span><span class="pl-en">Location</span><span class="pl-k">::</span><span class="pl-en">Test</span>)}><span class="pl-en">Test!</span>&#x3C;<span class="pl-k">/</span><span class="pl-smi">a</span>>
}
</pre></div>
<p>On top of that, the css specifies special styling for <code>&#x3C;a></code> which contains <code>href</code> vs <code>&#x3C;a></code> which doesn't.<br>
That was a fairly easy to change, from this:
<code>.markdown-body a:not([href])</code> to this <code>.markdown-body a:not([href]):not(.self-link)</code> as well as
adding the class <code>self-link</code> to the links that were replaced.<br>
Some complexity was left out, such as the <code>scope</code> being moved into the function, so I had to generate a bunch of
<code>scope_n</code> at the top of the generated function from which the <code>html</code> was returned.</p>
<p>In the end it worked, an internal link was replaced by a navigation call, and navigation worked from my <code>.md</code>
navigation page.</p>
<p>The page was exactly how I wanted.</p>
<h3>Yew page retrospective</h3>
<p>Looking at only the <code>wasm</code> for this fairly minimal page, it was more than <code>400K</code>. To make the page work
I had to build a complex build script that generated <code>Rust</code> code that was valid with the <code>Yew</code> framework.<br>
And to be honest, since bumping <code>Yew</code> from <code>0.19</code> to <code>0.20</code> during this process, seeing a turn towards even heavier
use of macros for functionality. I didn't see this as maintainable even in the medium term.<br>
I had a big slow page which probably wouldn't be maintainable where highlighting was tricky to integrate.</p>
<h2>RIIJS</h2>
<p>I decided to rewrite the page in javascript, or rather generate javascript from a <code>Rust</code> build script and skip
<code>Yew</code> entirely.<br>
It took less than two hours and the size of the application was now <code>68K</code> in total, and much less complex.</p>
<p>The only dependencies now were pulldown-cmark for the build script, I wondered if I could get this to be even smaller.<br>
I found a <code>css</code> and <code>js</code> minifier written in <code>Rust</code>: <a href="https://github.com/GuillaumeGomez/minifier-rs">minifier-rs</a>.</p>
<p>After integrating that, the page was down to <code>60K</code>, about <code>7</code> times smaller than before.<br>
Doing it in <code>javascript</code> also made it easy to apply highlighting again. I went back and had another look, finding
that <code>Prism.js</code> was fairly tiny, integrating that made highlighting work, bringing to page size to a bit over <code>70K</code>.</p>
<p>I wasn't completely content with highlighting being done after the fact on a static page, and if that was to be
off-loaded
I might as well go with the massive <a href="https://github.com/wooorm/starry-night">starry-night</a> library.<br>
Sadly this meant creating a build-dependency on <code>npm</code> and the dependency swarm that that brings. But in the
end my page was equally small as with <code>prism</code>, and doing slightly less work at view-time, with some nice highlighting.</p>
<h2>In defense of Yew</h2>
<p><code>Yew</code> is not a bad framework, and that's not the point of this post. The point is rather the importance of
using the best tool for the job. <code>wasm</code> is not necessarily faster than <code>javascript</code> on the web, and if not doing
heavy operations which can be offloaded to the <code>wasm</code>, the complexity and size of a framework that utilizes it may not
be worth it. This page is just a simple collection of html with some highlighting, anything dynamic on the page
is almost entirely in the scope of <code>DOM</code> manipulation, which <code>wasm</code> just can't handle at the moment.</p>
<h2>CI</h2>
<p>Lastly, I wanted my page to be rebuilt and published in CI, and I wanted to not have to check in the <code>dist</code> folder,
so I created a pretty gnarly <code>bash</code>-script. The complexity isn't the bad part, the bad part is the
chained operations where each is more dangerous than the last.<br>
In essence, it checks out a temporary branch from main, builds a new <code>dist</code>, creates a commit, and then
force pushes that to the <code>gh-pages</code> branch. If this repo's history grows further in the future,
I'll look into making it even more destructive by just compacting the repo's entire history into one commit and
pushing that to that branch. But I don't think that will be necessary.</p>
<h2>Rants on macros and generics</h2>
<p>I like some of the philosophies of <code>Yew</code>, separating things into <code>Components</code> that pass messages. But, seeing
the rapid changes and the increasing use of proc-macros that do the same things as structs and
traits, only more opaquely, makes me fear that web development in <code>Rust</code> will follow the same churn-cycle as
<code>javascript</code>. What I may appreciate most about statically, strongly typed languages is that you know the type
of any given object. Macros and generics dilute this strength, and in my opinion should be used sparingly
when creating libraries, although I realize their respective strength and necessity at times.
I believe that adding macros creates a maintenance trap, and if what you're trying to do can already be
done without macros I think that's a bad decision by the authors.
Macros hide away internals, you don't get to see the objects and functions that you're calling,
if a breaking change occurs, knowing how to fix it can become a lot more difficult as you may have
to re-learn both how the library used to work internally, and the way it currently works, to preserve the old
functionality.<br>
<code>&#x3C;/rant></code></p>
</div>`;
const PGWM03_HTML = String.raw`<div class="markdown-body"><h1>PGWM 0.3, tiny-std, and xcb-parse</h1>
<p>I recently made a substantial rewrite of my (now) pure rust x11 window manager and want to collect my thoughts on it
somewhere.</p>
<h2>X11 and the Linux desktop</h2>
<p>PGWM is an educational experience into Linux desktop environments,
the <a href="https://en.wikipedia.org/wiki/X_Window_System">x11 specification</a>
first came about in 1984 and has for a long time been the only mainstream way for gui-applications on Linux to
show what they need on screen for their users.</p>
<p>When working on desktop applications for Linux, the intricacies of that protocol are mostly hidden by the desktop
frameworks a developer might encounter. In <code>Rust</code>,
the cross-platform library <a href="https://github.com/rust-windowing/winit">winit</a> can be used for this purpose,
and applications written in <code>Rust</code> like the terminal emulator <a href="https://github.com/alacritty/alacritty">Alacritty</a>
uses <code>winit</code>.</p>
<p>At the core of the Linux desktop experience lies the Window Manager, either alone or accompanied by a Desktop
Enviroment (DE). The Window Manager makes decisions on how windows are displayed.</p>
<h3>The concept of a Window</h3>
<p><em>Window</em> is a loose term often used to describe some surface that can be drawn to on screen.<br>
In X11, a window is a <code>u32</code> id that the <code>xorg-server</code> keeps information about. It has properties, such as a height and
width, it can be visible or not visible, and it enables the developer to ask the server to subscribe to events.</p>
<h3>WM inner workings and X11 (no compositor)</h3>
<p>X11 works by starting the <code>xorg-server</code>, the <code>xorg-server</code> takes care of collecting input
from <a href="https://en.wikipedia.org/wiki/Human_interface_device">HIDs</a>
like the keyboard and mouse, collecting information about device state,
such as when a screen is connected or disconnected,
and coordinates messages from running applications including the Window Manager.<br>
This communication goes over a socket, TCP or Unix. The default is <code>/tmp/.X11-unix/X0</code> for a single-display desktop
Linux environment.</p>
<p>The details of the communication are specified in xml files in Xorg's gitlab
repo <a href="https://gitlab.freedesktop.org/xorg/proto/xcbproto/-/tree/master/src">xcbproto</a>.
The repo contains language bindings, xml schemas that specify how an object passed over the socket should be structured
to be recognized by the xorg-server.
The name for the language bindings is XCB for 'X protocol C-language Binding'.<br>
Having this kind of protocol means that a developer who can't or won't directly link to and use the <code>xlib</code> C-library
can instead construct their own representations of those objects and send those over the socket.</p>
<p>In PGWM a <code>Rust</code> language representation of these objects are used, containing serialization and deserialization methods
that turn Rust structs into raw bytes that can be transmitted on the socket.</p>
<p>If launching PGWM through <a href="https://wiki.archlinux.org/title/xinit">xinit</a>, an xorg-server is started at the beginning
of that script, if PGWM is launched inside that script it will try to become that server's Window Manager.</p>
<p>When an application starts within the context of X11, a handshake takes place. The application asks for setup
information from the server, and if the server replies with a success the application can start interfacing
with the server.<br>
In a WM's case, it will request to set the <code>SubstructureRedirectMask</code> on the root X11 window.<br>
Only one application can have that mask on the root window at a given time. Therefore, there can only be one WM active
for a running xorg-server.<br>
If the change is granted, layout change requests will be sent to the WM. From then on the WM can make decisions on the
placements of windows.</p>
<p>When an application wants to be displayed on screen it will send a <code>MapRequest</code>, when the WM gets that request it will
make a decision whether that window will be shown, and its dimensions, and forward that decision to the xorg-server
which is responsible for drawing it on screen. Changing window dimensions works much the same way.</p>
<p>A large part of the trickiness of writing a WM, apart from the plumbing of getting the socket communication right, is
handling focus.<br>
In X11, focus determines which window will receive user input, aside from the WM making the decision of what should
be focused at some given time, some <code>Events</code> will by default trigger focus changes, making careful reading of the
protocol an important part of finding maddening bugs.<br>
What is currently focused can be requested from the xorg-server by any application, and notifications on focus changes
are produced if requested. In PGWM, focus becomes a state that needs to be kept on both the WM's and X11's side to
enable swapping between <code>workspaces</code> and having previous windows re-focused, and has been a constant source of bugs.</p>
<p>Apart from that, the pure WM responsibilities are not that difficult, wait for events, respond by changing focus or
layout, rinse and repeat.
The hard parts of PGWM has been removing all C-library dependencies, and taking optimization to a stupid extent.</p>
<h1>Remove C library dependencies, statically link PGWM 0.2</h1>
<p>I wanted PGWM to be statically linked, small and have no C-library dependencies for 0.2. I had one problem.</p>
<h2>Drawing characters on screen</h2>
<p>At 0.1, PGWM used language bindings to the <a href="https://en.wikipedia.org/wiki/Xft">XFT</a>(X FreeType interface library)
C-library, through the Rust <code>libx11</code> bindings library <a href="https://crates.io/crates/x11">X11</a>. XFT handles font rendering.
It was used to draw characters on the status bar.</p>
<p>XFT provides a fairly nice interface, and comes with the added bonus
of <a href="https://en.wikipedia.org/wiki/Fontconfig">Fontconfig</a> integration.
Maybe you've encountered something like this <code>JetBrainsMono Nerd Font Mono:size=12:antialias=true</code>, it's
an excerpt from my <code>~/.Xresources</code> file and configures the font for Xterm. Xterm uses fontconfig to figure out where
that font is located on my machine. Removing XFT and fontconfig with it, means that fonts have to specified by path,
now this is necessary to find fonts: <code>/usr/share/fonts/JetBrains\ Mono\ Medium\ Nerd\ Font\ Complete\ Mono.ttf</code>, oof.
I still haven't found a non <code>C</code> replacement for finding fonts without specifying an absolute path.</p>
<p>One step in drawing a font is taking the font data and creating a vector of light intensities, this process is called
Rasterization. Rust has a font rasterization library <a href="https://github.com/mooman219/fontdue">fontdue</a>
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
<p>I finally went to look at XFT's code and found that it uses
the <a href="https://gitlab.freedesktop.org/xorg/proto/xcbproto/-/blob/master/src/render.xml">render</a>
extension, an extension that can register byte representations as glyphs, and then draw those glyphs at specified
locations, by glyph-id. This is the sane way to do
it. After implementing that, font rendering was again working, and the performance was good.</p>
<h1>PGWM 0.3 how can I make this smaller and faster?</h1>
<p>I wanted PGWM to be as resource efficient as possible, I decided to dig into the library that I used do serialization
and deserialization of <code>Rust</code> structs that were to go over the socket to the <code>xorg-server</code>.</p>
<p>The library I was using was <a href="https://github.com/psychon/x11rb">X11rb</a> an excellent safe and performant library for doing
just that.
However, I was taking optimization to a ridiculous extent, so I decided to make that library optimized for my specific
use case.</p>
<h2>PGWM runs single threaded</h2>
<p>X11rb can handle multithreading, making the execution path for single threaded applications longer than necessary.<br>
I first rewrote the connection logic from interior mutability (the connection handles synchronization) to exterior
mutability (user handles synchronization, by for example wrapping it in an <code>Arc&#x3C;RwLock&#x3C;Connection>></code>).<br>
This meant a latency decrease of about 5%, which was pretty good. However, it did mean
that <a href="https://en.wikipedia.org/wiki/Resource_acquisition_is_initialization">RAII</a>
no longer applied and the risk of memory leaks went up.
I set the WM to panic on leaks in debug and cleaned them up where I found them to handle that.</p>
<h2>Optimize generated code</h2>
<p>In X11rb, structs were serialized into owned allocated buffers of bytes, which were then sent over the socket.
This means a lot of allocations. Instead, I created a connection which holds an out-buffer, structs are always
serialized directly into it, that buffer is then flushed over the socket. Meaning no allocations are necessary during
serialization.</p>
<p>The main drawback of that method is management of that buffer. If it's growable then the largest unflushed batch
will take up memory for the WM's runtime, or shrink-logic needs to be inserted after each flush.
If the buffer isn't growable, some messages might not fit depending on how the
buffer is proportioned. It's pretty painful in edge-cases. I chose to have a fixed-size buffer of 64kb.</p>
<p>At this point I realized that the code generation was hard to understand and needed a lot of changes to support my
needs. Additionally, making my WM <code>no_std</code> and removing all traces of <code>libc</code> was starting to look achievable.</p>
<h3>Extreme yak-shaving, generate XCB from scratch</h3>
<p>This was by far the dumbest part of the process, reworking the entire library to support <code>no_std</code> and generate the
structures and code from scratch. From probing the Wayland specification I had written a very basic <code>Rust</code> code
generation library <a href="https://github.com/MarcusGrass/codegen-rs">codegen-rs</a>, I decided to use that for code generation.</p>
<p>After a few weeks I had managed to write a parser for the <code>xproto.xsd</code>, a parser for the actual protocol files, and a
code generator that I could work with.<br>
A few more weeks followed and I had finally generated a <code>no_std</code> fairly optimized library for interfacing with <code>X11</code>
over socket, mostly by looking at how x11rb does it.</p>
<h3>Extreme yak-shaving, pt 2, no libc allowed</h3>
<p>In <code>Rust</code>, <code>libc</code> is the most common way that the standard library interfaces with the OS, with some direct
<a href="https://en.wikipedia.org/wiki/System_call">syscalls</a> where necessary.
There are many good reasons for using <code>libc</code>, even when not building cross-platform/cross-architecture libraries,
I wanted something pure <code>Rust</code>, so that went out the window.</p>
<h4>Libc</h4>
<p><code>libc</code> does a vast amount of things, on Linux there are two implementations that dominate, <code>glibc</code> and <code>musl</code>.
I won't go into the details of the differences between them, but simplified, they are C-libraries that make your C-code
run as you expect on Linux.<br>
As libraries they expose methods to interface with the OS, for example reading or writing to a file,
or connecting to a socket.<br>
Some functions are essentially just a proxies for <code>syscalls</code> but some do more things behind the scenes, like
synchronization of shared application resources such as access to the environment pointer.</p>
<h3>Removing the std-library functions and replacing them with syscalls</h3>
<p>I decided to set PGWM to <code>!#[no_std]</code> and see what compiled. Many things in <code>std::*</code> are just re-exports from <code>core::*</code>
and were easily replaced. For other things like talking to a socket I used raw <code>syscalls</code> through the
excellent <a href="https://github.com/japaric/syscall.rs">syscall crate</a>
and some glue-code to approximate what <code>libc</code> does. It was a bit messy,
but not too much work replacing it, PGWM is now 100% not cross-platform, although it wasn't really before either...</p>
<h3>No allocator</h3>
<p>Since the standard library provides the allocator I had to find a new one, I decided to
use <a href="https://github.com/alexcrichton/dlmalloc-rs">dlmalloc</a>,
it works <code>no_std</code>, it was a fairly simple change.</p>
<h3>Still libc</h3>
<p>I look into my crate graph and see that quite a few dependencies still pull in libc:</p>
<ol>
<li><a href="https://github.com/time-rs/time">time.rs</a></li>
<li><a href="https://github.com/toml-rs/toml-rs">toml.rs</a></li>
<li><a href="https://github.com/alexcrichton/dlmalloc-rs">dlmalloc-rs</a></li>
<li><a href="https://github.com/notflan/smallmap">smallmap</a></li>
</ol>
<p>I got to work forking these libraries and replacing libc with direct syscalls.<br>
<code>time</code> was easy, just some <code>Cargo.toml</code> magic that could easily be upstreamed.<br>
<code>toml</code> was a bit trickier, the solution was ugly and I decided not to upstream it.<br>
<code>dlmalloc-rs</code> was even harder, it used the pthread-api to make the allocator synchronize, and implementing that
was beyond even my yak-shaving. Since PGWM is single threaded anyway I left it as-is and <code>unsafe impl</code>'d
<code>Send</code> and <code>Sync</code>.<br>
<code>smallmap</code> fairly simple, upstreaming in progress.</p>
<h3>The ghost of libc, time for nightly</h3>
<p>With no traces of <code>libc</code> I try to compile the WM. It can't start, it doesn't know how to start.<br>
The reason is that <code>libc</code> provides the application's entrypoint <code>_start</code>, without linking <code>libc</code> <code>Rust</code> doesn't
know how to create an entrypoint.<br>
As always the amazing <a href="https://fasterthanli.me/series/making-our-own-executable-packer/part-12">fasterthanli.me</a> has
a write-up about how to get around that issue. The solution required nightly and some assembly.<br>
Now the application won't compile, but for a different reason, I have no global alloc error handler.<br>
When running a <code>no_std</code> binary with an allocator, <code>Rust</code> needs to know what to do if allocation fails, but there is
at present no way to provide it with a way without another nightly feature
<a href="https://github.com/rust-lang/rust/pull/102318">default_global_alloc_handler</a> which looks like it's about to be
stabilized soon (TM).<br>
Now the WM works, <code>no_std</code> no <code>libc</code>, life is good.</p>
<h2>Tiny-std</h2>
<p>I was looking at terminal emulator performance. Many new terminal emulators seem to
have <a href="https://www.reddit.com/r/linux/comments/jc9ipw/why_do_all_newer_terminal_emulators_have_such_bad/">very poor input performance</a>
.
I had noticed this one of the many times PGWM crashed and sent me back to the cold hard tty, a comforting
speed. <code>alacritty</code> is noticeably sluggish at rendering keyboard input to the screen,
I went back to <code>xterm</code>, but now that PGWM worked I was toying with the idea to write a fast, small,
terminal emulator in pure rust.<br>
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
Never mind the third time that happens.<br>
I'm unsure of the best way to handle this, perhaps by doing some libgen straight from the kernel source, but we'll see.</p>
<h3>Start, what's this on my stack?</h3>
<p>I wanted to be able to get arguments and preferably environment variables
into <code>tiny-std</code>. <a href="https://fasterthanli.me/series/making-our-own-executable-packer/part-12">Fasterthanli.me</a>
helped with the args, but for the rest I had to go to the <a href="https://git.musl-libc.org/cgit/musl">musl source</a>.<br>
When an application starts on Linux, the first 8 bytes of the stack contains <code>argc</code>, the number of input arguments.
Following that are the null-terminated strings of the arguments (<code>argv</code>), then a null pointer,
then comes a pointer to the environment variables.<br>
<code>musl</code> then puts that pointer into a global mutable variable, and that's the environment.<br>
I buckle under and do the same, I see a world where arguments and environment are passed to main, and it's the
application's job, not the library, to decide to handle it in a thread-safe way
(although you can use <code>env_p</code> as an argument to <code>main</code> in <code>C</code>).<br>
Being no better than my predecessors, I store the environment pointer in a static variable, things like spawning
processes becomes a lot more simple that way, <code>C</code> owns the world, we just live in it.</p>
<h3>vDSO (virtual dynamic shared object), what there's more on the stack?</h3>
<p>Through some coincidence when trying to make sure all the processes that I spawn don't become zombies I encounter
the <a href="https://en.wikipedia.org/wiki/VDSO">vDSO</a>.<br>
<code>ldd</code> has whispered the words, but I never looked it up.</p>
<div class="highlight highlight-shell"><pre>[gramar@grarch marcusgrass.github.io]$ ldd <span class="pl-s"><span class="pl-pds">$(</span>which cat<span class="pl-pds">)</span></span>
        linux-vdso.so.1 (0x00007ffc0f59c000)
        libc.so.6 =<span class="pl-k">></span> /usr/lib/libc.so.6 (0x00007ff14e93d000)
        /lib64/ld-linux-x86-64.so.2 =<span class="pl-k">></span> /usr/lib64/ld-linux-x86-64.so.2 (0x00007ff14eb4f000)
</pre></div>
<p>It turns out to be a shared library between the Linux kernel and a running program, mapped into that program's memory.<br>
When I read that it provides faster ways to interface with the kernel I immediately stopped reading and started
implementing, I could smell the nanoseconds.</p>
<h4>Aux values</h4>
<p>To find out where the VDSO is mapped into memory for an application, the application needs to inspect the
<a href="https://man7.org/linux/man-pages/man3/getauxval.3.html">AUX values</a> at runtime.
After the environment variable pointer comes another null pointer, following that are the <code>AUX</code> values.
The <code>AUX</code> values are key-value(like) pairs of information sent to the process.
Among them are 16 random bytes, the <code>pid</code> of the process, the <code>gid</code>, and about two dozen more entries of
possibly useful values.<br>
I write some more code into the entrypoint to save these values.</p>
<h3>A memory mapped elf-file</h3>
<p>Among the aux-values is <code>AT_SYSINFO_EHDR</code>, a pointer to the start of the <code>vDSO</code> which is a full
<a href="https://en.wikipedia.org/wiki/Executable_and_Linkable_Format">ELF-file</a> mapped into the process' memory.<br>
I know that in this file is a function pointer for the <code>clock_gettime</code> function through the
<a href="https://man7.org/linux/man-pages/man7/vdso.7.html">Linux vDSO docs</a>. I had benchmarked <code>tiny-std</code>'s
<code>Instant::now()</code> vs the standard library's, and found it to be almost seven times slower.
I needed to find this function pointer.</p>
<p>After reading more Linux documentation, and ELF-documentation, and Linux-ELF-documentation,
I managed to write some code that parses the ELF-file to find the address of the function.
Of course that goes into another global variable, you know, <code>C</code>-world and all that.</p>
<p>I created a feature that does the vDSO parsing, and if <code>clock_gettime</code> is found, uses that instead of the syscall.
This increased the performance if <code>Instant::now()</code> from <code>~std * 7</code> to <code>&#x3C; std * 0.9</code>. In other words, it now outperforms
standard by taking around 12% less time to get the current time from the system.</p>
<h1>Conclusion</h1>
<p>I do a lot of strange yak-shaving, mostly for my own learning, I hope that this write-up might have given you something
too.<br>
The experience of taking PGWM to <code>no_std</code> and no <code>libc</code> has been incredibly rewarding, although I think PGWM is mostly
the same, a bit more efficient, a bit less stable.<br>
I'll keep working out the bugs and API och <code>tiny-std</code>, plans to do a minimal terminal emulator are still in the back of
my mind, we'll see if I can find the time.</p>
</div>`;
const PGWM04_HTML = String.raw`<div class="markdown-body"><h1>PGWM 0.4, io-uring, stability, and static pie linking</h1>
<p>A while back I decided to look into io-uring for an event-loop for
<a href="https://github.com/MarcusGrass/pgwm">pgwm</a>, I should have written
about it when I implemented it, but couldn't find the time then.</p>
<p>Now that I finally got <a href="https://github.com/MarcusGrass/pgwm">pgwm</a> to compile
using the stable toolchain, I'm going to write a bit about the way there.</p>
<h2>Io-uring</h2>
<p><a href="https://en.wikipedia.org/wiki/Io_uring">Io-uring</a> is a linux syscall interface
that allows you to submit io-tasks, and later collect the results of those tasks.
It does so by providing two ring buffers, one for submissions, and one for completions.</p>
<p>In the simplest possible terms, you put some tasks on one queue, and later collect them on some other
queue. In practice, it's a lot less simple than that.</p>
<p>As I've written about in previous entries on this website, I decided to scrap the std-lib and <code>libc</code>, and write
my own syscall interface in <a href="https://github.com/MarcusGrass/tiny-std">tiny-std</a>.<br>
Therefore I had to look into the gritty details of how to set up these buffers, you can see those details
<a href="https://github.com/MarcusGrass/tiny-std/blob/e48179de9f11e687e5f523bb2f271b7c3bb71175/rusl/src/io_uring.rs">here</a>.
Or, look at the c-implementation which I ripped off <a href="https://github.com/axboe/liburing">here</a>.</p>
<h3>Why io-uring?</h3>
<p>I've written before about my x11-wm <a href="https://github.com/MarcusGrass/pgwm">pgwm</a>, but in short:
It's an x11-wm is based on async socket communication where the wm-reacts to incoming messages, like a key-press, and
responds with some set of outgoing messages on that same socket.<br>
When the WM had nothing to do it used the <code>poll</code> interface to await another message.</p>
<p>So the loop could be summed up as:</p>
<pre><code>1. Poll until there's a message on the socket.
2. Read from the socket.
3. Handle the message.
</code></pre>
<p>With io-uring that could be compacted to:</p>
<pre><code>1. Read from the socket when there are bytes available.
2. Handle the message.
</code></pre>
<p>io-uring sounded cool, and this seemed efficient, so off I went.</p>
<h3>Why not io-uring?</h3>
<p>Io-uring is complex, the set-up is complex and there are quite a few considerations that need to be made.
Ring-buffers are set up, how big should they be? What if we get an incoming message pile-up? What if we get an
outgoing message pile-up? When is the best time to flush the buffers? What settings should I put on the uring?</p>
<p>There are more considerations than that, but I didn't really need to tackle most of these issues, since I'm not shipping
a production-ready lib that I'll support indefinitely, I'm just messing around with my WM. I cranked up the buffer
size to more than necessary, and it works fine.</p>
<p>Something that I did consider however, was whether to use <code>SQ-poll</code>, we'll get more into that and what that is.</p>
<h3>Sharing memory with the kernel</h3>
<p>Something that theoretically makes Io-uring more efficient than other io-alternatives is that the ring-buffers
are shared with the kernel. There is no need to make a separate syscall for each sent message, if you put a message
on the buffer, and update its offset through an atomic operation, that will be available for the kernel to use.<br>
But the kernel does need to find out about the submission outside of just the updated state.
There are two ways of doing this:</p>
<ol>
<li>Make a syscall. Write an arbitrary amount of tasks to the submission queue, then tell the kernel about them through
a syscall. That same syscall can be used to wait until there are completions available as well, it's very flexible.</li>
<li>Have the kernel poll the shared memory for changes in the queue-offset and pick tasks up as they're added. Potentially,
this is a large latency-decrease as well as a throughput increase, no more waiting for syscalls!</li>
</ol>
<p>I thought this sounded great, in practice however, <code>SQPoll</code> resulted in a massive cpu-usage increase. I couldn't
tolerate that, so I'll have to save that setting for a different project.
In the end io-uring didn't change much about pgwm.</p>
<h2>Stable</h2>
<p>Since I ripped out <code>libc</code>, pgwm has required nightly to build, this has bothered me quite a bit.
The reason that the nightly compiler was necessary was because of <code>tiny-std</code> using the <code>#[naked]</code> feature to create
the assembly entrypoint (<code>_start</code> function), where the application starts execution.</p>
<h3>Asm to global_asm</h3>
<p>To be able to get <code>aux</code>-values, the <code>environment variable pointer</code>, and the arguments passed to the binary, access to
the stack-pointer at its start-position is required. Therefore, a function that doesn't mess up the stack needs to be
injected, passing that pointer to a normal function that can extract what's necessary.</p>
<p>An example:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">/// Binary entrypoint</span>
#[naked]
#[no_mangle]
#[cfg(all(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>symbols<span class="pl-pds">"</span></span>, feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>start<span class="pl-pds">"</span></span>))]
<span class="pl-k">pub</span> <span class="pl-k">unsafe</span> <span class="pl-k">extern</span> <span class="pl-s"><span class="pl-pds">"</span>C<span class="pl-pds">"</span></span> <span class="pl-k">fn</span> <span class="pl-en">_start</span>() {
<span class="pl-c">    // Naked function making sure that main gets the first stack address as an arg</span>
    #[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>x86_64<span class="pl-pds">"</span></span>)]
    {
        <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">asm!</span>(<span class="pl-s"><span class="pl-pds">"</span>mov rdi, rsp<span class="pl-pds">"</span></span>, <span class="pl-s"><span class="pl-pds">"</span>call __proxy_main<span class="pl-pds">"</span></span>, <span class="pl-en">options</span>(<span class="pl-smi">noreturn</span>))
    }
    #[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>aarch64<span class="pl-pds">"</span></span>)]
    {
        <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">asm!</span>(<span class="pl-s"><span class="pl-pds">"</span>MOV X0, sp<span class="pl-pds">"</span></span>, <span class="pl-s"><span class="pl-pds">"</span>bl __proxy_main<span class="pl-pds">"</span></span>, <span class="pl-en">options</span>(<span class="pl-smi">noreturn</span>))
    }
}
<span class="pl-c">/// Called with a pointer to the top of the stack</span>
#[no_mangle]
#[cfg(all(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>symbols<span class="pl-pds">"</span></span>, feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>start<span class="pl-pds">"</span></span>))]
<span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">__proxy_main</span>(<span class="pl-smi">stack_ptr</span><span class="pl-k">:</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>) {
<span class="pl-c">    // Fist 8 bytes is a u64 with the number of arguments</span>
    <span class="pl-k">let</span> <span class="pl-smi">argc</span> <span class="pl-k">=</span> <span class="pl-k">*</span>(<span class="pl-smi">stack_ptr</span> <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-en">u64</span>);
<span class="pl-c">    // Directly followed by those arguments, bump pointer by 8</span>
    <span class="pl-k">let</span> <span class="pl-smi">argv</span> <span class="pl-k">=</span> <span class="pl-smi">stack_ptr</span><span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-c1">8</span>) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>;
    <span class="pl-k">let</span> <span class="pl-smi">ptr_size</span> <span class="pl-k">=</span> <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">mem</span><span class="pl-k">::</span><span class="pl-en">size_of</span><span class="pl-k">::</span>&#x3C;<span class="pl-en">usize</span>>();
<span class="pl-c">    // Directly followed by a pointer to the environment variables, it's just a null terminated string.</span>
<span class="pl-c">    // This isn't specified in Posix and is not great for portability, but we're targeting Linux so it's fine</span>
    <span class="pl-k">let</span> <span class="pl-smi">env_offset</span> <span class="pl-k">=</span> <span class="pl-c1">8</span> <span class="pl-k">+</span> <span class="pl-smi">argc</span> <span class="pl-k">as</span> <span class="pl-en">usize</span> <span class="pl-k">*</span> <span class="pl-smi">ptr_size</span> <span class="pl-k">+</span> <span class="pl-smi">ptr_size</span>;
<span class="pl-c">    // Bump pointer by combined offset</span>
    <span class="pl-k">let</span> <span class="pl-smi">envp</span> <span class="pl-k">=</span> <span class="pl-smi">stack_ptr</span><span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-smi">env_offset</span>) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>;
    <span class="pl-k">unsafe</span> {
        <span class="pl-c1">ENV</span><span class="pl-k">.</span>arg_c <span class="pl-k">=</span> <span class="pl-smi">argc</span>;
        <span class="pl-c1">ENV</span><span class="pl-k">.</span>arg_v <span class="pl-k">=</span> <span class="pl-smi">argv</span>;
        <span class="pl-c1">ENV</span><span class="pl-k">.</span>env_p <span class="pl-k">=</span> <span class="pl-smi">envp</span>;
    }
    <span class="pl-k">...</span><span class="pl-smi">etc</span>
</pre></div>
<p>I got this from an article by <a href="https://fasterthanli.me/">fasterthanli.me</a>. But later realized that
you can use the <code>global_asm</code>-macro to generate the full function instead:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">// Binary entrypoint</span>
#[cfg(all(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>symbols<span class="pl-pds">"</span></span>, feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>start<span class="pl-pds">"</span></span>, target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>x86_64<span class="pl-pds">"</span></span>))]
<span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">global_asm!</span>(
    <span class="pl-s"><span class="pl-pds">"</span>.text<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>.global _start<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>.type _start,@function<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>_start:<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>mov rdi, rsp<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>call __proxy_main<span class="pl-pds">"</span></span>
);
</pre></div>
<h3>Symbols</h3>
<p>While this means that <code>tiny-std</code> itself could potentially be part of a binary compiled with stable,
if one would like to use for example <code>alloc</code> to have an allocator, then <code>rustc</code> would start emitting symbols
like <code>memcpy</code>. Which rust doesn't provide for some reason.</p>
<p>The solution to the missing symbols is simple enough, these symbols are provided in the external
<a href="https://github.com/rust-lang/compiler-builtins">compiler-builtins</a> library, but that uses a whole host of features
that require nightly. So I copied the implementation (and license), removing dependencies on nightly features, and
exposed the symbols in <code>tiny-std</code>.</p>
<p>Now an application (like pgwm), can be built with the stable toolchain using <code>tiny-std</code>.</p>
<h2>Static</h2>
<p>In my boot-writeup I wrote about creating a minimal <code>rust</code> bootloader. A problem I encountered was that it needed
an interpreter. You can't see it with ldd:</p>
<div class="highlight highlight-shell"><pre>[21:55:04 gramar@grarch marcusgrass.github.io]$ ldd ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
        statically linked
</pre></div>
<p>Ldd lies (or maybe technically not), using <code>file</code>:</p>
<div class="highlight highlight-shell"><pre>file ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=9b54c91e5e84a8d3c90fdb9523f46e09cbf5c6e2, stripped
</pre></div>
<p>Or <code>readelf -S</code>:</p>
<div class="highlight highlight-shell"><pre>
[21:57:21 gramar@grarch marcusgrass.github.io]$ readelf -S ../pgwm/target/x86_64-unknown-linux-gnu/lto/pgwm
There are 18 section headers, starting at offset 0x16a0b0:
Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .interp           PROGBITS         00000000000002a8  000002a8
       000000000000001c  0000000000000000   A       0     0     1
  [ 2] .note.gnu.bu[...] NOTE             00000000000002c4  000002c4
       0000000000000024  0000000000000000   A       0     0     4
  [ 3] .gnu.hash         GNU_HASH         00000000000002e8  000002e8
       000000000000001c  0000000000000000   A       4     0     8
  [ 4] .dynsym           DYNSYM           0000000000000308  00000308
       0000000000000018  0000000000000018   A       5     1     8
  [ 5] .dynstr           STRTAB           0000000000000320  00000320
       0000000000000001  0000000000000000   A       0     0     1
  [ 6] .rela.dyn         RELA             0000000000000328  00000328
       0000000000008310  0000000000000018   A       4     0     8
  [ 7] .text             PROGBITS         0000000000009000  00009000
       000000000013d5a4  0000000000000000  AX       0     0     16
  [ 8] .rodata           PROGBITS         0000000000147000  00147000
       000000000000eb20  0000000000000000   A       0     0     32
  [ 9] .eh_frame_hdr     PROGBITS         0000000000155b20  00155b20
       0000000000001a8c  0000000000000000   A       0     0     4
  [10] .eh_frame         PROGBITS         00000000001575b0  001575b0
       000000000000c1dc  0000000000000000   A       0     0     8
  [11] .gcc_except_table PROGBITS         000000000016378c  0016378c
       000000000000000c  0000000000000000   A       0     0     4
  [12] .data.rel.ro      PROGBITS         0000000000164e28  00163e28
       0000000000006088  0000000000000000  WA       0     0     8
  [13] .dynamic          DYNAMIC          000000000016aeb0  00169eb0
       0000000000000110  0000000000000010  WA       5     0     8
  [14] .got              PROGBITS         000000000016afc0  00169fc0
       0000000000000040  0000000000000008  WA       0     0     8
  [15] .data             PROGBITS         000000000016b000  0016a000
       0000000000000008  0000000000000000  WA       0     0     8
  [16] .bss              NOBITS           000000000016b008  0016a008
       0000000000000458  0000000000000000  WA       0     0     8
  [17] .shstrtab         STRTAB           0000000000000000  0016a008
       00000000000000a8  0000000000000000           0     0     1
</pre></div>
<p>Both <code>file</code> and <code>readelf</code> (<code>.interp</code> section) shows that this binary needs an interpreter, that being
<code>/lib64/ld-linux-x86-64.so.2</code>. If the binary is run in an environment without it, it
will immediately crash.</p>
<p>If compiled statically with <code>RUSTFLAGS='-C target-feature=+crt-static'</code> the application segfaults, oof.</p>
<p>I haven't found out the reason why <code>tiny-std</code> cannot run as a
<a href="https://en.wikipedia.org/wiki/Position-independent_code">position-independent</a> executable,
or I know why, all the addresses to symbols (like static variables) are wrong. What I don't know yet is
how to fix it.</p>
<p>There is a no-code way of fixing it though: <code>RUSTFLAGS='-C target-feature=+crt-static -C relocation-model=static'</code>.<br>
This way the application will be statically linked, without requiring an interpreter, but it will not be
position independent.</p>
<p>If you know how to make that work, please tell me, because figuring that out isn't easy.</p>
<h2>Future plans</h2>
<p>I'm tentatively looking into making threading work, but that is a lot of work and a
lot of segfaults on the way.</p>
</div>`;
const STATICPIE_HTML = String.raw`<div class="markdown-body"><h1>Static pie linking a nolibc Rust binary</h1>
<p>Something has been bugging me for a while with <a href="https://github.com/MarcusGrass/tiny-std">tiny-std</a>,
if I try to compile executables created with them as <code>-C target-feature=+crt-static</code> (statically link the <code>C</code>-runtime),
it segfaults.</p>
<p>The purpose of creating <code>tiny-std</code> was to avoid <code>C</code>, but to get <code>Rust</code> to link a binary statically, that flag needs
to be passed. <code>-C target-feature=+crt-static -C relocation-model=static</code> does produce a valid binary though.
The default relocation-model for static binaries is <code>-C relocation-model=pie</code>,
(at least for the target <code>x86_64-unknown-linux-gnu</code>) so something about <code>PIE</code>-executables created with <code>tiny-std</code> fails,
in this writeup I'll go into the solution for that.</p>
<h2>Static pie linking</h2>
<p>Static pie linking is a combination of two concepts.</p>
<ol>
<li><a href="https://en.wikipedia.org/wiki/Static_library">Static linking</a>, putting everything in the same place at compile time.
As opposed to dynamic linking, where library dependencies can be found and used at runtime.
Statically linking an executable gives it the property that it can be run on any system
that can handle the executable type, i.e. I can start a statically linked elf-executable on any platform that can run
elf-executables. Whereas a dynamically linked executable will not start if its dynamic dependencies cannot be found
at application start.</li>
<li><a href="https://en.wikipedia.org/wiki/Position-independent_code">Position-independent code</a> is able to run properly
regardless of where in memory is placed. The benefit, as I understand it, is security, and platform compatibility-related.</li>
</ol>
<p>When telling <code>rustc</code> to create a static-pie linked executable through <code>-C target-feature=+crt-static -C relocation-model=pie</code>
(relocation-model defaults to pie, could be omitted), it creates an elf-executable which has a header that marks it as
<code>DYN</code>. Here's what an example <code>readelf -h</code> looks like:</p>
<div class="highlight highlight-shell"><pre>ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2<span class="pl-s"><span class="pl-pds">'</span>s complement, little endian</span>
<span class="pl-s">  Version:                           1 (current)</span>
<span class="pl-s">  OS/ABI:                            UNIX - System V</span>
<span class="pl-s">  ABI Version:                       0</span>
<span class="pl-s">  Type:                              DYN (Position-Independent Executable file)</span>
<span class="pl-s">  Machine:                           Advanced Micro Devices X86-64</span>
<span class="pl-s">  Version:                           0x1</span>
<span class="pl-s">  Entry point address:               0x24b8</span>
<span class="pl-s">  Start of program headers:          64 (bytes into file)</span>
<span class="pl-s">  Start of section headers:          1894224 (bytes into file)</span>
<span class="pl-s">  Flags:                             0x0</span>
<span class="pl-s">  Size of this header:               64 (bytes)</span>
<span class="pl-s">  Size of program headers:           56 (bytes)</span>
<span class="pl-s">  Number of program headers:         9</span>
<span class="pl-s">  Size of section headers:           64 (bytes)</span>
<span class="pl-s">  Number of section headers:         32</span>
<span class="pl-s">  Section header string table index: 20</span>
</pre></div>
<p>This signals to the OS that the executable can be run position-independently, but since <code>tiny-std</code> assumes that
memory addresses are absolute, the ones they were when compiled, the executable segfaults as soon as it tries to get
the address of any symbols, like functions or static variables, since those have been moved.</p>
<h2>Where are my symbols?</h2>
<p>This seems like a tricky problem, as a programmer, I have a bunch of variable and function calls, some that the
<code>Rust</code>-language emits for me, now each of the addresses for those variables and functions are in another place in memory.<br>
Before using any of them I need to remap them, which means that I need to have remapping code before using any
function calls (kinda).</p>
<h2>The start function</h2>
<p>The executable enters through the <code>_start</code> function, this is defined in <code>asm</code> for <code>tiny-std</code>:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">// Binary entrypoint</span>
#[cfg(all(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>symbols<span class="pl-pds">"</span></span>, feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>start<span class="pl-pds">"</span></span>, target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>x86_64<span class="pl-pds">"</span></span>))]
<span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">global_asm!</span>(
    <span class="pl-s"><span class="pl-pds">"</span>.text<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>.global _start<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>.type _start,@function<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>_start:<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>xor rbp,rbp<span class="pl-pds">"</span></span>,<span class="pl-c"> // Zero the stack-frame pointer</span>
    <span class="pl-s"><span class="pl-pds">"</span>mov rdi, rsp<span class="pl-pds">"</span></span>,<span class="pl-c"> // Move the stack pointer into rdi, c-calling convention arg 1</span>
    <span class="pl-s"><span class="pl-pds">"</span>.weak _DYNAMIC<span class="pl-pds">"</span></span>,<span class="pl-c"> // Elf dynamic symbol</span>
    <span class="pl-s"><span class="pl-pds">"</span>.hidden _DYNAMIC<span class="pl-pds">"</span></span>,
    <span class="pl-s"><span class="pl-pds">"</span>lea rsi, [rip + _DYNAMIC]<span class="pl-pds">"</span></span>,<span class="pl-c"> // Load the dynamic address off the next instruction to execute incremented by _DYNAMIC into rsi</span>
    <span class="pl-s"><span class="pl-pds">"</span>and rsp,-16<span class="pl-pds">"</span></span>,<span class="pl-c"> // Align the stack pointer</span>
    <span class="pl-s"><span class="pl-pds">"</span>call __proxy_main<span class="pl-pds">"</span></span><span class="pl-c"> // Call our rust start function</span>
);
</pre></div>
<p>The assembly prepares the stack by aligning it, putting the stack pointer into arg1 for the coming function-call,
then adds the offset off <code>_DYNAMIC</code> to the special purpose <code>rip</code>-register address, and puts that in <code>rsi</code> which becomes
our called function's arg 2.</p>
<p>After that <code>__proxy_main</code> is called, the signature looks like this:</p>
<p><code>unsafe extern "C" fn __proxy_main(stack_ptr: *const u8, dynv: *const usize)</code>
It takes the <code>stack_ptr</code> and the <code>dynv</code>-dynamic vector as arguments, which were provided in
the above assembly.</p>
<p>I wrote more about the <code>_start</code>-function in <a class="self-link" onclick=page_navigate("/pgwm03")>pgwm03</a> and <a href="https://fasterthanli.me/series/making-our-own-executable-packer/part-12">fasterthanli.me</a>
wrote more about it at their great blog, but in short:</p>
<p>Before running the user's <code>main</code> some setup is required, like arguments, environment variables, <a href="https://man7.org/linux/man-pages/man3/getauxval.3.html">aux-values</a>,
map in faster functions from the vdso (see <a class="self-link" onclick=page_navigate("/pgwm03")>pgwm03</a> for more on that), and set up some thread-state,
see <a class="self-link" onclick=page_navigate("/threads")>the thread writeup</a> for that.</p>
<p>All these variables come off the executable's stack, which is why stack pointer needs to be passed as an argument to
our setup-function, so that it can be used before the stack is polluted by the setup function.</p>
<p>The first extraction looks like this:</p>
<div class="highlight highlight-rust"><pre>#[no_mangle]
#[cfg(all(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>symbols<span class="pl-pds">"</span></span>, feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>start<span class="pl-pds">"</span></span>))]
<span class="pl-k">unsafe</span> <span class="pl-k">extern</span> <span class="pl-s"><span class="pl-pds">"</span>C<span class="pl-pds">"</span></span> <span class="pl-k">fn</span> <span class="pl-en">__proxy_main</span>(<span class="pl-smi">stack_ptr</span><span class="pl-k">:</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>, <span class="pl-smi">dynv</span><span class="pl-k">:</span> <span class="pl-k">*const</span> <span class="pl-en">usize</span>) {
<span class="pl-c">    // Fist 8 bytes is a u64 with the number of arguments</span>
    <span class="pl-k">let</span> <span class="pl-smi">argc</span> <span class="pl-k">=</span> <span class="pl-k">*</span>(<span class="pl-smi">stack_ptr</span> <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-en">u64</span>);
<span class="pl-c">    // Directly followed by those arguments, bump pointer by 8 bytes</span>
    <span class="pl-k">let</span> <span class="pl-smi">argv</span> <span class="pl-k">=</span> <span class="pl-smi">stack_ptr</span><span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-c1">8</span>) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>;
    <span class="pl-k">let</span> <span class="pl-smi">ptr_size</span> <span class="pl-k">=</span> <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">mem</span><span class="pl-k">::</span><span class="pl-en">size_of</span><span class="pl-k">::</span>&#x3C;<span class="pl-en">usize</span>>();
<span class="pl-c">    // Directly followed by a pointer to the environment variables, it's just a null terminated string.</span>
<span class="pl-c">    // This isn't specified in Posix and is not great for portability, but this isn't meant to be portable outside of Linux.</span>
    <span class="pl-k">let</span> <span class="pl-smi">env_offset</span> <span class="pl-k">=</span> <span class="pl-c1">8</span> <span class="pl-k">+</span> <span class="pl-smi">argc</span> <span class="pl-k">as</span> <span class="pl-en">usize</span> <span class="pl-k">*</span> <span class="pl-smi">ptr_size</span> <span class="pl-k">+</span> <span class="pl-smi">ptr_size</span>;
<span class="pl-c">    // Bump pointer by combined offset</span>
    <span class="pl-k">let</span> <span class="pl-smi">envp</span> <span class="pl-k">=</span> <span class="pl-smi">stack_ptr</span><span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-smi">env_offset</span>) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-k">*const</span> <span class="pl-en">u8</span>;
    <span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">null_offset</span> <span class="pl-k">=</span> <span class="pl-c1">0</span>;
    <span class="pl-k">loop</span> {
        <span class="pl-k">let</span> <span class="pl-smi">val</span> <span class="pl-k">=</span> <span class="pl-k">*</span>(<span class="pl-smi">envp</span><span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-smi">null_offset</span>));
        <span class="pl-k">if</span> <span class="pl-smi">val</span> <span class="pl-k">as</span> <span class="pl-en">usize</span> <span class="pl-k">==</span> <span class="pl-c1">0</span> {
            <span class="pl-k">break</span>;
        }
        <span class="pl-smi">null_offset</span> <span class="pl-k">+=</span> <span class="pl-c1">1</span>;
    }
<span class="pl-c">    // We now know how long the envp is</span>
<span class="pl-c">    // ... </span>
}
</pre></div>
<p>This works all the same as a <code>pie</code> because:</p>
<h2>Prelude, inline</h2>
<p>There will be trouble when trying to find a symbol contained in the binary, such as a function call.<br>
Up to here, that hasn't been a problem because even though <code>ptr::add()</code> and <code>core::mem:size_of::&#x3C;T>()</code> is invoked,
no addresses are needed for those. This is because of inlining.</p>
<p>Looking at <code>core::mem::size_of&#x3C;T>()</code>:</p>
<div class="highlight highlight-rust"><pre>#[inline(always)]
#[must_use]
#[stable(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>rust1<span class="pl-pds">"</span></span>, since <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>1.0.0<span class="pl-pds">"</span></span>)]
#[rustc_promotable]
#[rustc_const_stable(feature <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>const_mem_size_of<span class="pl-pds">"</span></span>, since <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>1.24.0<span class="pl-pds">"</span></span>)]
#[cfg_attr(not(test), rustc_diagnostic_item <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>mem_size_of<span class="pl-pds">"</span></span>)]
<span class="pl-k">pub</span> <span class="pl-k">const</span> <span class="pl-k">fn</span> <span class="pl-en">size_of</span>&#x3C;<span class="pl-en">T</span>>() <span class="pl-k">-></span> <span class="pl-en">usize</span> {
    <span class="pl-en">intrinsics</span><span class="pl-k">::</span><span class="pl-en">size_of</span><span class="pl-k">::</span>&#x3C;<span class="pl-en">T</span>>()
}
</pre></div>
<p>It has the <code>#[inline(always)]</code> attribute, the same goes for <code>ptr::add()</code>. Since that code is inlined,
an address to a function isn't necessary, and therefore it works even though all of the addresses are off.</p>
<p>To be able to debug, I would like to be able to print variables, since I haven't been able to hook a debugger up
to <code>tiny-std</code> executables yet. But, printing to the terminal requires code, code that usually isn't <code>#[inline(always)]</code>.</p>
<p>So I wrote a small print:</p>
<div class="highlight highlight-rust"><pre>#[inline(always)]
<span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">print_labeled</span>(<span class="pl-smi">msg</span><span class="pl-k">:</span> <span class="pl-k">&#x26;</span>[<span class="pl-en">u8</span>], <span class="pl-smi">val</span><span class="pl-k">:</span> <span class="pl-en">usize</span>) {
    <span class="pl-en">print_label</span>(<span class="pl-smi">msg</span>);
    <span class="pl-en">print_val</span>(<span class="pl-smi">val</span>);
}
#[inline(always)]
<span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">print_label</span>(<span class="pl-smi">msg</span><span class="pl-k">:</span> <span class="pl-k">&#x26;</span>[<span class="pl-en">u8</span>]) {
    <span class="pl-en">syscall!</span>(<span class="pl-c1">WRITE</span>, <span class="pl-c1">1</span>, <span class="pl-smi">msg</span><span class="pl-k">.</span><span class="pl-en">as_ptr</span>(), <span class="pl-smi">msg</span><span class="pl-k">.</span><span class="pl-en">len</span>());
}
#[inline(always)]
<span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">print_val</span>(<span class="pl-smi">u</span><span class="pl-k">:</span> <span class="pl-en">usize</span>) {
    <span class="pl-en">syscall!</span>(<span class="pl-c1">WRITE</span>, <span class="pl-c1">1</span>, <span class="pl-en">num_to_digits</span>(<span class="pl-smi">u</span>)<span class="pl-k">.</span><span class="pl-en">as_ptr</span>(), <span class="pl-c1">21</span>);
}
#[inline(always)]
<span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">num_to_digits</span>(<span class="pl-k">mut</span> <span class="pl-smi">u</span><span class="pl-k">:</span> <span class="pl-en">usize</span>) <span class="pl-k">-></span> [<span class="pl-en">u8</span>; <span class="pl-c1">22</span>] {
    <span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">base</span> <span class="pl-k">=</span> <span class="pl-k">*</span><span class="pl-s">b<span class="pl-pds">"</span><span class="pl-cce">\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\n</span><span class="pl-pds">"</span></span>;
    <span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">ind</span> <span class="pl-k">=</span> <span class="pl-smi">base</span><span class="pl-k">.</span><span class="pl-en">len</span>() <span class="pl-k">-</span> <span class="pl-c1">2</span>;
    <span class="pl-k">if</span> <span class="pl-smi">u</span> <span class="pl-k">==</span> <span class="pl-c1">0</span> {
        <span class="pl-smi">base</span>[<span class="pl-smi">ind</span>] <span class="pl-k">=</span> <span class="pl-c1">48</span>;
    }
    <span class="pl-k">while</span> <span class="pl-smi">u</span> <span class="pl-k">></span> <span class="pl-c1">0</span> {
        <span class="pl-k">let</span> <span class="pl-smi">md</span> <span class="pl-k">=</span> <span class="pl-smi">u</span> <span class="pl-k">%</span> <span class="pl-c1">10</span>;
        <span class="pl-smi">base</span>[<span class="pl-smi">ind</span>] <span class="pl-k">=</span> <span class="pl-smi">md</span> <span class="pl-k">as</span> <span class="pl-en">u8</span> <span class="pl-k">+</span> <span class="pl-c1">48</span>;
        <span class="pl-smi">ind</span> <span class="pl-k">-=</span> <span class="pl-c1">1</span>;
        <span class="pl-smi">u</span> <span class="pl-k">=</span> <span class="pl-smi">u</span> <span class="pl-k">/</span> <span class="pl-c1">10</span>;
    }
    <span class="pl-smi">base</span>
}
</pre></div>
<p>Printing to the terminal can be done through the syscall <code>WRITE</code> on <code>fd</code> <code>1</code> (<code>STDOUT</code>).<br>
It takes a buffer of bytes and a length. The call through <code>syscall!()</code> is always inlined.</p>
<p>Since I primarily need look at addresses, I just print <code>usize</code>, and I wrote a beautifully stupid number to digits function.<br>
Since the max digits of a <code>usize</code> on a 64-bit machine is 21, I allocate a slice on the stack filled with
<code>null</code>-bytes, these won't be displayed. Then add digit by digit, which means that the number is formatted without leading or
trailing zeroes.</p>
<p>Invoking it looks like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">test</span>() {
    <span class="pl-en">print_labeled</span>(<span class="pl-s">b<span class="pl-pds">"</span>My msg as bytes: <span class="pl-pds">"</span></span>, <span class="pl-c1">15</span>);
}
</pre></div>
<h2>Relocation</h2>
<p>Now that basic debug-printing is possible work to relocate the addresses can begin.</p>
<p>I previously had written some code the extract <code>aux</code>-values, but now that code needs to run without using any
non-inlined functions or variables.</p>
<h3>Aux values</h3>
<p>A good description of aux-values comes from <a href="https://man7.org/linux/man-pages/man3/getauxval.3.html">the docs here</a>,
in short the kernel puts some data in the memory of a program when it's loaded.<br>
This data points to other data that is needed to do relocation. It also has an insane layout for reasons that
I haven't yet been able to find any motivation for.<br>
A pointer to the aux-values are put after the <code>envp</code> on the stack.</p>
<p>The aux-values were collected and stored pretty sloppily as a global static variable before implementing this change,
this time it needs to be collected onto the stack, used for finding the dynamic relocation addresses,
and then it could be put into a static variable after that (since the address of the static variable can't be found before
remapping).</p>
<p>The <code>dyn</code>-values are also required, which are essentially the same as aux-values, provided for <code>DYN</code>-objects.</p>
<p>In musl, the aux-values that are put on the stack looks like this:</p>
<div class="highlight highlight-c"><pre><span class="pl-c1">size_t</span> i, aux[AUX_CNT], dyn[DYN_CNT];
</pre></div>
<p>So I replicated the aux-vec on the stack like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">// There are 32 aux values.</span>
<span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">aux</span><span class="pl-k">:</span> [<span class="pl-c1">0</span><span class="pl-en">usize</span>; <span class="pl-c1">32</span>];
</pre></div>
<p>And then initialize it, with the <code>aux</code>-pointer provided by the OS.</p>
<p>The OS-supplies some values in the <code>aux</code>-vector <a href="https://man7.org/linux/man-pages/man3/getauxval.3.html">more info here</a>
the necessary ones for remapping are:</p>
<ol>
<li><code>AT_BASE</code> the base address of the program interpreter, 0 if no interpreter (static-pie).</li>
<li><code>AT_PHNUM</code>, the number of program headers.</li>
<li><code>AT_PHENT</code>, the size of one program header entry.</li>
<li><code>AT_PHDR</code>, the address of the program headers in the executable.</li>
</ol>
<p>First a virtual address found at the program header that has the <code>dynamic</code> type must be found.</p>
<p>The program header is laid out in memory as this struct:</p>
<div class="highlight highlight-rust"><pre>#[repr(<span class="pl-en">C</span>)]
#[derive(<span class="pl-en">Debug</span>, <span class="pl-en">Copy</span>, <span class="pl-en">Clone</span>)]
<span class="pl-k">pub</span> <span class="pl-k">struct</span> <span class="pl-smi">elf64_phdr</span> {
    <span class="pl-k">pub</span> <span class="pl-smi">p_type</span><span class="pl-k">:</span> Elf64_Word,
    <span class="pl-k">pub</span> <span class="pl-smi">p_flags</span><span class="pl-k">:</span> Elf64_Word,
    <span class="pl-k">pub</span> <span class="pl-smi">p_offset</span><span class="pl-k">:</span> Elf64_Off,
    <span class="pl-k">pub</span> <span class="pl-smi">p_vaddr</span><span class="pl-k">:</span> Elf64_Addr,
    <span class="pl-k">pub</span> <span class="pl-smi">p_paddr</span><span class="pl-k">:</span> Elf64_Addr,
    <span class="pl-k">pub</span> <span class="pl-smi">p_filesz</span><span class="pl-k">:</span> Elf64_Xword,
    <span class="pl-k">pub</span> <span class="pl-smi">p_memsz</span><span class="pl-k">:</span> Elf64_Xword,
    <span class="pl-k">pub</span> <span class="pl-smi">p_align</span><span class="pl-k">:</span> Elf64_Xword,
}
</pre></div>
<p>The address of the <code>AT_PHDR</code> can be treated as an array declared as:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">let</span> <span class="pl-smi">phdr</span><span class="pl-k">:</span> <span class="pl-k">&#x26;</span>[<span class="pl-smi">elf64_phdr</span>; <span class="pl-c1">AT_PHNUM</span>] <span class="pl-k">=</span> <span class="pl-k">...</span>
</pre></div>
<p>That array can be walked until finding a program header struct with <code>p_type</code> = <code>PT_DYNAMIC</code>,
that program header holds an offset at <code>p_vaddr</code> that can be subtracted from the <code>dynv</code> pointer to get
the correct <code>base</code> address.</p>
<h2>Initialize the dyn section</h2>
<p>The <code>dynv</code> pointer supplied by the os, as previously stated, is analogous to the <code>aux</code>-pointer but
trying to stack allocate its value mappings like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">let</span> <span class="pl-smi">dyn_values</span> <span class="pl-k">=</span> [<span class="pl-c1">0</span><span class="pl-en">usize</span>; <span class="pl-c1">37</span>];
</pre></div>
<p>Will cause a segfault.</p>
<h3>SYMBOLS!!!</h3>
<p>It took me a while to figure out what's happening, a zeroed array is allocated in rust, and
that array is larger than <code>[0usize; 32]</code> (256 bytes of zeroes seems to be the exact breakpoint)
<code>rustc</code> instead of using <code>sse</code> instructions, uses <code>memset</code> to zero the memory it just took off the stack.</p>
<p>The asm will look like this:</p>
<pre><code class="language-asm">        ...
        mov edx, 296
        mov rdi, rbx
        xor esi, esi
        call qword ptr [rip + memset@GOTPCREL]
        ...
</code></pre>
<p>Accessing that memset symbol is what causes the segfault.<br>
I tried a myriad of ways to get the compiler to not emit that symbol, among
<a href="https://users.rust-lang.org/t/reliably-working-around-rust-emitting-memset-when-putting-a-slice-on-the-stack/97080">posting this</a>
help request.</p>
<p>It seems that there is no reliable way to avoid <code>rustc</code> emitting unwanted symbols without doing it all in assembly,
and since that seems a bit much, at least right now, I opted to instead restructure the code. Unpacking both
the aux and dyn values and just keeping what <code>tiny-std</code> needs.<br>
The unpacked aux values now look like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">/// Some selected aux-values, needs to be kept small since they're collected</span>
<span class="pl-c">/// before symbol relocation on static-pie-linked binaries, which means rustc</span>
<span class="pl-c">/// will emit memset on a zeroed allocation of over 256 bytes, which we won't be able</span>
<span class="pl-c">/// to find and thus will result in an immediate segfault on start.</span>
<span class="pl-c">/// See [docs](https://man7.org/linux/man-pages/man3/getauxval.3.html)</span>
#[derive(<span class="pl-en">Debug</span>)]
<span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-k">struct</span> <span class="pl-en">AuxValues</span> {
<span class="pl-c">    /// Base address of the program interpreter</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_base</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Real group id of the main thread</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_gid</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Real user id of the main thread</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_uid</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Address of the executable's program headers</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_phdr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Size of program header entry</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_phent</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Number of program headers</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_phnum</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Address pointing to 16 bytes of a random value</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_random</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Executable should be treated securely</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_secure</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    /// Address of the vdso</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">at_sysinfo_ehdr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
}
</pre></div>
<p>It only contains the aux-values that are actually used by <code>tiny-std</code>.</p>
<p>The dyn-values are only used for relocations so far, so they were packed into this much smaller struct:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-k">struct</span> <span class="pl-en">DynSection</span> {
    <span class="pl-smi">rel</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    <span class="pl-smi">rel_sz</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    <span class="pl-smi">rela</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    <span class="pl-smi">rela_sz</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
}
</pre></div>
<p>Now that <code>rustc</code>'s memset emissions has been sidestepped, the <code>DynSection</code> struct can be filled with the values from the
<code>dynv</code>-pointer, and then finally the symbols can be relocated:</p>
<div class="highlight highlight-rust"><pre>#[inline(always)]
<span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">relocate</span>(<span class="pl-k">&#x26;</span><span class="pl-c1">self</span>, <span class="pl-smi">base_addr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>) {
<span class="pl-c">    // Relocate all rel-entries</span>
    <span class="pl-k">for</span> <span class="pl-smi">i</span> <span class="pl-k">in</span> <span class="pl-c1">0</span><span class="pl-k">..</span>(<span class="pl-c1">self</span><span class="pl-k">.</span>rel_sz <span class="pl-k">/</span> <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">mem</span><span class="pl-k">::</span><span class="pl-en">size_of</span><span class="pl-k">::</span>&#x3C;<span class="pl-en">Elf64Rel</span>>()) {
        <span class="pl-k">let</span> <span class="pl-smi">rel_ptr</span> <span class="pl-k">=</span> ((<span class="pl-smi">base_addr</span> <span class="pl-k">+</span> <span class="pl-c1">self</span><span class="pl-k">.</span>rel) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-c1">Elf64Rel</span>)<span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-smi">i</span>);
        <span class="pl-k">let</span> <span class="pl-smi">rel</span> <span class="pl-k">=</span> <span class="pl-en">ptr_unsafe_ref</span>(<span class="pl-smi">rel_ptr</span>);
        <span class="pl-k">if</span> <span class="pl-smi">rel</span><span class="pl-k">.</span><span class="pl-c1">0.</span>r_info <span class="pl-k">==</span> <span class="pl-en">relative_type</span>(<span class="pl-c1">REL_RELATIVE</span>) {
            <span class="pl-k">let</span> <span class="pl-smi">rel_addr</span> <span class="pl-k">=</span> (<span class="pl-smi">base_addr</span> <span class="pl-k">+</span> <span class="pl-smi">rel</span><span class="pl-k">.</span><span class="pl-c1">0.</span>r_offset <span class="pl-k">as</span> <span class="pl-en">usize</span>) <span class="pl-k">as</span> <span class="pl-k">*mut</span> <span class="pl-en">usize</span>;
            <span class="pl-k">*</span><span class="pl-smi">rel_addr</span> <span class="pl-k">+=</span> <span class="pl-smi">base_addr</span>;
        }
    }
<span class="pl-c">    // Relocate all rela-entries</span>
    <span class="pl-k">for</span> <span class="pl-smi">i</span> <span class="pl-k">in</span> <span class="pl-c1">0</span><span class="pl-k">..</span>(<span class="pl-c1">self</span><span class="pl-k">.</span>rela_sz <span class="pl-k">/</span> <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">mem</span><span class="pl-k">::</span><span class="pl-en">size_of</span><span class="pl-k">::</span>&#x3C;<span class="pl-en">Elf64Rela</span>>()) {
        <span class="pl-k">let</span> <span class="pl-smi">rela_ptr</span> <span class="pl-k">=</span> ((<span class="pl-smi">base_addr</span> <span class="pl-k">+</span> <span class="pl-c1">self</span><span class="pl-k">.</span>rela) <span class="pl-k">as</span> <span class="pl-k">*const</span> <span class="pl-c1">Elf64Rela</span>)<span class="pl-k">.</span><span class="pl-en">add</span>(<span class="pl-smi">i</span>);
        <span class="pl-k">let</span> <span class="pl-smi">rela</span> <span class="pl-k">=</span> <span class="pl-en">ptr_unsafe_ref</span>(<span class="pl-smi">rela_ptr</span>);
        <span class="pl-k">if</span> <span class="pl-smi">rela</span><span class="pl-k">.</span><span class="pl-c1">0.</span>r_info <span class="pl-k">==</span> <span class="pl-en">relative_type</span>(<span class="pl-c1">REL_RELATIVE</span>) {
            <span class="pl-k">let</span> <span class="pl-smi">rel_addr</span> <span class="pl-k">=</span> (<span class="pl-smi">base_addr</span> <span class="pl-k">+</span> <span class="pl-smi">rela</span><span class="pl-k">.</span><span class="pl-c1">0.</span>r_offset <span class="pl-k">as</span> <span class="pl-en">usize</span>) <span class="pl-k">as</span> <span class="pl-k">*mut</span> <span class="pl-en">usize</span>;
            <span class="pl-k">*</span><span class="pl-smi">rel_addr</span> <span class="pl-k">=</span> <span class="pl-smi">base_addr</span> <span class="pl-k">+</span> <span class="pl-smi">rela</span><span class="pl-k">.</span><span class="pl-c1">0.</span>r_addend <span class="pl-k">as</span> <span class="pl-en">usize</span>;
        }
    }
<span class="pl-c">    // Skip implementing relr-entries for now</span>
}
</pre></div>
<p>After the <code>relocate</code>-section runs, <code>symbols</code> can again be used, and <code>tiny-std</code> can continue with the setup.</p>
<h2>Outro</h2>
<p>The commit that added the functionality can be found <a href="https://github.com/MarcusGrass/tiny-std/commit/fce20899b891cb07913800dc63fae991f758a819">here</a>.</p>
<p>Thanks for reading!</p>
</div>`;
const TEST_HTML = String.raw`<div class="markdown-body"><h1>Here's a test write-up</h1>
<p>I always test in prod.</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">main</span>() {
    <span class="pl-en">panic!</span>(<span class="pl-s"><span class="pl-pds">"</span>Finally highlighting works<span class="pl-pds">"</span></span>);
}
</pre></div>
<p>Test some change here!</p>
</div>`;
const THREADS_HTML = String.raw`<div class="markdown-body"><h1>Threads, some assembly required.</h1>
<p>Lately I've been thinking about adding threads to <a href="https://github.com/MarcusGrass/tiny-std/">tiny-std</a>,
my linux-only <code>x86_64</code>/<code>aarch64</code>-only tiny standard library for <a href="https://github.com/rust-lang/rust">Rust</a>.</p>
<p>Now I've finally done that, with some jankiness, in this write-up I'll
go through that process.</p>
<h2>Parallelism</h2>
<p>Sometimes in programming, <a href="https://en.wikipedia.org/wiki/Parallel_computing">parallelism</a> (doing multiple things at the
same time), is desirable. For example, to complete some task two different long-running calculations have to be made.
If those can be run in parallel, our latency becomes that of the slowest of those tasks (plus some overhead).</p>
<p>Some ways of achieving parallelism in your program are:</p>
<ol>
<li><a href="https://en.wikipedia.org/wiki/Single_instruction,_multiple_data">SIMD</a>, hopefully
your compiler does that for you. But here we're talking about singular processor operations,
not arbitrary tasks.</li>
<li>Offloading tasks to the OS. If your OS has asynchronous apis then you could ask it to do multiple things at once
and achieve parallelism that way.</li>
<li>Running tasks in other processes.</li>
<li>Running tasks in threads.</li>
</ol>
<h2>Threads</h2>
<p><a href="https://en.wikipedia.org/wiki/Thread_(computing)">Wikipedia</a> says of threads:</p>
<blockquote>
<p>"In computer science, a thread of execution is the smallest sequence of programmed instructions that can be
managed independently by a scheduler, which is typically a part of the operating system."</p>
</blockquote>
<p>Threads from a programming perspective, are managed by the OS, how threads work is highly OS-dependent. I'll
only go into <code>Linux</code> specifically here, and only from an api-consumers perspective.</p>
<h3>Spawning a thread with a minimal task</h3>
<p>In the rust std-library, a thread can be spawned with</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">main</span>() {
    <span class="pl-k">let</span> <span class="pl-smi">handle</span> <span class="pl-k">=</span> <span class="pl-en">std</span><span class="pl-k">::</span><span class="pl-en">thread</span><span class="pl-k">::</span><span class="pl-en">spawn</span>(<span class="pl-k">||</span> {
        <span class="pl-en">std</span><span class="pl-k">::</span><span class="pl-en">thread</span><span class="pl-k">::</span><span class="pl-en">sleep</span>(<span class="pl-en">std</span><span class="pl-k">::</span><span class="pl-en">time</span><span class="pl-k">::</span><span class="pl-en">Duration</span><span class="pl-k">::</span><span class="pl-en">from_millis</span>(<span class="pl-c1">500</span>));
        <span class="pl-en">println!</span>(<span class="pl-s"><span class="pl-pds">"</span>Hello from my thread<span class="pl-pds">"</span></span>);
    });
<span class="pl-c">    // Suspends execution of the calling thread until the child-thread completes.  </span>
    <span class="pl-smi">handle</span><span class="pl-k">.</span><span class="pl-en">join</span>()<span class="pl-k">.</span><span class="pl-en">unwrap</span>();   
}
</pre></div>
<p>In the above program, some setup runs before the main-function, some delegated to
<a href="https://en.wikipedia.org/wiki/C_standard_library">libc</a>. Which sets up what it deems appropriate.
<code>Rust</code> sets up a panic handler, and miscellaneous things the program needs to run correctly,
then the main-thread starts executing the <code>main</code> function.<br>
In the <code>main</code> function, the main thread spawns a child, which at the point of spawn starts executing the task provided by the
supplied closure <code>Wait 500 millis, then print a message</code>, then waits for that thread to complete.</p>
<p>I wanted to replicate this API, without using <code>libc</code>.</p>
<h3>Clone, swiss army syscall</h3>
<p>The <code>Linux</code> <a href="https://man7.org/linux/man-pages/man2/clone.2.html">clone syscall</a> can be used for a lot of things.<br>
So many that it's extremely difficult to use it correctly, it's very easy to cause security issues through
various memory-management mistakes, many of which I discovered on this journey.</p>
<p>The signature for the <a href="https://en.wikipedia.org/wiki/Glibc">glibc</a> clone wrapper function looks like:</p>
<div class="highlight highlight-c"><pre><span class="pl-k">int</span> <span class="pl-en">clone</span>(<span class="pl-k">int</span> (*fn)(<span class="pl-k">void</span> *), void *stack, int flags, void *arg, ...
<span class="pl-c">/* pid_t *parent_tid, void *tls, pid_t *child_tid */</span> );
</pre></div>
<p>Right away I can tell that calling this is not going to be easy from <code>Rust</code>, we've got
<a href="https://en.wikipedia.org/wiki/Variadic_function">varargs</a> in there, which is problematic because:</p>
<ol>
<li><code>Rust</code> doesn't have varargs, porting some <code>C</code>-functionality from for example
<a href="https://en.wikipedia.org/wiki/Musl">musl</a> won't be straight forward.</li>
<li>Varargs are not readable (objectively true opinion).</li>
</ol>
<p>Skipping down to the <code>Notes</code>-section of the documentation shows the actual syscall interface (for <code>x86_64</code> in a
conspiracy to ruin my life, the last two args are switched on <code>aarch64</code>):</p>
<div class="highlight highlight-c"><pre><span class="pl-k">long</span> <span class="pl-en">clone</span>(<span class="pl-k">unsigned</span> <span class="pl-k">long</span> flags, <span class="pl-k">void</span> *stack,
                      <span class="pl-k">int</span> *parent_tid, <span class="pl-k">int</span> *child_tid,
                      <span class="pl-k">unsigned</span> <span class="pl-k">long</span> tls);
</pre></div>
<p>Very disconcerting, since the <code>C</code>-api which accepts varargs, seems to do quite a bit of work before making the syscall,
handing over a task to the OS.</p>
<p>In simple terms, clone is a way to "clone" the current process. If you have experience with
<a href="https://man7.org/linux/man-pages/man2/fork.2.html">fork</a>, that's an example of <code>clone</code>.
Here's an equivalent <code>fork</code> using the <code>clone</code> syscall from <code>tiny-std</code>:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">/// Fork isn't implemented for aarch64, we're substituting with a clone call here</span>
<span class="pl-c">/// # Errors</span>
<span class="pl-c">/// See above</span>
<span class="pl-c">/// # Safety</span>
<span class="pl-c">/// See above</span>
#[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>aarch64<span class="pl-pds">"</span></span>)]
<span class="pl-k">pub</span> <span class="pl-k">unsafe</span> <span class="pl-k">fn</span> <span class="pl-en">fork</span>() <span class="pl-k">-></span> <span class="pl-en">Result</span>&#x3C;<span class="pl-en">PidT</span>> {
<span class="pl-c">    // SIGCHLD is mandatory on aarch64 if mimicking fork it seems</span>
    <span class="pl-k">let</span> <span class="pl-smi">cflgs</span> <span class="pl-k">=</span> <span class="pl-k">crate::</span><span class="pl-en">platform</span><span class="pl-k">::</span><span class="pl-en">SignalKind</span><span class="pl-k">::</span><span class="pl-c1">SIGCHLD</span>;
    <span class="pl-k">let</span> <span class="pl-smi">res</span> <span class="pl-k">=</span> <span class="pl-en">syscall!</span>(<span class="pl-c1">CLONE</span>, <span class="pl-smi">cflgs</span><span class="pl-k">.</span><span class="pl-en">bits</span>()<span class="pl-k">.</span><span class="pl-c1">0</span>, <span class="pl-c1">0</span>, <span class="pl-c1">0</span>, <span class="pl-c1">0</span>, <span class="pl-c1">0</span>);
    <span class="pl-en">bail_on_below_zero!</span>(<span class="pl-smi">res</span>, <span class="pl-s"><span class="pl-pds">"</span>CLONE syscall failed<span class="pl-pds">"</span></span>);
    #[allow(clippy<span class="pl-k">::</span>cast_possible_truncation, clippy<span class="pl-k">::</span>cast_possible_wrap)]
    <span class="pl-en">Ok</span>(<span class="pl-smi">res</span> <span class="pl-k">as</span> <span class="pl-en">i32</span>)
}
</pre></div>
<p>What happens immediately after this call, is that our process is cloned and starts executing past the code which called
<code>clone</code>, following the above <code>Rust</code> example:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">parallelism_through_multiprocess</span>() {
    <span class="pl-k">let</span> <span class="pl-smi">pid</span> <span class="pl-k">=</span> <span class="pl-k">unsafe</span> { <span class="pl-en">rusl</span><span class="pl-k">::</span><span class="pl-en">process</span><span class="pl-k">::</span><span class="pl-en">fork</span>()<span class="pl-k">.</span><span class="pl-en">unwrap</span>() };
    <span class="pl-k">if</span> <span class="pl-smi">pid</span> <span class="pl-k">==</span> <span class="pl-c1">0</span> {
        <span class="pl-en">println!</span>(<span class="pl-s"><span class="pl-pds">"</span>In child!<span class="pl-pds">"</span></span>);
        <span class="pl-en">rusl</span><span class="pl-k">::</span><span class="pl-en">process</span><span class="pl-k">::</span><span class="pl-en">exit</span>(<span class="pl-c1">0</span>);
    } <span class="pl-k">else</span> {
        <span class="pl-en">println!</span>(<span class="pl-s"><span class="pl-pds">"</span>In parent, spawned child {pid}<span class="pl-pds">"</span></span>);
    }
}
</pre></div>
<p>This program will print (in non-deterministic order):<br>
<code>In parent, spawned child 24748</code> and<br>
<code>In child</code>, and return to the caller.</p>
<p>Here we achieved parallelism by spawning another process and doing work there, separately scheduled by the OS,
then exited that process. At the same time, our caller returns as usual, only stopping briefly to make the syscall.</p>
<p>Achieving parallelism in this way can be fine. If you want to run a command, <code>forking</code>/<code>cloning</code> then executing
another binary through the <a href="https://man7.org/linux/man-pages/man2/execve.2.html">execve-syscall</a>
is usually how that's done.<br>
Multiprocessing can be a bad choice if the task is small, because setting up an entire other process can be resource
intensive, and communicating between processes can be slower than communicating through shared memory.</p>
<h3>Threads: Cloning intra-process with shared memory</h3>
<p>What we think of as threads in linux are sometimes called
<a href="https://en.wikipedia.org/wiki/Light-weight_process">Light-Weight Processes</a>, the above clone call spawned a regular
process, which got a full copy of the parent-process' memory with copy-on-write semantics.</p>
<p>To reduce overhead in both spawning, and communicating between the cloned process and the rest of the processes
in the application, a combination of flags are used:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">let</span> <span class="pl-smi">flags</span> <span class="pl-k">=</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_VM</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_FS</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_FILES</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_SIGHAND</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_THREAD</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_SYSVSEM</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_CHILD_CLEARTID</span>
        <span class="pl-k">|</span> <span class="pl-en">CloneFlags</span><span class="pl-k">::</span><span class="pl-c1">CLONE_SETTLS</span>;
</pre></div>
<p>Clone flags are tricky to explain, they interact with each other as well, but in short:</p>
<ol>
<li><code>CLONE_VM</code>, clone memory without copy-on-write semantics, meaning, the parent and child
share memory space and can modify each-other's memory.</li>
<li><code>CLONE_FS</code>, the parent and child share the same filesystem information, such as current directory.</li>
<li><code>CLONE_FILES</code>, the parent and child share the same file-descriptor table,
(if one opens an <code>fd</code>, that <code>fd</code> is available to the other).</li>
<li><code>CLONE_SIGHAND</code>, the parent and child share signal handlers.</li>
<li><code>CLONE_THREAD</code>, the child-process is placed in the same thread-group as the parent.</li>
<li><code>CLONE_SYSVSEM</code>, the parent and child shares semaphores.</li>
<li><code>CLONE_CHILD_CLEARTID</code>, wake up waiters for the supplied <code>child_tid</code> futex pointer when the child exits
(we'll get into this).</li>
<li><code>CLONE_SETTLS</code>, set the thread-local storage to the data pointed at by the <code>tls</code>-variable (architecture specific,
we'll get into this as well).</li>
</ol>
<p>The crucial flags to run some tasks in a thread are only:</p>
<ol>
<li><code>CLONE_VM</code></li>
<li><code>CLONE_THREAD</code></li>
</ol>
<p>The rest are for usability and expectation, as well as cleanup reasons.</p>
<h2>Implementation</h2>
<p>Now towards the actual implementation of a minimal threading API.</p>
<h3>API expectation</h3>
<p>The std library in <code>Rust</code> provides an interface that could be used like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">let</span> <span class="pl-smi">join_handle</span> <span class="pl-k">=</span> <span class="pl-en">std</span><span class="pl-k">::</span><span class="pl-en">thread</span><span class="pl-k">::</span><span class="pl-en">spawn</span>(<span class="pl-k">||</span> <span class="pl-en">println!</span>(<span class="pl-s"><span class="pl-pds">"</span>Hello from my thread!<span class="pl-pds">"</span></span>));
<span class="pl-smi">join_handle</span><span class="pl-k">.</span><span class="pl-en">join</span>()<span class="pl-k">.</span><span class="pl-en">unwrap</span>();
</pre></div>
<p>A closure that is run on another thread is supplied and a <code>JoinHandle&#x3C;T></code> is returned, the join handle
can be awaited by calling its <code>join</code>-method, which will block the calling thread until the thread executing the closure
has completed. If it <code>panics</code>, the <code>Result</code> will be an <code>Err</code>, if it succeeds, it will be an <code>Ok(T)</code> where <code>T</code> is
the return value from the closure, which in this case is nothing (<code>()</code>);</p>
<h3>Executing a clone call</h3>
<p>If <code>CLONE_VM</code> is specified, a stack should be supplied. <code>CLONE_VM</code> means sharing mutable memory, if we didn't
supply the stack, both threads would continue mutating the same stack area, here's an excerpt from
<a href="https://man7.org/linux/man-pages/man2/clone.2.html">the docs</a> about that:</p>
<blockquote>
<p>[..] (If the
child shares the parent's memory because of the use of the
CLONE_VM flag, then no copy-on-write duplication occurs and chaos
is likely to result.) - "C library/kernel differences"-section</p>
</blockquote>
<h4>Allocating the stack</h4>
<p>Therefore, setting up a stack is required. There are a few options for that, the kernel only needs a chunk of correctly
aligned memory depending on what platform we're targeting. We could even just take some memory off our own stack
if we want too.</p>
<h5>Use the callers stack</h5>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">clone</span>() {
<span class="pl-c">    /// 16 kib stack allocation</span>
    <span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">my_stack</span> <span class="pl-k">=</span> [<span class="pl-c1">0</span><span class="pl-en">u8</span>; <span class="pl-c1">16384</span>];
    <span class="pl-k">let</span> <span class="pl-smi">stack_ptr</span> <span class="pl-k">=</span> <span class="pl-smi">my_stack</span><span class="pl-k">.</span><span class="pl-en">as_mut_ptr</span>();
<span class="pl-c">    /// pass through to syscall</span>
    <span class="pl-en">syscall!</span>(<span class="pl-c1">CLONE</span>, <span class="pl-k">...</span>, <span class="pl-smi">stack_ptr</span>, <span class="pl-k">...</span>);
}
</pre></div>
<p>This is bad for a generic API for a multitude of reasons.
It restricts the user to threads that complete before the caller has popped the stack frame in which they were created,
since the part of the stack that was used in this frame will be reused by the caller later, possibly while the
child-thread still uses it for its own stack. Which we now know, would result in chaos.</p>
<p>Additionally, we will have to have stack space available on the calling thread, for an arbitrary amount of children
if this API was exposed to users. In the case a heap-allocations, the assumption that we will have enough memory for
reasonable thread-usage is valid. <code>Rust</code>'s default thread stack size is <code>2MiB</code>. On a system with <code>16GiB</code> of RAM, with
<code>8GiB</code> available at a given time, that's 4000 threads, spawning that many is likely not intentional or performant.</p>
<p>Keeping threads on the main-thread's stack, significantly reduces our memory availability, along with the risk of chaos.</p>
<p>There is a case to be made for some very specific application which spawns some threads in scope, does some work, then exits,
to reuse the caller's stack. But I have yet to encounter that kind of use-case in practice, let's move on to something
more reasonable.</p>
<h5>Mmap more stack-space</h5>
<p>This is what <code>musl</code> does. We allocate the memory that we want to use from new os-pages and use those.<br>
We could potentially do a regular <code>malloc</code> as well, although that would mean less control over the allocated memory.</p>
<h4>Communicating with the started thread</h4>
<p>Now <code>mmap</code>-ing some stack-memory is enough for the OS to start a thread with its own stack, but then what?<br>
The thread needs to know what to do, we can't provide it with any arguments, we need to put all the data it needs
on its stack before starting execution of the task.</p>
<p>This means that we'll need some assembly, since using the clone syscall and then continuing in <code>Rust</code> relinquishes
control that we need over the stack, we need to put almost the entire child-thread's lifetime in assembly.</p>
<p>The structure of the call is mostly stolen from <code>musl</code>, with some changes for this more minimal use-case.
The rust function will look like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">extern</span> <span class="pl-s"><span class="pl-pds">"</span>C<span class="pl-pds">"</span></span> {
    <span class="pl-k">fn</span> <span class="pl-en">__clone</span>(
        <span class="pl-smi">start_fn</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">stack_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">flags</span><span class="pl-k">:</span> <span class="pl-en">i32</span>,
        <span class="pl-smi">args_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">tls_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">child_tid_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">stack_unmap_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
        <span class="pl-smi">stack_sz</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    ) <span class="pl-k">-></span> <span class="pl-en">i32</span>;
}
</pre></div>
<ol>
<li>It takes a pointer to a <code>start_fn</code>, which is a <code>C</code> calling convention function pointer, where our thread will pick up.</li>
<li>It also takes a pointer to the stack, <code>stack_ptr</code>.</li>
<li>It takes clone-flags which we send onto the OS in the syscall.</li>
<li>It takes an <code>args_ptr</code>, which is the closure we want to run, converted to a <code>C</code> calling convention function pointer.</li>
<li>It takes a <code>tls_ptr</code>, a pointer to some thread local storage, which we'll need to deallocate the thread's stack, and
communicate with the calling thread.</li>
<li>It takes a <code>child_tid_ptr</code>, which will be used to synchronize with the calling thread.</li>
<li>It takes a <code>stack_unmap_ptr</code>, which is the base address that we allocated for the stack at its original <code>0</code> offset.</li>
<li>It takes the <code>stack_sz</code>, stack-size, which we'll need to deallocate the stack later.</li>
</ol>
<h4>Syscalls</h4>
<p><code>x86_64</code> and <code>aarch64</code> assembly has a command to execute a <code>syscall</code>.</p>
<p>A syscall is like a function call to the kernel, we'll need to make three syscalls using assembly:</p>
<ol>
<li>CLONE, nr 56 on <code>x86_64</code></li>
<li>MUNMAP, nr 11 on <code>x86_64</code></li>
<li>EXIT, nr 60 on <code>x86_64</code></li>
</ol>
<p>The interface for the syscall is as follows:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">/// Syscall conventions are on 5 args:</span>
<span class="pl-c">/// - arg -> arch: reg,</span>
<span class="pl-c">/// - nr -> x86: rax, aarch64: x8</span>
<span class="pl-c">/// - a1 -> x86: rdi, aarch64: x0</span>
<span class="pl-c">/// - a2 -> x86: rsi, aarch64: x1</span>
<span class="pl-c">/// - a3 -> x86: rdx, aarch64: x2</span>
<span class="pl-c">/// - a4 -> x86: r10, aarch64: x3</span>
<span class="pl-c">/// - a5 -> x86: r8,  aarch64: x4</span>
<span class="pl-c">/// Pseudocode syscall as extern function: </span>
<span class="pl-k">extern</span> <span class="pl-s"><span class="pl-pds">"</span>C<span class="pl-pds">"</span></span> {
    <span class="pl-k">fn</span> <span class="pl-en">syscall</span>(<span class="pl-smi">nr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>, <span class="pl-smi">a1</span><span class="pl-k">:</span> <span class="pl-en">usize</span>, <span class="pl-smi">a2</span><span class="pl-k">:</span> <span class="pl-en">usize</span>, <span class="pl-smi">a3</span><span class="pl-k">:</span> <span class="pl-en">usize</span>, <span class="pl-smi">a4</span><span class="pl-k">:</span> <span class="pl-en">usize</span>, <span class="pl-smi">a5</span><span class="pl-k">:</span> <span class="pl-en">usize</span>);
}
</pre></div>
<p>Onto the assembly, it can be boiled down to this:</p>
<ol>
<li>Prepare arguments to go in the right registers for the syscall.</li>
<li>Put what the thread needs into its stack.</li>
<li>Execute the clone syscall, return directly to the caller (parent-thread).</li>
<li>Pop data from the spawned thread's stack into registers.</li>
<li>Execute the function we wanted to run in the spawned thread.</li>
<li>Unmap the spawned thread's own stack</li>
<li>Exit 0</li>
</ol>
<pre><code class="language-asm">// Boilerplate to expose the symbol
.text
.global __clone
.hidden __clone
.type   __clone,@function
// Actual declaration
__clone:
// tls_ptr already in r8, syscall arg 5 register, due to C calling convention on this function, same with stack_ptr in rsi
// Zero syscall nr register ax (eax = 32bit ax)
xor eax, eax
// Move 56 into the lower 8 bits of ax (al = 8bit ax), 56 is the CLONE syscall nr for x86_64, will become: syscall(56, .., stack_ptr, .., tls_ptr)
mov al, 56
// Move start function into r11, scratch register, save it there since we need to shuffle stuff around
mov r11, rdi
// Move flags into rdi, syscall arg 1 register, well become: syscall(56, flags, stack_ptr, .., .., tls_ptr)
mov rdi, rdx
// Zero parent_tid_ptr from syscall arg 3 register (not using), will become: syscall(56, flags, stack_ptr, 0, .., tls_ptr)
xor rdx, rdx
// Move child_tid_ptr into syscall arg 4 register (our arg 6), will become: syscall(56, flags, stack_ptr, 0, child_tid_ptr, tls_ptr)
mov r10, r9
// Move start function into r9
mov r9, r11
// Align stack ptr to -16
and rsi, -16
// Move down 8 bytes on the stack ptr
sub rsi, 8
// Move args onto the the top of the stack
mov [rsi], rcx
// Move down 8 bytes more on the stack ptr
sub rsi, 8
// Move the first arg that went on the stack into rcx (stack_unmap_ptr)
mov rcx, [8 + rsp]
// Move stack_unmap_ptr onto our new stack
mov [rsi], rcx
// Move the second arg that went on the stack into rcx (stack_sz)
mov rcx, [16 + rsp]
// Move down stack ptr
sub rsi, 8
// Move stack_sz onto the new stack
mov [rsi], rcx
// Make clone syscall
syscall
// Check if the syscall return vaulue is 0
test eax, eax
// if not zero, return (we're the calling thread)
jnz 1f
// Child:
// Zero the base pointer
xor ebp, ebp
// Pop the stack_sz off the provided stack into callee saved register
pop r13
// Pop the stack_ptr off the provided stack into another callee saved register
pop r12
// Pop the start fn args off the provided stack into rdi
pop rdi
// Call the function we saved in r9, rdi first arg
call r9
// Zero rax (function return, we don't care)
xor rax, rax
// Move MUNMAP syscall into ax
mov al, 11
// Stack ptr as the first arg
mov rdi, r12
// Stack len as the second arg
mov rsi, r13
// Syscall, unmapping the stack
syscall
// Clear the output register, we can't use the return value anyway
xor eax,eax
// Move EXIT syscall nr into ax
mov al, 60
// Set exit code for the thread to 0
mov rdi, 0
// Make exit syscall
syscall
1: ret
</code></pre>
<p>And that's it, kinda, with some code wrapping this we can run an arbitrary closure on a separate thread!</p>
<h3>Race conditions</h3>
<p>We're far from done, in the happy case we're starting a thread, it completes, and deallocates its own stack.
But, we need to get its returned value, and we need to know if it's done.</p>
<p>Unlike a process, we cannot use the <a href="https://man7.org/linux/man-pages/man2/waitpid.2.html">wait-syscall</a> to wait
for the process to complete, but there is another way, alluded to in the note on <code>CLONE_CHILD_CLEARTID</code>.</p>
<h4>Futex messaging</h4>
<p>If <code>CLONE_CHILD_CLEARTID</code> is supplied in clone-flags along with a pointer to a futex variable, something with a <code>u32</code>-layout
in <code>Rust</code> that's most reasonably <code>AtomicU32</code>, then the OS will set that futex-value to <code>0</code> (not null) when the thread exits,
successfully or not.</p>
<p>This means that if the caller wants to <code>join</code>, i.e. blocking-wait for the child-thread to finish, it can use the
<a href="https://man7.org/linux/man-pages/man2/futex.2.html">futex-syscall</a>.</p>
<h4>Getting the returned value</h4>
<p>The return value is fairly simple, we need to allocate space for it, for example with a pointer to an <code>UnsafeCell&#x3C;Option&#x3C;T>></code>,
and then have the child-thread update it. The catch here is that we can't have <code>&#x26;</code>-references to that value while the child-thread
may be writing to it, since that's <code>UB</code>. We share a pointer with the child containing the value, and we need to be
absolutely certain that the child-thread is done with
its modification before we try to read it. For example by waiting for it to exit by <code>join</code>-ing.</p>
<h3>Memory leaks, who deallocates what?</h3>
<p>We don't necessarily have to keep our <code>JoinHandle&#x3C;T></code> around after spawning a thread. A perfectly valid use-case is to
just spawn some long-running thread and then forget about it, this causes a problem, if the calling thread doesn't have
sole responsibility of deallocating the shared memory (the <code>futex</code> variable, and the return value), then we need a way
to signal to the child-thread that it's that thread's responsibility to deallocate those variables before exiting.</p>
<p>Enter the third shared variable, an <code>AtomicBool</code> called <code>should_dealloc</code>, both threads share a pointer to this variable
as well.</p>
<p>Now there are three deallocation-scenarios:</p>
<ol>
<li>Caller joins the child thread by waiting for the <code>futex</code>-variable to change value to <code>0</code>.
In this case the caller deallocates the <code>futex</code>, takes the return value of the heap freeing its memory, and
deallocates the <code>should_dealloc</code> pointer.</li>
<li>Caller drops the <code>JoinHandle&#x3C;T></code>. This is racy, we need to read <code>should_dealloc</code> to see that the child thread hasn't
already completed its work. If it has, we wait on the <code>futex</code> to make sure the child thread is completely done, then
deallocate as above.</li>
<li>The child thread tries to set <code>should_dealloc</code> to <code>true</code> and fails, meaning that the calling thread has already
dropped the <code>JoinHandle&#x3C;T></code>. In this case, the child thread needs to signal to the OS that the <code>futex</code> is no longer
to be updated on thread exit through the
<a href="https://man7.org/linux/man-pages/man2/set_tid_address.2.html">set_tid_address-syscall</a> (forgetting to do this results in a
use after free, oof. Here's a <code>Linux</code>-code-comment calling me a dumbass that I found when trying to find the source of the segfaults:</li>
</ol>
<div class="highlight highlight-c"><pre><span class="pl-c">// 929ed21dfdb6ee94391db51c9eedb63314ef6847, kernel/fork.c#L1634, written by Linus himself</span>
<span class="pl-k">if</span> (tsk->clear_child_tid) {
		<span class="pl-k">if</span> (<span class="pl-c1">atomic_read</span>(&#x26;mm-><span class="pl-smi">mm_users</span>) > <span class="pl-c1">1</span>) {
			<span class="pl-c">/*</span>
<span class="pl-c">			 * We don't check the error code - if userspace has</span>
<span class="pl-c">			 * not set up a proper pointer then tough luck.</span>
<span class="pl-c">			 */</span>
			<span class="pl-c1">put_user</span>(<span class="pl-c1">0</span>, tsk-><span class="pl-smi">clear_child_tid</span>);
			<span class="pl-c1">do_futex</span>(tsk-><span class="pl-smi">clear_child_tid</span>, FUTEX_WAKE,
					<span class="pl-c1">1</span>, <span class="pl-c1">NULL</span>, <span class="pl-c1">NULL</span>, <span class="pl-c1">0</span>, <span class="pl-c1">0</span>);
		}
		tsk-><span class="pl-smi">clear_child_tid</span> = <span class="pl-c1">NULL</span>;
	}
</pre></div>
<p>). Then it can safely deallocate the shared variables.</p>
<h3>Oh, right. Panics...</h3>
<p>I imagine a world where <code>Rust</code> doesn't contain panics. Sadly, we don't live in that world, and thus we need to handle them.<br>
If the thread panics, and we try to join then it's no issue, we'll get a <code>None</code> return value, and can continue with
the regular cleanup from the caller.<br>
However, if the thread panics after the caller has dropped the <code>JoinHandle&#x3C;T></code> the shared memory is leaked,
and the stack isn't deallocated.</p>
<p>A <code>Rust</code> panic handler could like this:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">/// Dummy panic handler</span>
#[panic_handler]
<span class="pl-k">pub</span> <span class="pl-k">fn</span> <span class="pl-en">on_panic</span>(<span class="pl-smi">info</span><span class="pl-k">:</span> <span class="pl-k">&#x26;</span><span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">panic</span><span class="pl-k">::</span><span class="pl-en">PanicInfo</span>) <span class="pl-k">-></span> <span class="pl-k">!</span> {
    <span class="pl-k">loop</span> {}
}
</pre></div>
<p>The signature shows that it gets <code>PanicInfo</code> and never returns.<br>
When a thread panics, it enters that function and never returns, it's here that we need to handle cleanup in the
case that the thread panics.</p>
<p>What we need:</p>
<ol>
<li>A pointer to the <code>futex</code></li>
<li>A pointer to the return value</li>
<li>A pointer to the <code>should_dealloc</code> variable</li>
<li>The address at which we allocated this thread's stack</li>
<li>The size of that allocated stack</li>
</ol>
<p>We could insert those in registers that shouldn't be touched by the user-supplied function, but that's fairly brittle,
instead we'll use the dreaded <code>tls</code>.</p>
<h4>Thread-local storage</h4>
<p>Thread-local storage, or <code>tls</code> is a way to store thread-specific data.<br>
For <code>x86_64</code> and <code>aarch64</code> there is a specific register we can use to store a pointer to some arbitrary data,
we can read from that data at any time from any place, in other words, the data is global to the thread.</p>
<p>In practice:</p>
<div class="highlight highlight-rust"><pre>#[repr(<span class="pl-en">C</span>)]
#[derive(<span class="pl-en">Copy</span>, <span class="pl-en">Clone</span>)]
<span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-k">struct</span> <span class="pl-en">ThreadLocalStorage</span> {
<span class="pl-c">    // First arg needs to be a pointer to this struct, it's immediately dereferenced</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">self_addr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    // Info on spawned threads that allow us to unmap the stack later</span>
    <span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-smi">stack_info</span><span class="pl-k">:</span> <span class="pl-en">Option</span>&#x3C;<span class="pl-en">ThreadDealloc</span>>,
}
#[repr(<span class="pl-en">C</span>)]
#[derive(<span class="pl-en">Copy</span>, <span class="pl-en">Clone</span>)]
<span class="pl-k">pub</span>(<span class="pl-k">crate</span>) <span class="pl-k">struct</span> <span class="pl-en">ThreadDealloc</span> {
<span class="pl-c">    // For the stack dealloc</span>
    <span class="pl-smi">stack_addr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    <span class="pl-smi">stack_sz</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    // For the return value dealloc</span>
    <span class="pl-smi">payload_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
    <span class="pl-smi">payload_layout</span><span class="pl-k">:</span> <span class="pl-en">Layout</span>,
<span class="pl-c">    // Futex, </span>
    <span class="pl-smi">futex_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
<span class="pl-c">    // Sync who deallocs</span>
    <span class="pl-smi">sync_ptr</span><span class="pl-k">:</span> <span class="pl-en">usize</span>,
}
#[inline]
#[must_use]
<span class="pl-k">fn</span> <span class="pl-en">get_tls_ptr</span>() <span class="pl-k">-></span> <span class="pl-k">*mut</span> <span class="pl-en">ThreadLocalStorage</span> {
    <span class="pl-k">let</span> <span class="pl-k">mut</span> <span class="pl-smi">output</span><span class="pl-k">:</span> <span class="pl-en">usize</span>;
    #[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>x86_64<span class="pl-pds">"</span></span>)]
    <span class="pl-k">unsafe</span> {
        <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">asm!</span>(<span class="pl-s"><span class="pl-pds">"</span>mov {x}, fs:0<span class="pl-pds">"</span></span>, <span class="pl-smi">x</span> <span class="pl-k">=</span> <span class="pl-en">out</span>(<span class="pl-smi">reg</span>) <span class="pl-smi">output</span>);
    }
    #[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>aarch64<span class="pl-pds">"</span></span>)]
    <span class="pl-k">unsafe</span> {
        <span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">asm!</span>(<span class="pl-s"><span class="pl-pds">"</span>mrs {x}, tpidr_el0<span class="pl-pds">"</span></span>, <span class="pl-smi">x</span> <span class="pl-k">=</span> <span class="pl-en">out</span>(<span class="pl-smi">reg</span>) <span class="pl-smi">output</span>);
    }
    <span class="pl-smi">output</span> <span class="pl-k">as</span> <span class="pl-smi">_</span>
}
</pre></div>
<p>This takes us to another of our clone-flags <code>CLONE_SETTLS</code>, we can now allocate and supply a pointer to a
<code>ThreadLocalStorage</code>-struct, and that will be put into the thread's thread-local storage register by the OS,
which registers are used can be seen in <code>get_tls_ptr</code>.</p>
<p>Now when entering the <code>panic_handler</code> we can <code>get_tls_ptr</code> and see if there is a <code>ThreadDealloc</code> associated with the
thread that's currently panicking. If there isn't, we're on the main thread, and we'll just bail out by exiting with
code <code>1</code>, terminating the program.
If there is a <code>ThreadDealloc</code> we can now first check if the caller has dropped the <code>JoinHandle&#x3C;T></code>,
and if we have exclusive access to the shared memory, if we do have exclusive access we deallocate it,
if we don't we let the caller handle it. Then, again we have to exit with some asm:</p>
<div class="highlight highlight-rust"><pre><span class="pl-c">// We need to be able to unmap the thread's own stack, we can't use the stack anymore after that</span>
<span class="pl-c">// so it needs to be done in asm.</span>
<span class="pl-c">// With the stack_ptr and stack_len in rdi/x0 and rsi/x1, respectively we can call mmap then</span>
<span class="pl-c">// exit the thread</span>
#[cfg(target_arch <span class="pl-k">=</span> <span class="pl-s"><span class="pl-pds">"</span>x86_64<span class="pl-pds">"</span></span>)]
<span class="pl-en">core</span><span class="pl-k">::</span><span class="pl-en">arch</span><span class="pl-k">::</span><span class="pl-en">asm!</span>(
<span class="pl-c">// Call munmap, all args are provided in this macro call.</span>
<span class="pl-s"><span class="pl-pds">"</span>syscall<span class="pl-pds">"</span></span>,
<span class="pl-c">// Zero eax from munmap ret value</span>
<span class="pl-s"><span class="pl-pds">"</span>xor eax, eax<span class="pl-pds">"</span></span>,
<span class="pl-c">// Move exit into ax</span>
<span class="pl-s"><span class="pl-pds">"</span>mov al, 60<span class="pl-pds">"</span></span>,
<span class="pl-c">// Exit code 0 from thread.</span>
<span class="pl-s"><span class="pl-pds">"</span>mov rdi, 0<span class="pl-pds">"</span></span>,
<span class="pl-c">// Call exit, no return</span>
<span class="pl-s"><span class="pl-pds">"</span>syscall<span class="pl-pds">"</span></span>,
<span class="pl-en">in</span>(<span class="pl-s"><span class="pl-pds">"</span>rax<span class="pl-pds">"</span></span>) <span class="pl-c1">MUNMAP</span>,
<span class="pl-en">in</span>(<span class="pl-s"><span class="pl-pds">"</span>rdi<span class="pl-pds">"</span></span>) <span class="pl-smi">map_ptr</span>,
<span class="pl-en">in</span>(<span class="pl-s"><span class="pl-pds">"</span>rsi<span class="pl-pds">"</span></span>) <span class="pl-smi">map_len</span>,
<span class="pl-en">options</span>(<span class="pl-smi">nostack</span>, <span class="pl-smi">noreturn</span>)
);
</pre></div>
<p>We also need to remember to deallocate the <code>ThreadLocalStorage</code>, what we keep in the register is just a pointer to
that allocated heap-memory. This needs to be done both in successful and panicking thread-exits.</p>
<h2>Final thoughts</h2>
<p>I've been dreading reinventing this particular wheel, but I'm glad I did.
I learnt a lot, and it was interesting to dig into how threading works in practice on <code>Linux</code>, plus <code>tiny-std</code> now has
threads!</p>
<p>The code for threads in tiny-std can be found <a href="https://github.com/MarcusGrass/tiny-std/blob/main/tiny-std/src/thread/spawn.rs">here</a>.
With a huge amount of comments its 500 lines.</p>
<p>I believe that it doesn't contain <code>UB</code> or leakage, but it's incredibly hard to test, what I know is lacking is signal
handling, which is something else that I have been dreading getting into.</p>
<h2>Next up</h2>
<p>I've ordered a Pinephone explorer edition, I'll probably try doing stuff with that next.</p>
<h2>Thanks for reading!</h2>
</div>`;function render(location) {
	if (location === Location.HOME.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = HOME_HTML;
	} else if (location === Location.NAV.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/");
		document.getElementById("content")
			.innerHTML = NAV_HTML;
	} else if (location === Location.META.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = META_HTML;
	} else if (location === Location.PGWM03.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = PGWM03_HTML;
	} else if (location === Location.BOOT.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = BOOT_HTML;
	} else if (location === Location.PGWM04.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = PGWM04_HTML;
	} else if (location === Location.THREADS.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = THREADS_HTML;
	} else if (location === Location.STATICPIE.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = STATICPIE_HTML;
	} else if (location === Location.KBDSMP.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = KBDSMP_HTML;
	} else if (location === Location.TEST.path) {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = TEST_HTML;
	} else {
		document.getElementById("menu")
			.innerHTML = create_nav_button("Home", "/") + create_nav_button("Table of contents", "/table-of-contents");
		document.getElementById("content")
			.innerHTML = NOTFOUND_HTML;
	}
}
function create_nav_button(label, link) {
    return "<button class=\"menu-item\" onclick=page_navigate(\"" + link + "\")>" + label + "</button>";
}

function page_navigate(location) {
        window.history.pushState({"pageTitle": location}, "", location);
        render(location);
}
    