# Phase 12 Template Library And Onboarding Flow

## Goal

Phase 12 reduces designer blank-page friction without changing the validated automation boundary.

The frontend still does not:

- execute automation
- trigger repo scripts
- write back into repository config

It now adds a reusable template layer plus a clearer onboarding sequence for draft-only configuration design.

## Template Library

Added template files under `examples/templates/`:

- `notepad-basic-append`
- `notepad-write-if-missing`
- `7zip-addressbar-replace`
- `generic-text-entry`
- `generic-roi-watch`

Each template carries:

- `schema_version`
- `id`
- `label`
- `summary`
- `recommended_target_bundle_ref`
- `recommended_ocr_profile_ref`
- optional `recommended_roi_preset`
- `recommended_action_type`
- `minimal_rule`
- `related_refs`

This keeps the template layer explicit enough for both frontend loading and repo-side validation.

## Onboarding Flow

The designer now starts with a visible onboarding path:

1. choose template or blank draft
2. choose target bundle
3. choose OCR profile and ROI preset
4. choose safe action
5. define trigger rule
6. preview and export JSON draft

Template selection pre-fills the validated pattern while still allowing narrow manual changes before export.

Blank mode remains available and stays on the same draft-only path.

## Frontend Changes

The frontend now exposes templates as a first-class designer start point.

Visible additions:

- template or blank start selection
- template detail summary
- related docs / examples / evidence references
- template-aware draft metadata on export

When a draft starts from a template, export metadata now preserves:

- `template_id`
- `template_label`
- `template_schema_version`
- `source_template_file`
- onboarding start mode

## Tooling Changes

`scripts/dev/designer_draft_tools.mjs` now validates both:

- designer drafts
- designer templates

Safe repo commands:

- `npm run draft:check`
- `npm run draft:preview`
- `npm run template:check`
- `npm run template:summary`

These commands only parse, validate, summarize, and preview. They do not execute automation.

## Validation Notes

Phase 12 safe checks covered:

- frontend build
- template-based valid draft check
- blank-draft check
- template schema check
- repo health / docs / UX checks

Validation results are summarized in `notes/phase12-summary.md`.

## Boundary Status

The validated automation boundary is unchanged:

`capture -> OCR -> rule match -> control-targeted write`

Phase 12 only improves:

- reusable starting points
- draft quality
- onboarding clarity
- safe repo-side inspection

It does not add any new execution path.
