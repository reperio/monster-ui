# Monster UI Recordings

The `recordings` App (display label **Recordings**) lets a user view, play, download, and
delete call recordings for [KAZOO](https://www.2600hz.com/architecture). It is vendored
in-tree under `src/apps/recordings/` and built directly by the monster-ui gulp workflow —
there is no separate clone or install step.

This App carries no framework-level third-party dependencies: it builds only against the
shared modules (`jquery`, `lodash`, `monster`) and uses the framework's `monster.ui.footable`
helper. Nothing was added to the shared vendor set to vendor it.

It is a community App (author Boden Garman); see
`docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit, absent upstream license, and the `receiver/` scope call below).

## Emailing call recordings

The App can email each new call recording to a fixed address, driven by a KAZOO webhook that
posts to a small standalone receiver.

### Configure the App

In `app.js`, set `appFlags.emailWebhook`:

- `name` — the identifier the App uses to find "its" webhook on the account (`recordings-email`).
- `receiverUri` — public URL of the receiver (see below), e.g.
  `https://hooks.example.com/recordings-email`.
- `token` — shared secret; must match the receiver's `[security] token`.

Enable the webhooks API on KAZOO if it is not already running:

```bash
sup crossbar_maintenance start_module cb_webhooks
```

### The receiver service

`receiver/` holds a standalone Python 3.6 (standard-library-only) service that receives the
webhook, downloads the recording media from KAZOO, and emails it as an attachment under
systemd. It is **out-of-band deployment infrastructure — not part of the monster-ui build**;
it is vendored here only because this is its sole home. Nothing in the gulp bundle references
it. See [`receiver/README.md`](receiver/README.md) for install, configuration, and operation.
