# Monster UI Callflows

The `callflows` App is the admin interface for building and editing **Callflows** —
the drag-and-drop call-handling chains a call traverses (menus/IVRs, ring groups,
voicemail, time-of-day routing, feature codes, and 50+ other actions). It is vendored
in-tree under `src/apps/callflows/` and built directly by the monster-ui gulp workflow —
there is no separate clone or install step.

Unlike the other vendored Apps, `callflows` carries a framework-level third-party
dependency, `bootstrap-tour` (its guide tour). That library is vendored into the shared
set (`src/js/vendor/bootstrap-tour.min.js`, `src/css/vendor/bootstrap-tour.css`) and
registered in `src/js/main.js` (`bootstraptour` path) and `src/css/style.css` (import).

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for
this App's provenance.
