# Changelog

Notable changes to this fork of Monster UI. Newest first.

## Unreleased

### Changed

- **moment-timezone now ships only 1970–2030 data.** `js/vendor/moment-timezone.js` is the official `moment-timezone-with-data-1970-2030` build of 0.5.41 (IANA 2022g), replacing the full-data build. The zone list and country map are unchanged, and offsets inside 1970–2030 are identical. **Accepted risk:** `moment.tz` offsets for instants before 1970 or after 2030 are wrong. This cuts `main.js` by ~625 KB raw / ~20 KB gzip.
