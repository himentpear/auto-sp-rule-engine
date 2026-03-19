# Phase 11 Designer-to-Validation Bridge

## Goal

Phase 11 connects the browser-only visual target designer more cleanly to repository-side validation and tooling without adding:

- frontend execution controls
- script triggering from the frontend
- repository file write-back
- any widening of the validated automation boundary

The result is a safe:

- design
- validate
- summarize
- normalize-preview

bridge.

## Draft Schema Validation

Designer drafts now use a strict schema marker:

- `schema_version: "designer-draft/v1"`

Required metadata:

- `draft_only: true`
- `export_only: true`
- `non_executing: true`
- `generated_from`
- `exported_at`
- `safe_boundary`

Validated draft sections:

- target bundle existence and structure
- OCR profile reference existence
- resolved OCR profile structure
- allowed safe action types only
- allowed match types only
- required rule fields

Allowed rule match types:

- `contains`
- `contains_any`
- `contains_all`
- `not_contains`
- `regex`

Allowed safe action types:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

## Repo Tooling

New safe repo commands:

- `npm run draft:check`
- `npm run draft:preview`

These commands do not execute automation.

They only:

- parse JSON
- validate schema and references
- summarize resolved target/profile/rule information
- produce a normalized preview
- report clear errors and warnings

Implementation:

- `scripts/dev/designer_draft_tools.mjs`

## Draft Normalization

The bridge adds a non-destructive normalization step.

Normalization converts a designer export into a scenario-like preview structure with:

- `target_bundle`
- `target`
- `control`
- `automation` placeholder
- `ocr_profile`
- `ocr_profiles`
- `engine`
- `rules`
- `designer_metadata`

This preview is printed to stdout only.

It does not:

- write into `config/`
- modify `examples/`
- trigger runtime scripts

## Frontend Export Metadata

Designer exports now include:

- `schema_version`
- `exported_at`
- `generated_from`
- `safe_boundary`
- source target/profile/scenario references in `notes`

This makes the exported draft easier to validate and trace back to repository objects.

## Example Drafts

Phase 11 includes two draft examples:

- valid:
  - `examples/drafts/valid-designer-draft.json`
- intentionally invalid:
  - `examples/drafts/invalid-designer-draft.json`

These are used for safe tooling validation and error-path verification.

## Why The Boundary Is Still Unchanged

Nothing in this phase adds execution capability.

The bridge validates data and prints previews, but it does not run:

- capture
- OCR
- rule execution
- AutoHotkey actions

It improves configuration safety, not runtime power.
