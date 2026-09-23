# Monster UI Whitelabel

The `whitelabel` App (display label **Whitelabel**) is the reseller-facing UI for editing an
account's **Whitelabel Document** — the per-Account Crossbar document that carries branding and
feature configuration: company name and application title, logo and icon uploads, the welcome
message, navigation and port-form URLs, default language, carrier and porting settings, and the
branded domains a reseller serves the UI from. It also edits the account's **Notification
Templates**. It is vendored in-tree under `src/apps/whitelabel/` and built directly by the
monster-ui gulp workflow — there is no separate clone or install step.

Its five screens are General (branding basics and logo/icon upload), Advanced (feature toggles and
URLs), Templates (notification templates), and two DNS screens that list the records a branded
domain needs and check them live against the resolver. All of it goes through the shared Kazoo SDK's
`whitelabel.*` resources (`accounts/{accountId}/whitelabel`, its `logo`/`icon` attachments, its
`domains` sub-resource, and `accounts/{accountId}/notifications/{notificationId}`); the App declares
no `requests` of its own.

The App edits the **Whitelabel Document** only. It does not edit the `whitelabel` block in
`src/js/config.js`, and it is not the framework machinery that consumes either: at load time
`monster.apps.js` merges the Document over the `config.js` block to produce the **Whitelabel
Config** (`monster.config.whitelabel`) that every other App reads. See the `Whitelabel`,
`Whitelabel Document`, `Whitelabel Config`, and `Notification Template` glossary entries in
`CONTEXT.md`.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `monster`, `toastr`, `fileupload`) and framework helpers (`monster.ui.wysiwyg`,
`alert`, `confirm`, `validate`, `getFormData`, `tooltips`). Nothing was added to the shared vendor
set, and no Kazoo SDK resource had to be added — every resource it calls already existed. Its
`style/app.scss` is compiled to `app.css` by the gulp build like any other App stylesheet.

It is a **community App** by SIPLABS LLC / Converba Limited, shipping **no declared license**
(`metadata/app.json` `license` is `"-"` and upstream carries no `LICENSE` file). Its upstream tip
dates from **March 2019** — by some years the oldest source vendored here — so its request payloads
should be verified against a live Kazoo before it is relied on in production.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit, license handling, the dropped generated stylesheet, and the
faithful-copy oddities left in place).
