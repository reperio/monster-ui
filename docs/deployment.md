title: Deployment

# Deployment

What a web server needs to know to serve the output of [`gulp build-prod`](building.md#build-prod) (`/dist`) with the right caching. How to set up the server is up to you. This page only says which files may be cached and why.

## Cache headers

| Requests | Cache | Why |
| --- | --- | --- |
| `index.html`, `build-config.json`, `VERSION` | **no-cache** (revalidate every load) | Their URLs never change. `index.html` holds the keys for the **Initial Load** files, so a stale copy pins the browser to the previous release. |
| Any URL whose `v` query parameter is a 10-character hex hash (`?v=0123abcdef`, or `&v=…`) | Long-lived (e.g. `Cache-Control: public, max-age=31536000, immutable`) | The build writes these keys, and they change whenever the content does (see below). This covers `js/main.js`, `css/style.css`, `js/templates.js` and every file RequireJS fetches. |
| Everything else | **no-cache** | These URLs don't change with their content. |

`no-cache` still lets the browser keep a copy and revalidate it with a `304`. It does not mean `no-store`.

"Everything else" is more than those three files. The key **must** be a hash, not just any `v`. Not yet keyed by content:

- Per-App `VERSION` and `app-build-config.json`, and data files fetched over XHR. Their URLs are fixed.
- App i18n, plus the views and `app.css` of an App outside the Initial Load. `monster.util.cacheUrl` keys them with `v=<App version>` (e.g. `v=4.3.0`), and that version doesn't change when the content does.
- Images and fonts referenced from CSS, and `js/vendor/require-*.min.js`.
- An App deployed on its own after the framework build (`gulp build-app`, or served from another source). RequireJS still fetches it with the framework's release id, so that key doesn't change when the App does. Serve such Apps' folders no-cache, or rebuild the framework when one changes.

On nginx, for example: `map $arg_v $static_cache { ~^[0-9a-f]{10}$ "public, max-age=31536000, immutable"; default "no-cache"; }` and then `add_header Cache-Control $static_cache;`.

## How the URLs are keyed

`build-prod` runs a `cacheBust` step over the finished output, in this order:

1. **Release id**: a 10-character SHA-256 of every file in the build tree (path and content). The tree still includes sources that never reach `/dist`, such as `.scss` files and Apps' `tests/`. An identical build gets the same id. Any change gives a new one, sometimes for a change that didn't ship.
2. **`js/templates.js`** is hashed, and the built `js/main.js`'s RequireJS config gets `paths: { templates: 'js/templates.js?v=<templates hash>' }` (a path with a query gets no `.js` added, so it is written out). The config sets **`urlArgs: 'v=<release id>'`**, replacing the source's timestamp bust. So every RequireJS fetch (Apps' `app.js`, common's Submodules, vendor libraries outside the bundle) is keyed to the release, and `templates.js` is fetched as `js/templates.js?v=<templates hash>&v=<release id>`.
3. **`js/main.js`** (after step 2) and **`css/style.css`** are hashed.
4. **`index.html`** is rewritten to load `js/main.js?v=<main hash>` and `css/style.css?v=<style hash>`.

The step fails the build if it can't find the `require.config({ urlArgs })` call or its `templates` path in `js/main.js`, or exactly one reference to `js/main.js` and to `css/style.css` in `index.html`.

Because `urlArgs` is still global, every RequireJS-fetched file gets a new URL on each release, changed or not. Repeat loads within a release are served from cache. Giving each App its own key is left to later work.

## Development builds

`gulp build-dev` / `gulp serve-dev` skip this step. `src/js/main.js` keeps `urlArgs: 'bust=' + (new Date()).getTime()`, so dev re-fetches everything on every load.
