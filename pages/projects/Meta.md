# Writing these pages

This will be short, I did a number of rewrites, some which could probably be
found in this repository history.

## Rust for frontend

Rust can target [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly) through its target
`wasm32-unknown-unknown`, which can then be run on the web. Whether this is a good idea or not remains to be seen.

I've been working with `Rust` for a while now, even written code targeting `wasm`, but hadn't yet written anything
to be served through a browser using `Rust`.

After thinking that I should start writing things down more, I decided to make a blog to collect my thoughts.  
Since I'm a disaster at front-end styling I decided that if I could get something to format markdown, that's good
enough.  
I could have just kept them as .md files in a git-repo, and that would have been the reasonable thing to do,
but the concept of a dedicated page for it spoke to me, with GitHub's free hosting I started looking for alternatives
for a web framework.

## Yew

I didn't search for long before finding [yew](https://yew.rs/), it's a framework for developing front-end applications
in `Rust`. It looked pretty good so I started up.

I like how `Yew` does things, you construct `Components` that pass messages and react to them, changing their state.
Although, I have a personal beef with `macros` and especially since `0.20` `Yew` uses them a lot.

My first shot was using [pulldown-cmark](https://github.com/raphlinus/pulldown-cmark) directly from the `Component`.  
I included the `.md`-files as `include_str!(...)` and then converted those to html withing the component at view-time.  
