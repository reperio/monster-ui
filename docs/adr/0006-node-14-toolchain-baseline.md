# Node 14 as the toolchain baseline

The build toolchain targets **node 14** (pinned to `14.21.3` in `.nvmrc`, declared as
`"engines": { "node": ">=14" }` in `package.json`). Although the README historically stated
`node >= 12`, node 12 cannot actually build this repo: the `node-sass ^8.0.0` dev dependency
that compiles the Sass sources requires `node >= 14` (its native binding declares
`{ "node": ">=14" }`). Node 12 would fail to install or run `gulp`. Node 14 is also what CI
already builds on (`2600hz/node-packager:14-rockylinux-9`), so pinning 14 aligns local
development with CI rather than introducing a new version.

Node 14 itself is end-of-life upstream, but it is retained here rather than jumped to a newer
LTS because the existing native and legacy dependencies (`node-sass`, the babel 6 /
`gulp-*` toolchain) are validated against it and CI runs on it. Moving to a newer node is a
larger, separate migration that would likely require replacing `node-sass` with dart-sass and
revalidating the gulp pipeline.

## Consequences

- Contributors should use node 14 (`nvm use` reads `.nvmrc` → `14.21.3`). `npm` will warn on
  other versions via the `engines` field.
- The Sass engine stays `node-sass`; a future node upgrade will need it swapped for dart-sass.
- The "node >= 12" figure that may still appear in older docs or upstream is inaccurate for
  this fork and should read node >= 14.
