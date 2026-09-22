# Monster UI Voicemails

The `voicemails` App (display label **Voicemails**) is the account-level UI for bulk-managing the
**Voicemail Messages** sitting inside an account's **Voicemail Boxes**. It lists a selected box's
messages over a date range, plays and downloads their audio, shows per-message **CDR** detail, and
applies bulk actions across a selection: change **Message Folder** (new / saved / deleted), delete,
or move messages to another Voicemail Box. It is vendored in-tree under `src/apps/voicemails/` and
built directly by the monster-ui gulp workflow — there is no separate clone or install step.

This App manages the *contents* of Voicemail Boxes. Creating and configuring the boxes themselves
is the `voip` App's `vmboxes` submodule; see the `Voicemails` and `Voicemail Box` glossary entries
in `CONTEXT.md`.

It reads and writes through the Crossbar `vmboxes` endpoints (`voicemail.list`, `voicemail.get`,
`voicemail.listMessages`, `voicemail.updateMessages`, `voicemail.deleteMessages`) and fetches CDRs
via `cdrs.get`. Its second tab appears only when the account has a **Storage Plan**: it embeds the
`common` App's `storagePlanManager` Common Control scoped to the `mailbox_message` plan type.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `lodash`, `monster`) and framework helpers already present
(`monster.ui.footable` / `tooltips` / `renderJSON` / `initRangeDatepicker` / `generateAppLayout` /
`chosen` / `dialog` / `alert`). Nothing was added to the shared vendor set to vendor it. Audio
playback is a plain `<audio>` element pointed at the message's `/raw` URL — there is no player
library. Its `style/app.scss` is compiled to `app.css` by the gulp build like any other App
stylesheet.

It is a 2600Hz App. Its upstream repository ships **no license** — no `LICENSE` file has ever
existed in its history and `metadata/app.json` carries the placeholder `"-"`, which was vendored
as-is rather than inferred from sibling 2600Hz repositories.

## Notes on this vendored copy

**`source_id` is the *destination* Voicemail Box, not the source.** `moveVoicemailMessages()` POSTs
to the box currently being viewed and passes the *target* box as `source_id`, which reads backwards
but is correct: the field is a misnomer in Kazoo's own API. Kazoo's `voicemail.md` says "set the
**destination** voicemail box ID in payload like `{"data": {"source_id": "{NEW_VM_BOX_ID}"}}`", and
`cb_vmboxes.erl` confirms it — `post(Context, OldBoxId, ?MESSAGES_RESOURCE)` binds the URL's box to
`OldBoxId` and `source_id` to `NewBoxId`, then calls `kvm_messages:move_to_vmbox(AccountId, MsgIds,
OldBoxId, NewBoxId, …)`. A string value moves; an array copies. **Do not "fix" this** — inverting it
would move messages the wrong way.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy, provenance, and the remaining notes
specific to this App (source commit, `api_url` scrub, license handling, and the faithful-copy
oddities left in place).
