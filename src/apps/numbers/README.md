# Monster UI Numbers

The `numbers` App (display label **Numbers**) is the account-level UI for managing an
**Account**'s **Phone Numbers** — buying and porting them in, deleting them, assigning them, and
editing their per-number features — across three views: **Spare Numbers**, **Used Numbers**, and
**Caller ID Numbers**. It is vendored in-tree under `src/apps/numbers/` and built directly by the
monster-ui gulp workflow — there is no separate clone or install step.

What separates it from the **voip** App's numbers tab is breadth: this App manages an Account's
numbers **and those of its direct child Accounts** (`account.listChildren`), where voip manages
only the Account's own. See the `Numbers`, `Phone Number`, `Spare Number`, `Used Number` and
`Caller ID Number` glossary entries in `CONTEXT.md`.

## This App is a shell

`app.js` is 60 lines and owns essentially no behaviour. It renders `views/app.html` — a bare
`<div id="number_manager"></div>` — publishes `common.numbers.render` into it, and appends the
result:

```js
monster.pub('common.numbers.render', {
    container: numberManager,
    callbackAfterRender: function(numberControl) {
        parent.empty().append(numberControl);
    }
});
```

Everything the user sees is implemented by the `common` App's numbers **Common Control**
(`src/apps/common/submodules/numbers/`). All three of this App's i18n files are empty `{}` for
the same reason — every string comes from `common`. Its stylesheet is five lines of layout.

If you are looking for the code behind a screen in this App, it is in `common`, not here.

## Notes on this vendored copy

**It is the only consumer of the Common Control's `manager` view.** `common.numbers.render` takes
a `viewType`. The only other publisher in this repository is `voip/submodules/numbers`, which
passes `'pbx'`. This App takes the default, `'manager'` — the parent-account view that lists
child Accounts and fetches the `full` number list. Before this App was vendored, that view had no
consumer at all, so a substantial slice of `common/submodules/numbers` (the account sections in
`layout.html`, plus `spareAccount.html`, `usedAccount.html`, `externalAccount.html` and the
accountBrowser integration) was dormant. Activating it is the reason this 60-line shell earns a
place in the tree.

**`common` reaches into this App's DOM — do not remove the `#number_manager` id.**
`common/submodules/numbers/numbers.js:452` re-renders after adding an external number via
`self.numbersRender({ container: $('#number_manager') })`, a hardcoded global id that only
`views/app.html` supplies. It is reachable only from the `manager` view. That coupling is
backwards and is tracked as issue #22 — but until it is fixed, this App's view is what makes that
line work.

**"External" means two different things in the Common Control.** The third view is labelled
*Caller ID Numbers* and is backed by the Crossbar `external_numbers` endpoint — numbers proven by
PIN callback that the Account may present as caller ID without holding them. The separate "Add
External Numbers" action on the Spare view is unrelated: gated on `wnm_allow_additions`, it
imports ordinary **Phone Numbers** into the Account's pool via `numbers.createBlock`. The code,
the SDK namespace and the view filenames say "external" for both. `CONTEXT.md` records *Caller ID
Number* as the canonical term for the entity and rejects "External Number" outright.

**The `manager` view has never run against a live backend here.** It had no activation path in
this repository before this App. Its two most interesting actions are feature-gated —
`monster.config.whitelabel.hideBuyNumbers` and `monster.util.canAddExternalNumbers()` (which
matches `wnm_allow_additions: true` on the *logged-in* Account, not the viewed one) — so neither
the buy path nor the add-external path is exercised on a default account. Treat first deployment
as the real test.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `monster`). Nothing was added to the shared vendor set to vendor it. It is a
2600Hz App, licensed **MPL-1.1** — the same license this repository already carries, so no
separate `LICENSE` file is vendored with it.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit, the upstream-choice note, the `api_url` scrub, license handling, and
what verification did and did not cover).
