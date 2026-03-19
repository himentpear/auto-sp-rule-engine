# Compatibility Guide

This guide explains how to choose a template, target bundle, OCR profile, and safe action using the current validated evidence.

The project remains on the same validated boundary:

`capture -> OCR -> rule match -> control-targeted write`

This guide is static guidance only. It does not add execution capability.

## Choose A Template

Start with a template when one already matches the shape of the application or text region you care about.

Current strongest choices:

- `notepad-basic-append`
  best first path for simple text-entry validation
- `notepad-write-if-missing`
  best when the write should be idempotent
- `7zip-addressbar-replace`
  best when validating the second real application path
- `generic-roi-watch`
  best when the OCR watch zone is intentionally narrow
- `generic-text-entry`
  best as a reusable pattern, but weaker than app-specific validated templates

## Choose A Target Bundle

Prefer the target with the least application-specific behavior that still matches your application shape.

Current target guidance:

- `primary_notepad`
  safest first target
  direct control focus
  control-text readback
  validated across all five safe action types
- `secondary_notepad`
  use when ROI matters more than full-window OCR
  validated on narrower ROI-focused cases
- `phase8_7zip_target`
  use when you need evidence beyond Notepad
  requires activation before focus and narrower ROI handling

## Choose An OCR Profile

Choose the broadest stable OCR profile that still keeps the watch region honest.

Current guidance:

- `primary_full_window`
  safest default profile
  best for the primary Notepad path and most template starts
- `secondary_roi`
  best for narrow editor regions
  stronger when ROI is already known
- `phase8_7zip_address_bar`
  strongest application-specific profile for the 7-Zip address bar
  use when you want a direct address-bar profile instead of the shared full-window base with overrides

## Choose A Safe Action

Only the validated safe actions are available:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

Current guidance:

- use `append_text` for the simplest proof of successful write targeting
- use `write_if_missing` when repeated runs should remain idempotent
- use `replace_text` for stable single-field replacement such as the validated 7-Zip address-bar case
- use `prepend_text` and `append_timestamped_note` when the target is already validated as a text-entry control and the text shape is easy to verify

## Current Strongest Explicit Pairings

- `notepad-basic-append` + `primary_notepad` + `primary_full_window` + `append_text`
- `notepad-write-if-missing` + `primary_notepad` + `primary_full_window` + `write_if_missing`
- `generic-roi-watch` + `secondary_notepad` + `secondary_roi` + `write_if_missing`
- `7zip-addressbar-replace` + `phase8_7zip_target` + `primary_full_window` + `replace_text`

## Caveats

- Notepad remains the least application-specific path
- 7-Zip is validated, but focus/activation and ROI tuning are still more application-specific
- ROI profiles improve signal quality, but coordinate tuning remains layout-specific
- Generic templates are useful starting points, but they are not stronger than the application-specific validated templates

## Related Sources

- `examples/compatibility/phase13-compatibility-matrix.json`
- `notes/phase13-compatibility-matrix.md`
- `notes/phase13-summary.md`
