# Phase 13 Summary

## Result

Compatibility guidance now makes template selection safer and easier.

The repository now exposes a static recommendation layer across:

- templates
- target bundles
- OCR profiles
- validated safe actions

This lowers the chance of assembling combinations that are technically valid JSON but weak relative to current evidence.

## What Is Now Explicitly Recommended Or Validated

Explicitly strongest current pairings:

- `notepad-basic-append` + `primary_notepad` + `primary_full_window` + `append_text`
- `notepad-write-if-missing` + `primary_notepad` + `primary_full_window` + `write_if_missing`
- `generic-roi-watch` + `secondary_notepad` + `secondary_roi` + `append_text` or `write_if_missing`
- `7zip-addressbar-replace` + `phase8_7zip_target` + `primary_full_window` + `replace_text`

Important caveats now surfaced directly:

- Notepad remains the least application-specific path
- 7-Zip is validated, but activation/focus and ROI tuning are still more application-specific
- ROI-focused profiles are strong when the region is known, but the coordinates remain layout-specific
- generic templates are useful, but weaker than app-specific validated templates

## What The Compatibility Layer Adds

Added:

- a structured compatibility matrix
- object-level recommendation metadata on templates and targets
- frontend recommendation panels in the designer and explorer
- repo-side compatibility summary tooling

This is all static guidance. It does not change the runtime path or add execution capability.

## Validation

Safe validation ran successfully:

- `npm run frontend:build`
- `npm run draft:check`
- `npm run template:check`
- `npm run compatibility:summary`
- `npm run docs:check`
- `npm run repo:health`
- `npm run repo:ux:check`

## Next Best Step

Next best step: add stronger draft-time warnings for combinations that are structurally valid but currently outside the explicitly recommended or validated matrix.

Reason:

- Phase 13 now explains the better choices
- the next leverage point is warning users when a draft departs from those stronger combinations
- that can still remain static, non-executing, and export-only
