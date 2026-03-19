# Phase 13 Compatibility Matrix And Recommendations Layer

## Goal

Phase 13 adds a static compatibility and recommendation layer so users can choose templates, target bundles, OCR profiles, and safe actions with less guesswork.

The layer is intentionally static:

- no browser-triggered execution
- no repository write-back
- no widened automation boundary

## What Was Added

Added a structured matrix in:

- `examples/compatibility/phase13-compatibility-matrix.json`

Each entry covers:

- template
- target bundle
- target type
- focus strategy
- control strategy
- readback strategy
- OCR profile
- safe action types
- validation status
- recommended use cases
- known limitations
- evidence references

## Recommendation Metadata

Recommendation metadata was added to:

- template files in `examples/templates/`
- target bundle files in `examples/targets/`

The metadata fields include:

- `recommended_for`
- `best_with_profiles`
- `validated_actions`
- `known_limitations`
- `evidence_refs`

This keeps object-level guidance close to the validated objects, while the matrix provides cross-object guidance.

## Frontend Use

The frontend now uses the compatibility layer in two places:

- the visual designer
- explorer target and OCR profile detail views

When a template, target, or OCR profile is selected, the UI now surfaces:

- recommended pairings
- validated pairings
- known caveats
- evidence and docs links

The UI remains advisory only. It does not auto-run validation or auto-change repo files.

## Tooling Use

Safe tooling now includes:

- `npm run compatibility:summary`

This command validates and summarizes the compatibility matrix without executing automation.

## Why This Is Still Safe

Phase 13 does not add:

- frontend execution controls
- browser-triggered scripts
- repository write-back
- dynamic execution logic

It only improves design-time guidance and static inspection.
