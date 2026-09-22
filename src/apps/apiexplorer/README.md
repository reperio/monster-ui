# Monster UI API Explorer

The `apiexplorer` App (display label **API Explorer**) is an in-UI developer tool for
issuing arbitrary **Crossbar API** requests and inspecting their responses — a hands-on
way to explore Kazoo's REST endpoints from within the UI. It is vendored in-tree under
`src/apps/apiexplorer/` and built directly by the monster-ui gulp workflow — there is no
separate clone or install step.

Like `callflows`, this App carries a framework-level third-party dependency: `highlight.js`
(syntax-highlighting for JSON responses). Its engine is vendored into the shared set
(`src/js/vendor/highlight.pack.js`) and registered in `src/js/main.js` (`hljs` path); the
`xcode` theme it uses stays app-local (`style/xcode.css`, loaded via the App's own `css`
array). Its other library, `clipboard.js`, was already present in the shared vendor set.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for
this App's provenance.
