#!/bin/sh
set -ex
git checkout -b tmp-pages
rm .gitignore
printf "target\n.idea\n*.iml" > .gitignore
trunk build --release
git config --global user.email ci@gmail.com
git config --global user.name CiAuthor
git add .
git commit -m "publish latest"
git checkout gh-pages
git reset --hard tmp-pages
git push -f origin gh-pages
git branch -D tmp-pages