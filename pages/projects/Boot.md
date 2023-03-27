# Boot-rs securing a Linux bootloader
I recently dug into a previously unfamiliar part of Linux, the bootloader.  

This is a medium-length write-up of how the Linux boot-process works and how to modify it, told through 
the process of me writing my own janky bootloader.  

I wanted the boot process to be understandable, ergonomic, and secure.  

## Notes about distributions
I did what's described in this write-up on Gentoo, although it would work the same on any 
linux machine. Depending on the distribution this setup might not be feasible. Likely these steps would have to 
be modified depending on the circumstance.  

## Preamble, Security keys
I got some [Yubikeys](https://www.yubico.com/) recently. Yubikeys are security keys, which essentially is a fancy 
name for a drive (USB in this case) created to store secrets securely.  

Some secrets that are loaded into the key cannot escape at all, they can even be created on the key, never having seen 
the light of day.  
Some secrets can escape and can therefore be injected as part of a pipeline in other security processes. An example 
of this could be storing a cryptodisk secret which is then passed to [cryptsetup](https://gitlab.com/cryptsetup/cryptsetup) 
in the case of Linux disk encryption.  

I did some programming against the Yubikeys, I published a small runner to sign data with a Yubikey [here](https://github.com/MarcusGrass/yk-verify)
but got a bit discouraged by the need for [pcscd](https://pcsclite.apdu.fr/), a daemon with an accompanying c-library to 
interface with it, to connect.  
Later I managed to do a pure rust integration against the Linux usb interface, and will publish that pretty soon.  

I started thinking about ways to integrate Yubikeys into my workflow more, I started 
examining my boot process, I got derailed.  

## Bootloader woes
I have used [GRUB](https://en.wikipedia.org/wiki/GNU_GRUB) as my bootloader since I started using Linux, it has generally 
worked well, but it does feel old.  

When I ran `grub-mkconfig -o ...`, updating my boot configuration, and ran into
[this](https://www.reddit.com/r/EndeavourOS/comments/wygfds/full_transparency_on_the_grub_issue/) issue I figured it 
was time to survey for other options. After burning another ISO to get back into my system.

## Bootloader alternatives
I was looking into alternatives, finding [efi stub](https://wiki.archlinux.org/title/EFISTUB), compiling the kernel 
into its own bootable efi-image, to be the most appealing option. 
If the kernel can boot itself, why even have a bootloader?  

With Gentoo, integrating that was fairly easy assuming no disk encryption.

Before getting into this, a few paragraphs about the Linux boot process may be appropriate.

## Boot in short
The boot process, in my opinion, starts on the motherboard firmware and ends when the kernel hands over execution to `/sbin/init`.  

### UEFI
The motherboard powers on and starts running UEFI firmware (I'm pretending bios don't exist because I'm not stuck in the past).  
UEFI can run images, such as disk, keyboard, and basic display-drivers, kernels, and Rust binaries.  

Usually, this stage of the process will be short, as the default task to perform is to check if the user wants to enter 
setup and interface with the UEFI system, or continue with the highest priority boot-image.  

That boot image could be a grub.efi-program, which may perform some work, such as decrypting your boot partition and then 
handing execution over to the kernel image.  
It could also be an efi stub kernel image that gets loaded directly, or some other bootloader.  

### Kernel boot
The kernel process starts, initializing the memory it needs, starting tasks, and whatever else the kernel does.  

### Initramfs
When the kernel has performed its initialization, early userspace starts in the initramfs.  
[Initramfs](https://en.wikipedia.org/wiki/Initial_ramdisk), also called early userspace, is the first place a Linux user 
is likely to spread their bash-spaghetti in the boot-process.  

The initramfs is a ram-contained (in-memory) file-system, [it can be baked into the kernel](https://cateee.net/lkddb/web-lkddb/INITRAMFS_SOURCE.html), 
or provided where the kernel can find it during the boot process. Its purpose is to set up user-space so that it's ready 
enough for `init` to take over execution. Here is where disk-decryption happens in the case of `cryptsetup`.  

The Initramfs-stage ends by handing over execution to `init`:

`exec switch_root <root-partition> <init>`, an example could be `exec switch_root /mnt/root /sbin/init`,
by convention, `init` is usually found at `/sbin/init`.  

The initramfs prepares user-space, while `init` "starts" it, e.g. processes, such as [dhcpcd](https://wiki.archlinux.org/title/dhcpcd), 
are taken care of by `init`.  

### Init
Init is the first userspace process to be started, the parent to all other processes, it has PID 1 and if it dies,
the kernel panics.
Init could be any executable, like [Bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)).  

In an example system where bash is init, the user will be dropped into the command-line, in a bash shell, at the destination that the 
initramfs specified in `switch_root`. From a common user's perspective this is barely a functional system, it has no internet, 
it will likely not have connections to a lot of peripheral devices, and there is no login management.  

#### Init daemon
Usually Linux systems have an init daemon. Some common init-daemons are [systemd](https://en.wikipedia.org/wiki/Systemd), [openrc](https://en.wikipedia.org/wiki/OpenRC), 
and [runit](https://en.wikipedia.org/wiki/Runit).  
The init daemon's job is to start processes that make the system usable, up to the user's specification. Usually it 
will start `udev` to get device events and populate `/dev` with device interfaces, as well as ready internet interfaces 
and start login management.  

## DIY initramfs
I wanted at least basic security, this means encrypted disks, if I lose my computer, or it gets stolen, I can be fairly sure that 
the culprits won't get access to my data without considerable effort.  
Looking back up over the steps, it means that I need to create an initramfs, so that my disks can be decrypted on boot. 
There are tools to create an initramfs, [dracut](https://en.wikipedia.org/wiki/Dracut_(software)) being 
one example, [mkinitcpio](https://wiki.archlinux.org/title/Mkinitcpio) that Arch Linux uses is another.  

Taking things to the most absurd level, I figured I'd write my own initramfs instead.  

### The process
The most basic decrypting initramfs is just a directory which could be created like this:
```bash
[gramar@grentoo /home/gramar/misc/initramfs]# touch init
[gramar@grentoo /home/gramar/misc/initramfs]# chmod +x init
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir -p mnt/root
[gramar@grentoo /home/gramar/misc/initramfs]# ls -lah
total 12K
drwxr-xr-x 3 gramar gramar 4.0K Mar 21 15:11 .
drwxr-xr-x 4 gramar gramar 4.0K Mar 21 15:11 ..
-rwxr-xr-x 1 gramar gramar    0 Mar 21 15:11 init
drwxr-xr-x 3 gramar gramar 4.0K Mar 21 15:11 mnt
```

The init contents being this: 
```bash 
#!/bin/bash
cryptsetup open /dev/disk/by-uuid/<xxxx> croot # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> cswap # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> chome # Enter password
# Mount filesystem
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 
# Hand over execution to init
exec switch_root /mnt/root /sbin/init
```

If we point the kernel at this directory, build it, and then try to boot it, we'll find out that this doesn't work at all, 
and if you somehow ended up here through Googling and copied that, I'm sorry.  

One reason for this is that `/bin/bàsh` does not exist on the initramfs, we can't call it to execute the commands in the scripts.  

If we add it, for example by: 
```bash
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir bin
[gramar@grentoo /home/gramar/misc/initramfs]# cp /bin/bash bin/bash
```
Then try again, it still won't work and will result in a kernel panic.  
The reason is that bash (if you didn't build it yourself using dark magic), is dynamically 
linked, we can see that this is indeed the case using [ldd](https://en.wikipedia.org/wiki/Ldd_(Unix)) 
to list dynamic dependencies.  

```bash
[gramar@grentoo /home/gramar/misc/initramfs]# ldd bin/bash
        linux-vdso.so.1 (0x00007ffc7f9a1000)
        libreadline.so.8 => /lib64/libreadline.so.8 (0x00007fd040f06000)
        libtinfo.so.6 => /lib64/libtinfo.so.6 (0x00007fd040ec6000)
        libc.so.6 => /lib64/libc.so.6 (0x00007fd040cf3000)
        libtinfow.so.6 => /lib64/libtinfow.so.6 (0x00007fd040cb2000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fd04104f000)
```

Now we can just try to appease `Bash` here and copy these dependencies into the initramfs at the appropriate places, 
but there are quite a few files, and we risk cascading dependencies, what if we need to update and the dependencies have changed?  

And how about `cryptsetup`, `mount`, `swapon`, and `switch_root`?

#### Static linking and BusyBox
Many of the tools used to interface with Linux (usually) come from [GNU coreutils](https://en.wikipedia.org/wiki/GNU_Core_Utilities).  
There are other sources however, like [the Rust port](https://github.com/uutils/coreutils), but the most popular is likely 
[BusyBox](https://en.wikipedia.org/wiki/BusyBox).  

BusyBox is a single binary which on my machine is 2.2M big, it contains most of the coreutils.  
One benefit of using BusyBox is that it can easily be [statically linked](https://en.wikipedia.org/wiki/Static_library) 
which means that copying that single binary is enough, no dependencies required.  
Likewise `cryptsetup` can easily be statically linked. 

### Busybox initramfs
The binaries are placed in the initramfs. (I realize that I need a tty, console, and null to run our shell 
so I copy those too).  

```bash
[gramar@grentoo /home/gramar/misc/initramfs]# cp /bin/busybox bin/busybox
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir sbin        
[gramar@grentoo /home/gramar/misc/initramfs]# cp /sbin/cryptsetup sbin/cryptsetup
[gramar@grentoo /home/gramar/misc/initramfs]# cp -a /dev/{null,console,tty} dev
```

And then change the script's [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)).  

```bash 
#!/bin/busybox sh
export PATH="/bin:/sbin:$PATH"
cryptsetup open /dev/disk/by-uuid/<xxxx> croot # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> cswap # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> chome # Enter password
# Mount filesystem
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 
# Hand over execution to init
exec switch_root /mnt/root /sbin/init
```

Finally, we can execute the init script at boot time, and immediately panic again, `cryptsetup` can't find the disk.

### Udev
There are multiple ways to address disks, we could for example, copy the disk we need in the initramfs as it shows up 
under `/dev`, `cp -a /dev/sda2 dev`.  But the regular disk naming convention isn't static, `/dev/sda` might be tomorrow's 
`/dev/sdb`. Causing an un-bootable system, ideally we would specify it by uuid.  

Udev is a tool that finds devices, listens to device events, and a bit more. What we need it for, is to populate 
`/dev` with the devices that we expect.  

I call it Udev because it's ubiquitous, it's actually a [systemd project](https://en.wikipedia.org/wiki/Udev).  
There is a fork, that used to be maintained by the Gentoo maintainers, [Eudev](https://en.wikipedia.org/wiki/Systemd#Forks_and_alternative_implementations).  
Both of the above are not ideal for an initramfs, what we'd really like is to just oneshot generate `/dev`.  
Luckily for us, there is a perfect implementation that does just that, contained within BusyBox, [Mdev](https://wiki.gentoo.org/wiki/Mdev).  

To save us from further panics, I will fast-forward through discovering that we need to mount three pseudo-filesystems 
to make mdev work, `proc`, `sys`, and `dev` (`dev` shouldn't be that surprising). We also need to create the mount points.  

```bash
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir proc
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir dev
[gramar@grentoo /home/gramar/misc/initramfs]# mkdir sys
```

### Working initramfs


```bash 
#!/bin/busybox sh
export PATH="/bin:/sbin:$PATH"

# Mount pseudo filesystems
mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev

# Mdev populates /dev with symlinks
mdev -s

cryptsetup open /dev/disk/by-uuid/<xxxx> croot # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> cswap # Enter password
cryptsetup open /dev/disk/by-uuid/<xxxx> chome # Enter password

# Mount filesystem
mount /dev/mapper/croot /mnt/root
mount /dev/mapper/chome /mnt/root/home
swapon /dev/mapper/cswap 

# Unmount the pseudo filesystems, except dev which is now busy.  
umount /proc
umount /sys

# Hand over execution to init
exec switch_root /mnt/root /sbin/init
```

### Ergonomics
This setup requires me to enter my password three times, which is easily fixed by saving it in a variable and piping 
it into `cryptsetup`.  

## Reflections on security
While the above setup works, it has less security than my last.  
I boot directly into my kernel which now must be unencrypted, and could therefore be tampered with.  
This is a different attack-surface than the last considered one: I lose my laptop. It's: Someone tampers with my 
boot process to get access to my data on subsequent uses.  

### Bootloader tampering
Depending on your setup, your bootloader (kernel in this case) may be more or less subject to tampering.  
Usually, one would have the bootloader in a `/boot` directory, which may or may not be on a separate partition.  

If that directory is writeable only by root, it doesn't really matter if it's on an unmounted partition or not.  
Someone with root access to your machine could edit the contents (or mount the partition and then edit the contents).  
That means that if someone has root access to your machine then your bootloader could be tampered with remotely.  

#### Evil maids
Another possible avenue of compromise is if someone has physical access to the disk on which you store your bootloader.  
I am not a high-value target, as far as I know at least, and that kind of attack, also known as an [evil maid attack](https://en.wikipedia.org/wiki/Evil_maid_attack) 
is fairly high-effort to pull off.  The attacker needs to modify my kernel without me noticing, which for me as a target, 
again, is pretty far-fetched.  

But this is not about being reasonable, it's never been about that, it's about taking things to the extreme.  

### Encrypting the kernel
The problem with encrypting the kernel is that something has to decrypt it, we need to move further down the boot-chain.  
I need to, at the UEFI level, decrypt and then hand over execution to the kernel image.  

## Writing a bootloader
I hinted earlier at UEFI being able to run Rust binaries, indeed there is an [UEFI](https://github.com/rust-osdev/uefi-rs) target 
and library for Rust.  

### Encrypt and Decrypt without storing secrets
We can't have the bootloader encrypted, it needs to be a ready UEFI image.  
This means that we can't store decryption keys in the bootloader, it needs to ask the user for input 
and deterministically derive the decryption key from that input.  

Best practice for secure symmetric encryption is [AES](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard), 
since I want the beefiest encryption, I opt for AES-256, that means that the decryption key is 32 bytes long.  

Brute forcing a random set of 32 bytes is currently not feasible, but passwords generally are not random and random brute forcing 
would not likely be the method anyone would use to attack this encryption scheme.  
What is more likely is that a password list would be used to try leaked passwords, 
or dictionary-generated passwords would be used.  

To increase security a bit, the 32 bytes will be generated by a good key derivation function, at the moment [Argon2](https://en.wikipedia.org/wiki/Argon2) 
is the best tool for that as far as I know. This achieves two objectives:
1. Whatever the length of your password, it will end up being 32 random(-ish) bytes long.  
2. The time and computational cost of brute forcing a password will be extended by the time it takes to 
run argon2 to the derive a key from each password that is attempted.  

This leaves the attacker with two options: 
1. Randomly try to brute force every 32 byte combination, which is unfeasible.  
2. Use a password list and try every known or generated password after running argon2 on it.  

Option 2 may or may not be unfeasible, depending on the strength of the password, transforming a bad password 
into 32 bytes doesn't do much if the password doesn't take enough attempts to guess.  

### Uefi development
I fire up a new virtual machine, with UEFI support, and start iterating. The development process was less painful than 
I thought that It would be. The caveat being that I am writing an extremely simple bootloader, it finds the kernel 
on disk, asks the user for a password, derives a key from it using Argon2, decrypts the kernel with that key, and 
then hands over execution to the decrypted kernel. The code for it can be found at [this repo](https://github.com/MarcusGrass/boot-rs).  

## New reflections on security
All post-boot content, as well as the kernel is now encrypted, the kernel itself is read straight into RAM and then executed, 
the initramfs decrypts the disks after getting password input, deletes itself, and then hands over execution to `init`.  

### Bootloader compromise
There is still one surface for attack, the unencrypted bootloader.  
A malicious actor could replace my bootloader with something else, take my keyboard input, and decrypt my kernel.
Or an attacker could replace my bootloader, take my keyboard input (possibly just discarding it), then boot into a malicious kernel where I enter 
my decryption keys, and decrypt my disks.  

### Moving cryptodisk secrets into the initramfs
Since the initramfs is now encrypted, an ergonomic move is to create a new decryption key for my disks, 
move that into the initramfs, then use those secrets to decrypt the disks automatically during that stage.  

The "boot into malicious kernel attack", becomes more difficult to pull off.
I'd notice if my disks aren't being automatically decrypted.  

## Secure boot
Some people think Secure Boot and UEFI in general is a cynical push by Microsoft to force Linux desktop user share 
down to zero (from close to zero).  Perhaps, but Secure Boot can be used to add some security to the most sensitive part 
of our now fairly secured boot process.  

Secure Boot works by only allowing the UEFI firmware to boot from images that are signed by its stored cryptographic keys.  
Microsoft's keys are (almost) always vendored and exist in the store by default, but they can be removed (kind of) and 
replaced by your own keys.  

The process for adding your own keys to Secure Boot, as well as signing your bootloader, will be left out of this write-up.  

# Final reflections on security
Now my boot-process is about as secure as I am capable of making it while retaining some sense of ergonomics.  
The disks are encrypted and can't easily be decrypted. The kernel itself is decrypted and I would notice if it's replaced 
by something else through the auto-decryption.  
The bootloader cannot be exchanged without extracting my setup password.  

The main causes of concerns are now BUGS, and still, evil maids.
1. Bugs in secure boot.
2. Bugs in my implementation.
3. Bugs in the AES library that I'm using.
4. Bugs in the Argon2 library that I'm using. 
5. Bugs in `cryptsetup`.  
6. Bugs everywhere.  

But those are hard to get away from. 

# Epilogue
I'm currently using this setup, and I will for as long as I use Gentoo I would guess. 
Once set up it's pretty easy to re-compile and re-encrypt the kernel when it's time to upgrade.  

Thanks for reading!
