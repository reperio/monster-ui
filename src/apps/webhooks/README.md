# Monster UI Webhooks

The `webhooks` App (display label **Webhooks**) is the account-level UI for configuring and
debugging Kazoo **Webhooks** — account-configured HTTP callbacks that fire when a chosen Kazoo
event occurs. It lists an account's Webhooks, creates and edits them, enables/disables them, and
surfaces per-Webhook delivery **Attempts** (the success/error history) for debugging. It is
vendored in-tree under `src/apps/webhooks/` and built directly by the monster-ui gulp workflow —
there is no separate clone or install step.

Each Webhook binds to a **Hook** (an event type — inbound/outbound call, call answered/ended,
bridged, parked, fax, callflow-triggered, object-triggered) and delivers over an HTTP **Verb**
(`get`, or `post`/`put`, which carry a body format). The App reads and writes through the Crossbar
`webhooks` and `webhooks/attempts` endpoints; see the `Webhook`, `Hook`, and `Webhook Attempt`
glossary entries in `CONTEXT.md`.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `lodash`, `monster`) and the framework's `monster.ui.footable` helper. Nothing
was added to the shared vendor set to vendor it. Its `style/app.scss` is compiled to `app.css` by
the gulp build like any other App stylesheet.

It is a 2600Hz App, licensed **MPL-1.1** — the same license this repository already carries, so no
separate `LICENSE` file is vendored with it.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit, `api_url` scrub, license handling, and the faithful-copy oddities
left in place).
