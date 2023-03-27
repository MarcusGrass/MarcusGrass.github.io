const Location = Object.freeze({
	HOME: {"path": "/", "name": "Home"},
	NAV: {"path": "/table-of-contents", "name": "Nav"},
	NOTFOUND: {"path": "/not-found", "name": "NotFound"},
	META: {"path": "/meta", "name": "Meta"},
	PGWM03: {"path": "/pgwm03", "name": "Pgwm03"},
	BOOT: {"path": "/boot", "name": "Boot"},
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
<li><a class="self-link" onclick=page_navigate("/pgwm03")>Pgwm03</a></li>
<li><a class="self-link" onclick=page_navigate("/boot")>Boot</a></li>
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
<div class="highlight highlight-rust"><pre>yew<span class="pl-k">::</span><span class="pl-en">html!</span> {
    <span class="pl-k">&#x3C;</span>div<span class="pl-k">></span>
        {{<span class="pl-s">"Content here"</span>}}
    <span class="pl-k">&#x3C;/</span>div<span class="pl-k">></span>
}
</pre></div>
<p>Any raw string had to be double bracketed then quoted.<br>
Additionally, to convert to links, raw <code>html</code> that looked like this:</p>
<div class="highlight highlight-text-html-basic"><pre>&#x3C;<span class="pl-ent">a</span> <span class="pl-e">href</span>=<span class="pl-s"><span class="pl-pds">"</span>/test<span class="pl-pds">"</span></span>>Test!&#x3C;/<span class="pl-ent">a</span>>
</pre></div>
<p>Would have to be converted to this:</p>
<div class="highlight highlight-rust"><pre>yew<span class="pl-k">::</span><span class="pl-en">html!</span> {
    <span class="pl-k">&#x3C;</span>a onclick<span class="pl-k">=</span>{<span class="pl-k">move</span> <span class="pl-k">|</span>_<span class="pl-k">|</span> scope.navigator.<span class="pl-en">unwrap</span>().<span class="pl-en">replace</span>(<span class="pl-k">&#x26;</span>Location<span class="pl-k">::</span>Test)}<span class="pl-k">></span>Test<span class="pl-k">!&#x3C;/</span>a<span class="pl-k">></span>
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
const TEST_HTML = String.raw`<div class="markdown-body"><h1>Here's a test write-up</h1>
<p>I always test in prod.</p>
<div class="highlight highlight-rust"><pre><span class="pl-k">fn</span> <span class="pl-en">main</span>() {
    <span class="pl-c1">panic!</span>(<span class="pl-s">"Finally highlighting works"</span>);
}
</pre></div>
<p>Test some change here!</p>
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
    