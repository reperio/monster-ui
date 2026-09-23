# Monster UI Address Books

The `addressbooks` App (display label **Address Books**) manages an account's **Lists** as address
books of contacts. A sidebar lists the account's books; selecting one renders its entries in a
DataTable where each entry carries a display name, first and last name, and either a number or a
dialplan pattern. Entries can be created and edited inline, given a photo, downloaded individually
as a vCard, and imported or exported in bulk as CSV; a whole book's entries can be deleted at once.
It is vendored in-tree under `src/apps/addressbooks/` and built directly by the monster-ui gulp
workflow — there is no separate clone or install step.

Everything goes through the App's own `requests` map against the Crossbar `lists` endpoints
(`accounts/{accountId}/lists`, `.../lists/{listId}/entries`, and the per-entry `/vcard` and
`/photo` sub-resources); it declares no Kazoo SDK resources. It builds against the shared modules
`jquery`, `monster`, and `toastr`, the framework helpers `monster.ui.confirm`, `dialog`,
`getFormData`, `valid`, and `validate`, and the shared **DataTables** vendor set (all five
RequireJS paths were already registered in `src/js/main.js` by the `callcenter` App).

## It shares storage with the Callflows App

A Kazoo **List** is one document type serving two unrelated purposes. This App reads a List as an
address book of contacts; the `callflows` App's `lists` submodule reads the *same documents* as a
**Match List** of numbers and patterns, and its `cidlistmatch`, `lookupcidname`, and
`destination_listmatch` submodules route calls against them. Neither App owns the document, and
they disagree about what an entry is:

- The `callflows` list editor builds each entry from a number alone and can only **add** or
  **delete** entries — it never amends one. It cannot see the `displayname`, `firstname`,
  `lastname`, or `pattern` fields this App writes, and **deleting a contact there takes its photo
  attachment with it**.
- An entry added in the `callflows` editor appears here as a nameless row.

Books created here will therefore show up in a callflow's list-match dropdowns, and vice versa.
See the `List`, `List Entry`, and `Address Books` glossary entries in `CONTEXT.md`.

## Optional: a default address book

The App can create a named address book automatically for accounts that have none. The feature is
**off unless configured** — it reads a `addressbooksapp` block from `src/js/config.js`, which this
repository's `config.js` deliberately does not ship (it is a minimal working example, and the App
guards a missing block correctly). To enable it, add the block yourself:

```javascript
define({
	api: { /* ... */ },
	addressbooksapp: {
		create_default_addressbook: true,
		default_addressbook_name: 'Default list'
	}
});
```

| Parameter | Type | Default | Required |
| --- | --- | --- | --- |
| `create_default_addressbook` | boolean | `false` | No |
| `default_addressbook_name` | string | `"default_addressbook"` | No |

When a default book exists, the UI prevents renaming or deleting it. This is the only vendored App
that reads its own `monster.config` namespace.

It is a **community App** by Vladimir Barkasov, sponsored by Raffel Internet B.V. Upstream declared
`"license": "MPL2"` in `metadata/app.json` with no `LICENSE` file anywhere in the repository to back
it; since that claim is unverifiable and `MPL2` is not a valid SPDX identifier, it was changed to
`"-"` — the value this tree uses for *no license declared*. Its upstream tip dates from **March
2018**, the oldest source vendored here, so its write paths — photo upload, CSV import, vCard export
— should be verified against a live Kazoo before it is relied on in production.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this App's
entry (source commit, license handling, the dropped Font Awesome bundle, and the shared vendor-set
bump it required).
