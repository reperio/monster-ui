# Transpile bundled sources to ES5 in the production build

The production build's two parsers are ES5-only: the esprima that r.js bundles (used to trace
dependencies even with `optimize: 'none'`) and `gulp-uglify` (UglifyJS 2.x, which minifies
`main.js`). Vendored Apps are not reliably ES5. `recordings` uses optional chaining, and template
literals appear across `accounts`, `voip`, `callflows`, `common`, `core` and `apploader`. That
broke `gulp build-prod` on `master` (#23). Nothing caught it because `build-dev` copies sources
verbatim. The inherited CircleCI config (the `2600hz/node-packager` image ADR-0006 refers to)
does run `build-prod`, but it is not connected to this fork, which reports no checks.

We fix the class rather than the instances. The r.js config's **`onBuildRead` hook runs every
bundled first-party module through Babel 7 (`@babel/preset-env`, ES5 target)** before esprima
sees it. The minifier then also receives ES5, so `gulp-uglify` stays in place and acts as a
final ES5 check on the bundle. **A GitHub Actions job runs `build-prod` on every PR and push to
`master`.**

## Considered options

- **Hand-converting sources to ES5** (what `switchboard` got). It is the smallest diff, but every
  newly vendored App would need the same care, and it breaks ADR-0007's near-faithful-copy goal.
- **Swapping `gulp-uglify` for terser.** That alone does not fix esprima, and once the input is
  ES5 it buys nothing.

## Consequences

- Two Babels coexist. Babel 6 (`babel-core`, `babel-register`, `.babelrc`) still transpiles only
  the gulpfile. Babel 7 (`@babel/core`) transpiles the App bundle, with `babelrc: false` /
  `configFile: false`, so it never reads the Babel 6 config. Babel 6 cannot parse optional
  chaining, which is why it is not reused.
- Babel runs with `sourceType: 'script'` and `modules: false`. Sources stay AMD scripts: no
  strict mode, no `"use strict"` and no module rewriting. `transform-typeof-symbol` is excluded
  so a helper isn't injected per file. No regenerator runtime is shipped. If an App ever adds
  `async`/generator functions, the build will still pass, but the output will reference
  `regeneratorRuntime`, which has to be provided.
- Only modules that r.js bundles are transpiled (`skipDirOptimize: true`). Prebuilt third-party
  code under `js/vendor/` and `js/lib/kazoo/dependencies/` is skipped. Files outside the bundle
  (lazy-loaded or fetched over XHR) are copied verbatim, as `build-dev` serves them.
- This retires the register's "uniform ES5-app convention" (`docs/vendored-apps.md`, e.g. the
  `switchboard` entry's hand-conversion). Bundled App code may use ES2015+ syntax, and the CI
  job is what enforces that it builds. That does not cover first-party files r.js does not trace
  (Apps on an exclude list, lazily loaded files). Those ship verbatim, as under `build-dev`, so
  they still need syntax that the target browsers can run.
