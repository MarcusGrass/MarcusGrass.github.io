# Github pages site code

Hosted results at [the pages](https://marcusgrass.github.io/test).

## Notes to self about weirdness in the repo

### CI

Publishing to CI does a lot of git weirdness, creates a tmp branch
removes gitignore, then force pushes from that to `gh-pages`

### Build

The build-script builds markdown files to .html and then imports them
and creates a 