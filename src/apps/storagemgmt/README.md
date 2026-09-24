# Monster UI Storage Engine Management

The `storagemgmt` App (display label **Storage Engine Management**) is the account-level editor
for Kazoo **storage attachments** — the named, credentialed destinations (bucket, key, secret)
that Kazoo writes media to. It lists an account's configured attachments, creates new ones,
edits and deletes them, and marks one as the account default. It is vendored in-tree under
`src/apps/storagemgmt/` and built directly by the monster-ui gulp workflow — there is no
separate clone or install step.

It talks to the Crossbar `accounts/{accountId}/storage` endpoint through the SDK's
`storage.get` / `.add` / `.update` / `.patch` resources, all of which the shared Kazoo SDK
already provides. Every write path is admin-gated (`monster.util.isAdmin()`). On first use
against an account with no storage document, it PUTs an empty one and retries.

Marking an attachment as the default writes it as the handler for three **storage plan**
entries at once: `plan.modb.types.call_recording`, `plan.modb.types.mailbox_message`, and
`plan.account.types.media`. That single click is therefore what decides where the **Recordings**
and **Voicemails** Apps' media actually lands.

## Overlap with the common storage controls

This App overlaps two Common Controls that already ship in `common`, and the overlap is
deliberate — see `docs/vendored-apps.md` for why it was vendored whole rather than consolidated:

- `common/submodules/storageSelector` — picks among **existing** attachments. It cannot create
  one; that gap is what this App fills.
- `common/submodules/storagePlanManager` — assigns an attachment to a storage plan type,
  consumed today by the `voicemails` App. This App's "set default" does an overlapping job
  across three fixed plan entries.

This App is a 2019 fork of those controls. Nothing in this tree consumes it as a control; it is
reached only as an App from the Apploader.

## Adding a storage provider

Providers are submodules, listed in `storages.js` and autoloaded from
`submodules/<name>/<name>.js`. A provider subscribes to `storagemgmt.fetchStorages` and
registers two template-returning methods, `getLogo()` and `getFormElements(storageData)`, into
the shared `storages` registry. Its `formElements.html` must include a hidden `handler` input
carrying the Kazoo **storage handler** the provider maps to.

Provider labels live in this App's own `i18n/en-US.json` under `storagemgmt.submodules.<name>`.
Upstream instead fetched a per-submodule i18n file over HTTP at render time; that mechanism was
removed when the App was vendored (see `docs/vendored-apps.md`), so a new provider adds its
strings to the App's central i18n file.

The bundled `mts` provider is a preset, not a distinct handler: it writes `handler: "s3"` with a
hardcoded `settings.host` of `s3.cloud.mts.ru`. Because the stored `handler` is what the list is
rendered from, an MTS-created attachment displays as `s3` on reload; the MTS logo appears only
on the creation tab.

## Deployment

Vendoring this App does not install it. For it to appear in a user's Apploader, Kazoo needs an
**App Document** seeded from `metadata/app.json` — a deploy-time concern outside this repository
(ADR-0007). Upstream documented that as:

```
sup crossbar_maintenance init_app /var/www/html/apps/storagemgmt https://site.com:8443/v2/
```

The App then has to be enabled for the account in the App Store (`/#/apps/appstore`).

See `docs/adr/0007-vendor-apps-in-tree.md` for the vendoring policy and `docs/vendored-apps.md`
for this App's entry (source commit, license handling, and every change made to the copy).
