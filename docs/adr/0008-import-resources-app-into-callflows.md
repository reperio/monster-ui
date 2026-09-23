# Import the resources App into callflows instead of vendoring it as an App

The `kazoo-classic/monster-ui-resources` App is the only UI available to this project for
managing Kazoo **Resources** — the carrier gateways calls are routed out through. ADR-0007's
default answer would be to vendor it under `src/apps/resources/` as a faithful copy. We did
not. Its two working submodules were **imported into the vendored `callflows` App** as
`src/apps/callflows/submodules/globalresource/` and `.../localresource/`, and the rest of the
App — its shell, metadata, views, and assets — was discarded.

The reason is what that App actually is: a 2021 fork of the `callflows` App by a single
community author. Its `app.json` says so (`"author": "Emmanuel Balogun Edited From Callfow
App"`). Its root `views/` are callflows' views verbatim, its 43 images all already exist in
`callflows/style/static/images/`, its `style/icons.css` is byte-identical to callflows', its
`app.js` is a reduced copy of callflows' `app.js`, and its `views/entity-list.html` is
byte-identical to callflows'. Vendored as an App it would have duplicated ~3.3 MB of a sibling
App to deliver ~1,270 lines of new code.

More decisively, the working code was **written to run inside callflows** and only half-works
outside it. Both submodules register themselves through `callflows.fetchActions` with the
`listEntities` / `editEntity` contract that `callflows/app.js:379` uses to build its entity
manager, and both publish `callflows.user.popupEdit` — a topic `callflows/submodules/user/user.js`
subscribes to and six sibling callflows submodules publish in exactly the same way. Standalone,
that publish reaches nothing. Imported, it works. The App was a fork that never finished
separating.

## Considered options

- **Vendor as an App under `src/apps/resources/` (ADR-0007's default).** Rejected: duplicates a
  sibling App's shell and assets, and leaves the App cross-wired into `callflows`' pub/sub
  namespace anyway — loading it would inject its callflow action nodes into the Callflows App's
  action registry as an unowned side effect.
- **Import the submodules into `callflows` (chosen).** Costs `callflows` its status as a faithful
  copy of `kazoo-classic/monster-ui-callflows-ng@e231afb1`; it is now a maintained fork. Accepted
  deliberately: this repository is where this code moves forward, and no re-sync from that
  upstream is planned.

## Consequences

- **`callflows` is no longer a byte-faithful vendored copy.** It contains two submodules with no
  upstream counterpart. Anyone diffing it against `monster-ui-callflows-ng` will find them; this
  ADR and the register entry are the explanation.
- **Resource management is not separately grantable.** With no App of its own there is no **App
  Document**, so there is nothing to install server-side (no `init_app`) — and equally no way to
  grant Resource access independently of Callflows. Everyone who can open Callflows can manage
  local resources; global resources stay behind the gate below.
- **The callflow-node half of each submodule was stripped, not fixed.** Each registered both an
  entity-manager tab and a callflow action node (`globalresource[id=*]` / `localresource[id=*]`).
  The node half is broken as shipped — its `edit` renders a `callflowEdit` template that does not
  exist in the upstream repository, and `module: 'globalresource'` is not a callflow module
  anything in this repository speaks (callflows' own `resource` submodule uses `offnet` and
  `resources`). Rather than author two templates blind for a feature that has never run, the node
  properties (`icon`, `category`, `tip`, `data`, `rules`, `isUsable`, `weight`, `caption`, `edit`)
  were dropped along with the `*PopupEdit` handler, its `callflows.resource.popupEdit`
  subscription, and the `*List` helper that only the node path called. Dropping `category` is the
  framework's own mechanism for this: `callflows/app.js:2142` builds the editor palette from
  entries having a `category`, and `:1335` gates child actions on `isUsable`, so an entry with
  neither is invisible to the editor while the entity manager — which filters on `listEntities`
  (`:379`) — still picks it up.
- **The gate asks about the logged-in account, deviating from upstream.** Upstream gated its
  Global Resource tab on `currentAccount` — the account being *viewed* — so the tab vanished when
  a superduper admin masqueraded into a child account. The import gates on
  `monster.util.isReseller() && isSuperDuper() && isAdmin()`, which read `originalAccount`, so the
  tab now survives masquerading. "Are you a superduper admin" is the meaningful question for
  platform-wide carrier configuration, and these are the helpers the sibling callflows submodules
  already use (`timeofday.js:484`, `temporalset.js:254`). Kazoo enforces the real permission
  server-side either way.
- **Provenance is recorded as a register entry**, in the same register ADR-0007 established, but
  as an import rather than a vendored App. See [`docs/vendored-apps.md`](../vendored-apps.md).
