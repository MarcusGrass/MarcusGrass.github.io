#!/bin/sh
trunk build --release
git subtree push --prefix dist origin gh-pages