# Monster UI Parking Lot

The `parkinglot` App (display label **Parking Lot**) is an operator view of an account's
**parked calls**: it lists the calls currently sitting in parking slots, lets you retrieve one by
clicking it, and lets you call back the device that parked it. It is vendored in-tree under
`src/apps/parkinglot/` and built directly by the monster-ui gulp workflow — there is no separate
clone or install step.

The list is populated by polling the Crossbar `parked_calls` endpoint (the SDK's
`parkedCalls.list` resource) and auto-refreshes every 30 seconds; retrieval and callback are
issued as quickcalls. Unlike RuhNet's Switchboard, it does not use a **Blackhole** websocket.
Retrieving a call dials the parking feature code (`*3<slot>`), so the account's call-parking
feature codes must be configured for retrieval to work.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `lodash`, `monster`) and the framework's `monster.ui.dialog` / `monster.ui.alert`
helpers. Nothing was added to the shared vendor set to vendor it.

It is a community App by RuhNet, licensed **MPL-1.1** — the same license this repository already
carries, so no separate `LICENSE` file is vendored with it. This standalone, free App is distinct
from the retrievable parking lot built into RuhNet's paid **Switchboard Pro** edition; see the
`Parking Lot` glossary entry in `CONTEXT.md`.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit and license handling).
