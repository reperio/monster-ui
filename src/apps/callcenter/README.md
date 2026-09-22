# Monster UI Callcenter

The `callcenter` App (display label **Callcenter**) is the admin interface for Kazoo's
**ACDC** call center — managing **Queues** and **Agents**, watching the queues/calls/agents
dashboards, and eavesdropping on live queue calls. It is vendored in-tree under
`src/apps/callcenter/` and built directly by the monster-ui gulp workflow — there is no
separate clone or install step.

Like `callflows` and `apiexplorer`, this App carries framework-level third-party
dependencies: the **DataTables** engine (1.10.15) and its Buttons plugins. These are
vendored into the shared set (`src/js/vendor/datatables/`) and registered in
`src/js/main.js` (the `datatables.net`, `datatables.net-bs`, `datatables.net-buttons`,
`datatables.net-buttons-html5`, and `datatables.net-buttons-bootstrap` paths); the
DataTables stylesheet is added to `src/css/vendor/jquery/jquery.dataTables.css` and imported
from `src/css/style.css`. Its other library, `toastr`, was already present in the shared set.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for
this App's provenance.
