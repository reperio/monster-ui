# Common Controls load on first publish via stub subscribers

`common` is a Preloaded App. Core loads it at login, and until now that fetched all 34 of its
Submodules as loose, unminified files (603 KB raw), while their views made up most of
`templates.js` (about 470 KB raw). Most of these **Common Controls** (port wizard, numbers manager,
service plan editor…) are opened rarely, and only from Lazy Apps. Callers reach every one of them
through `monster.pub('common.<control>.<action>', payload)`, which postal delivers synchronously,
fire-and-forget. Submodules never call each other's methods (decided in #40).

We split `common` into an **eager core**, bundled into `main.js`, and **one lazy chunk per other
Submodule**. Each chunk is the Submodule's JS with its views folded in, minified and ES5-transpiled
like an App bundle. `common` subscribes a **stub** to every topic of each lazy Submodule. The first
publish of any of those topics `require()`s the chunk. The loader's existing `requireSubModule`
merges it into `common` and subscribes its real handlers, and its `requests` are defined. The
stubs for that Submodule then unsubscribe, and every publish they received, the first and any that
arrived during the load, is published again, in order. Callers don't change.

- **Eager core.** A Submodule is eager when (a) the framework or a Preloaded App publishes it, or
  (b) a caller does DOM work right after `pub` and so needs it to render synchronously. Today the
  core is `accountBrowser` (core), `cidNumber` (`monster.ui`), `webphone` (`monster.webphone`) and
  `numberFeaturesMenu` (voip `groups`/`users` call `monster.ui.tooltips` right after publishing
  it). The #52 audit of every `common.*` publish site found nothing else. The list lives in
  `eagerCores` in `gulp/helpers/helpers.js`.
- **Topic map, generated.** The build reads each lazy Submodule's `subscribe` keys and writes
  `lazySubModules` (`{ common: { topic: Submodule } }`) into `build-config.json`, in dev and prod
  alike. Only `common.*` topics get stubs. Others (`conferenceViewer`'s `socket.connected`) are
  subscribed once the Submodule is loaded, since they only react to something it rendered. The
  build fails if two Submodules subscribe one topic, or if a lazy Submodule has no `common.*`
  topic.
- **Dev takes the same path.** The stubs `require()` the Submodule's source, so bugs that only
  show up on an asynchronous first use appear locally too.
- **CSS stays global.** All of `common`'s CSS stays in `style.css` (#37). There is no CSS loader
  for first use.
- With no `lazySubModules` in `build-config.json`, every Submodule loads at start, as before.

## Considered options

- **Feature groups** (for example, all porting controls in one chunk). Fewer requests, but a
  hand-kept grouping that drifts. Chained loads (numbers → numberFeaturesMenu → e911) are small
  same-origin fetches.
- **Changing callers** to wait on a promise or callback before using a control. That would touch
  every App and break the pub/sub contract for third-party Apps. With stubs, nothing outside
  `common` and the loader changes.
- **Keeping `common` whole.** It is the single biggest piece of the Initial Load that most
  sessions never use.

## Consequences

- The first use of a lazy control runs its handler asynchronously, after one fetch. A caller that
  depends on the control having rendered by the time `pub` returns breaks on that first use only.
  Such a control belongs in the eager core: add it to `eagerCores`.
- The stubs unsubscribe **before** they publish again, so the replay reaches only the real
  handlers. If a chunk fails to load, its queued publishes are dropped and an error is logged.
  The stubs stay, so the next publish tries again.
- A library that several chunks (or a chunk and a Lazy App) bundle is reported by `build-prod`,
  like one shared by several Apps, and goes in `libsSharedByApps` (today: `papaparse`).
- Each chunk is cache-keyed through `cacheKeys.requirePaths` in `build-config.json`.
  `gulp size-report` lists each chunk, and what `common` still fetches at login outside the trio
  (reported, not budgeted).
- A Submodule added to `common` is lazy by default, and its topics are picked up with no list to
  update.
