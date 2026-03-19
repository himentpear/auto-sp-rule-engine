# Phase 10 Visual Target Designer

## Goal

Phase 10 extends the frontend from a pure repository explorer into:

- repository explorer
- visual target designer

The designer is intentionally:

- draft-only
- export-only
- non-executing
- non-destructive

It does not run automation from the browser, does not trigger scripts, and does not write back into repository files.

## What The Designer Adds

The frontend now includes a separate workspace mode for visual draft composition.

Major sections:

1. Target selection
2. OCR profile and ROI designer
3. Rule builder
4. Action builder
5. Draft preview and export

This keeps repository exploration intact while adding a dedicated draft surface for future configuration work.

## How Target Abstraction Is Surfaced

The designer visualizes the Phase 9 target abstraction directly from repository data.

Visible target-bundle fields:

- `window_matcher`
- `focus_strategy`
- `control_strategy`
- `readback_strategy`
- `default_ocr_profile`
- ROI presets when available

This means the abstraction is no longer only visible in raw JSON or notes; it is now inspectable in a structured UI.

## OCR Profile And ROI Drafting

The designer allows a user to:

- choose an existing OCR profile
- pick a named ROI preset from the selected target bundle
- override ROI with a lightweight form editor
- draft narrow preprocessing changes such as scale and threshold
- adjust confirmation frame count

All of these changes remain in browser draft state only.

## Rule Builder

The visual rule builder supports the safe match types requested:

- `contains`
- `contains_any`
- `contains_all`
- `not_contains`
- `regex`

The UI also shows:

- resolved target
- resolved OCR profile
- confirmation behavior
- selected safe action

## Action Builder

The designer only exposes the already validated safe action types:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

No new or unvalidated action types were introduced.

## Draft Preview And Export

The designer outputs:

- JSON preview
- copy to clipboard
- local JSON download

It does not:

- write to `config/`
- modify `examples/`
- call PowerShell, Python, AutoHotkey, or any execution path

## Safety Boundary

The validated automation boundary remains unchanged.

Still validated boundary:

- capture
- WinRT OCR
- JSON rule match
- AutoHotkey control-targeted write

The Phase 10 designer sits outside that runtime path and only prepares draft JSON for manual use.

## Integration With Existing Repository Data

The designer is connected to:

- existing target bundles
- existing OCR profiles
- existing example scenarios
- existing validated safe action types
- existing docs and notes

This keeps the designer grounded in validated repository objects instead of introducing a detached UI-only model.

## What It Still Does Not Do

Intentionally still manual:

- applying exported drafts into repository config files
- deciding final target capture geometry from live screenshots
- validating drafts against a running app
- expanding the safe action set
- introducing frontend-side execution

The result is a coherent visual design layer, not a browser automation console.
