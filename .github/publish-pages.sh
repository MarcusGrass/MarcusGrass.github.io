#!/bin/sh
set -ex
git checkout -b tmp-pages
rm .gitignore
printf "target\n.idea\n*.iml\nnode_modules" > .gitignore
npm ci
cargo r -r
git config --global user.email ci@gmail.com
git config --global user.name CiAuthor
git fetch origin
git add .
git commit -m "publish latest"
git push origin `git subtree split --prefix dist tmp-pages`:gh-pages --force