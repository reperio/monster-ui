#!/bin/bash

# Apps are vendored in-tree under src/apps/; there is no separate per-app repo
# to pull before serving. See docs/adr/0007-vendor-apps-in-tree.md.

docker run --rm -it \
       --net=host \
       -v "$PWD":/var/www \
       node:14 \
       /bin/bash -c 'npm install -g npm && npm install -g gulp && cd /var/www && npm install && gulp'
