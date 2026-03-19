# Frontend Phase 3 Crosslinking

Date: 2026-03-18

## Scope

This round improved navigation and explainability only.

It did not add:

- config editing
- script triggering
- file write-back
- log creation
- execution control

## New Read-Only Cross-Links

The dashboard now exposes direct relationships between project objects:

- rule -> target
- rule -> OCR profile
- rule -> scenario
- rule -> recent runs
- target -> related rules
- target -> related runs
- OCR profile -> related rules
- OCR profile -> related runs
- run -> matched rule
- run -> resolved target
- run -> OCR profile
- run -> related scenarios

These links are implemented as local selection changes in the UI. They do not execute repository scripts.

## Related Sections

The detail panels now use a more consistent "Related" pattern.

Current detail coverage:

- rule detail
- target detail
- OCR profile detail
- run detail
- scenario detail

This makes it easier to move from a run to the rule that matched, then to the target or OCR profile that shaped that run.

## Source Navigation

Source navigation is now more consistent across the UI:

- repo-relative paths are shown in the same `Source files` block style
- copy-path uses the same read-only affordance everywhere
- run detail groups log, screenshot, and evidence paths together

## Evidence Navigation

Run detail now surfaces related evidence when present:

- source log path
- screenshot path
- text evidence or readback files derived from `examples/logs/*.txt`

This keeps the public-facing frontend tied to the same repository evidence that supports the validated claims.

## Safety Boundary

The frontend remains within the validated safety boundary because it is still read-only.

The UI only:

- reads normalized repository data from the local API
- changes local selection state
- displays repo-relative paths
- copies paths to the clipboard when requested

It does not change configs, trigger AHK, run OCR, or invoke any automation pipeline step.
