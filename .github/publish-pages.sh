#!/bin/sh
set -e
git checkout -b tmp-pages
rm .gitignore
echo "target\n.idea\n*.iml" > .gitignore
trunk build --release
git add .
git commit -m "publish latest"
git checkout gh-pages
git reset --hard tmp-pages
git push -f origin gh-pages
git branch -D tmp-pages