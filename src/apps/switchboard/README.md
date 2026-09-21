# Monster UI Switchboard Lite

The `switchboard` App (display label **Switchboard Lite**) is a real-time operator panel: it
lists an account's registered devices with user/extension labels (including any hotdesk
extensions logged into them) and shows each device's live call status, driven by a **Blackhole**
websocket connection to KAZOO. It is vendored in-tree under `src/apps/switchboard/` and built
directly by the monster-ui gulp workflow — there is no separate clone or install step.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `lodash`, `monster`) and the framework's `monster.ui.highlight` helper.
Nothing was added to the shared vendor set to vendor it. Its live call status relies on the
account's Blackhole websocket being reachable — set `api.socket` in `js/config.js` (see the
framework's configuration).

It is a community App by RuhNet, licensed **MPL-1.1** — the same license this repository already
carries, so no separate `LICENSE` file is vendored with it. "Switchboard", "Switchboard Pro",
and "Switchboard Lite" are trademarks of RuhNet. This is the free, view-only **Lite** edition;
RuhNet's separate **Pro** edition adds answer/pickup, park, transfer, and a retrievable parking
lot. The "Pro" version does everything the Lite version does, but it also allows you to answer/pickup
calls, park calls, transfer calls, and shows parked calls in the parkinglot (and allows you to
retrieve them with a click). Contact me via my site [https://ruhnet.co](https://ruhnet.co)
for purchase information.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy, provenance, and the notes specific to
this App (source commit, license handling, and the copied-faithfully code-header contradiction).