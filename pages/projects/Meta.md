# Writing these pages

I did a number of rewrites of this web application, some of which could probably be
found in the repository's history.  
The goal has changed over time, but as with all things I wanted to create something that's as small as possible,
and as fast as possible, taken to a ridiculous and counterproductive extent.

## Rust for frontend

Rust can target [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly) through its target
`wasm32-unknown-unknown`, which can then be run on the web. Whether this is a good idea or not remains to be seen.

I've been working with `Rust` for a while now, even written code targeting `wasm`, but hadn't yet written anything
to be served through a browser using `Rust`.

After thinking that I should start writing things down more, I decided to make a blog to collect my thoughts.  
Since I'm a disaster at front-end styling I decided that if I could get something to format markdown, that's good
enough.  
I could have just kept them as `.md` files in a git-repo, and that would have been the reasonable thing to do,
but the concept of a dedicated page for it spoke to me, with GitHub's free hosting I started looking for alternatives
for a web framework.

## SPA

An SPA ([Single Page Application](https://en.wikipedia.org/wiki/Single-page_application)), is a web application where
the user doesn't have to follow a link and load a new page from the server to navigate to different pages of the
application. It dynamically injects html based on path. This saves the user an http round trip when switching
pages within the application, causing the application to feel more responsive.

I've worked with SPAs a bit in the past with the [Angular](https://angular.io/) framework, and I wanted to see if I
could implement an SPA using Rust.

## Yew

I didn't search for long before finding [yew](https://yew.rs/), it's a framework for developing front-end applications
in `Rust`. It looked pretty good so I started up.

I like how `Yew` does things, you construct `Components` that pass messages and react to them, changing their state
and maybe causing a rerender.
Although, I have a personal beef with `macros` and especially since `0.20` `Yew` uses them a lot,
but we'll get back to that.

My first shot was using [pulldown-cmark](https://github.com/raphlinus/pulldown-cmark) directly from the `Component`.  
I included the `.md`-files as `include_str!(...)` and then converted those to html within the component at view-time.

### How the page worked

The page output is built using [Trunk](https://trunkrs.dev/) a `wasm` web application bundler.

`trunk` takes my wasm and assets, generates some glue javascript to serve it, and moves it into a `dist` directory along
with my `index.html`. From the `dist` directory, the web application can be loaded.

The code had included my `.md`-files in the binary, a `const String` inserted into the `wasm`. When a
page was to be loaded through navigation, my `component` checked the path of the `url`, if for example it was
`/` it would select the hardcoded string from the markdown of `Home.md`, convert that to `html` and then inject
that html into the page.

### Convert at compile time

While not necessarily problematic, this seemed unnecessary, since the `.md`-content doesn't change and is just
going to be converted, I might as well only do that once.
The alternatives for that is at compile time or at application load time, opposed to what I was currently doing,
which I guess would be called `render time` or `view-time` (in other words, every time content was to be injected).

I decided to make build-scripts which takes my `.md`-pages, and converts them to `html`, then my application
could load that `const String` instead of the old one, skipping the conversion step and the added binary dependency of
[pulldown-cmark](https://github.com/raphlinus/pulldown-cmark).

It was fairly easily done, and now the loading was (theoretically) faster.

### Styling

I wanted my markdown to look nice, the default markdown-to-html conversion rightfully doesn't apply any styling.
As someone who is artistically challenged I needed to find some off-the-shelf styling to apply.

I thought GitHub's `css` for their markdown rendering looks nice and wondered if I could find the source for it,
after just a bit of searching I found [github-markdown-css](https://github.com/sindresorhus/github-markdown-css), where
a generator for that `css`, as well as already generated copies of it. I added that too my page.

### Code highlighting

Code highlighting was difficult, there are a few alternatives for highlighting.  
If I understood it correctly, GitHub uses something similar to [starry-nigth](https://github.com/wooorm/starry-night).  
Other alternatives are [highlight.js](https://highlightjs.org/) and [Prism](https://prismjs.com/).  
After a brief look, `highlight.js` seemed easy to work with, and produces some nice styling, I went with that.

The easiest way of implementing `highlight.js` (or `prism.js`, they work essentially the same), is to load a  
`<script src="highlight.js"></script>` at the bottom of the page body. Loading the script calls the
`highlightAll()` function, which takes code elements and highlights them.  
This turned out to not be that easy the way I was doing things.  
Since I was rendering the body dynamically, previously highlighted elements would be de-highlighted on navigation,
since the `highlightAll()` function had already been called. While I'm sure that you can call js-functions from `Yew`,
finding how to do that in the documentation is difficult. Knowing when the call them is difficult as well,
as many comprehensive frameworks, they work as black boxes sometimes. While it's easy to look at page-html with
`javascript` and understand what's happening and when, it's difficult to view corresponding `Rust` code and know when
an extern `javascript` function would be called, if I could figure out how to insert such a call in the `component`.  
I settled for not having highlighting and continued building.

### Navigation

I wanted a nav-bar, some [hamburger menu](https://en.wikipedia.org/wiki/Hamburger_button) which would unfold and
give the user access to navigation around the page. Constructing that with my knowledge of css was a disaster.  
It never scaled well, it was difficult putting it in the correct place, and eventually I just gave up
and created a navigation page `.md`-style, like all other pages in the application.  
I kept a menu button for going back to home, or to the navigation page, depending on the current page.

An issue with this is that links in an `.md`-file, when converted to `html`, become regular `<a href=".."` links,
which will cause a new page-load. My internal navigation was done using `Yew` callbacks, swapping out
page content on navigation, that meant I'd have to replace those `href` links with `Yew` templating.
I decided to make my build script more complex, instead of serving raw converted `html`, I would generate small
rust-files which would convert the `html` into `Yew`'s `html!` macro. This was ugly in practice, html that looked like
this

```html

<div>
    Content here
</div>
```

Would have to be converted to this:

```rust
yew::html! {
    <div>
        {{"Content here"}}
    </div>
}
```

Any raw string had to be double bracketed then quoted.  
Additionally, to convert to links, raw `html` that looked like this:

```html
<a href="/test">Test!</a>
```

Would have to be converted to this:

```rust
yew::html! {
    <a onclick={move |_| scope.navigator.unwrap().replace(&Location::Test)}>Test!</a>
}
```

On top of that, the css specifies special styling for `<a>` which contains `href` vs `<a>` which doesn't.  
That was a fairly easy to change, from this:
`.markdown-body a:not([href])` to this `.markdown-body a:not([href]):not(.self-link)` as well as
adding the class `self-link` to the links that were replaced.  
Some complexity was left out, such as the `scope` being moved into the function, so I had to generate a bunch of
`scope_n` at the top of the generated function from which the `html` was returned.

In the end it worked, an internal link was replaced by a navigation call, and navigation worked from my `.md`
navigation page.

The page was exactly how I wanted.

### Yew page retrospective

Looking at only the `wasm` for this fairly minimal page, it was more than `400K`. To make the page work
I had to build a complex build script that generated `Rust` code that was valid with the `Yew` framework.  
And to be honest, since bumping `Yew` from `0.19` to `0.20` during this process, seeing a turn towards even heavier
use of macros for functionality. I didn't see this as maintainable even in the medium term.  
I had a big slow page which probably wouldn't be maintainable where highlighting was tricky to integrate.

## RIIJS

I decided to rewrite the page in javascript, or rather generate javascript from a `Rust` build script and skip
`Yew` entirely.  
It took less than two hours and the size of the application was now `68K` in total, and much less complex.

The only dependencies now were pulldown-cmark for the build script, I wondered if I could get this to be even smaller.  
I found a `css` and `js` minifier written in `Rust`: [minifier-rs](https://github.com/GuillaumeGomez/minifier-rs).

After integrating that, the page was down to `60K`, about `7` times smaller than before.  
Doing it in `javascript` also made it easy to apply highlighting again. I went back and had another look, finding
that `Prism.js` was fairly tiny, integrating that made highlighting work, bringing to page size to a bit over `70K`.

I wasn't completely content with highlighting being done after the fact on a static page, and if that was to be
off-loaded
I might as well go with the massive [starry-night](https://github.com/wooorm/starry-night) library.  
Sadly this meant creating a build-dependency on `npm` and the dependency swarm that that brings. But in the
end my page was equally small as with `prism`, and doing slightly less work at view-time, with some nice highlighting.

## In defense of Yew

`Yew` is not a bad framework, and that's not the point of this post. The point is rather the importance of
using the best tool for the job. `wasm` is not necessarily faster than `javascript` on the web, and if not doing
heavy operations which can be offloaded to the `wasm`, the complexity and size of a framework that utilizes it may not
be worth it. This page is just a simple collection of html with some highlighting, anything dynamic on the page
is almost entirely in the scope of `DOM` manipulation, which `wasm` just can't handle at the moment.

## CI

Lastly, I wanted my page to be rebuilt and published in CI, and I wanted to not have to check in the `dist` folder,
so I created a pretty gnarly `bash`-script. The complexity isn't the bad part, the bad part is the
chained operations where each is more dangerous than the last.  
In essence, it checks out a temporary branch from main, builds a new `dist`, creates a commit, and then
force pushes that to the `gh-pages` branch. If this repo's history grows further in the future,
I'll look into making it even more destructive by just compacting the repo's entire history into one commit and
pushing that to that branch. But I don't think that will be necessary.

## Rants on macros and generics

I like some of the philosophies of `Yew`, separating things into `Components` that pass messages. But, seeing
the rapid changes and the increasing use of proc-macros that do the same things as structs and
traits, only more opaquely, makes me fear that web development in `Rust` will follow the same churn-cycle as
`javascript`. What I may appreciate most about statically, strongly typed languages is that you know the type
of any given object. Macros and generics dilute this strength, and in my opinion should be used sparingly
when creating libraries, although I realize their respective strength and necessity at times.
I believe that adding macros creates a maintenance trap, and if what you're trying to do can already be
done without macros I think that's a bad decision by the authors.
Macros hide away internals, you don't get to see the objects and functions that you're calling,
if a breaking change occurs, knowing how to fix it can become a lot more difficult as you may have
to re-learn both how the library used to work internally, and the way it currently works, to preserve the old
functionality.  
`</rant>`
