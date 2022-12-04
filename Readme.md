# Github pages site code

Hosted results at [the pages](https://marcusgrass.github.io/test).

## Notes to self about weirdness in the repo

### CI

Publishing to CI does a lot of git weirdness, creates a tmp branch
removes gitignore, then force pushes from that to `gh-pages`

### Build

The build-script recursively searches under `pages`,
it takes all the mds there and converts them to `html`,
then it creates a corresponding folder structure under `src/pages`
where it puts the `html`-files, it then creates rust files and raw-imports
the html files and builds a corresponding module structure.

Therefore, no changes within `src/pages` is permanent across builds.

I should place this under target, but that's a hassle for my ide. We'll see if
I improve it.

