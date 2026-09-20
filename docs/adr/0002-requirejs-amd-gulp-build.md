# RequireJS/AMD modules with a gulp + r.js build

Monster UI loads code as **AMD modules via RequireJS** and builds with **gulp** driving the
**RequireJS optimizer (`r.js`)**, Handlebars precompilation, and node-sass. This predates
modern bundlers (Webpack, Vite, esbuild) and is deliberately retained rather than migrated: the
entire App loading model, the `define(function(require) {...})` convention in every `app.js`,
and the dynamic on-demand loading of Apps are built on AMD semantics. Swapping the module system
would touch every App and the framework core at once, so it is treated as fixed architecture.

## Consequences

- New code uses `define`/`require` AMD style, not ES modules or `import`.
- Build and dev-server behavior is defined by the `gulp` tasks (`build-dev`, `build-prod`,
  `serve-*`), not an `npm`/bundler toolchain.
- Bringing in a modern library often requires shimming it into the RequireJS config.
