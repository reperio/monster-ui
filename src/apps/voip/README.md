# Monster UI VoIP (SmartPBX)

The `voip` App is the hosted-PBX administration interface — users see it as
**SmartPBX**. It manages users, devices, numbers, groups, voicemail boxes,
conferencing, feature codes, and call-handling strategy for an account. It is
vendored in-tree under `src/apps/voip/` and built directly by the monster-ui
gulp workflow — there is no separate clone or install step. See
`docs/adr/0007-vendor-apps-in-tree.md` for the policy and provenance.
