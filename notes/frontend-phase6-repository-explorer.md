# Frontend Phase 6 Repository Explorer

Date: 2026-03-18

## Scope

This round strengthened the frontend as a read-only repository explorer only.

It did not add:

- config editing
- script triggering
- file write-back
- log creation
- execution controls

## Filter Presets

The frontend now provides lightweight read-only preset filters:

- all rules
- matched runs
- multi-target scenarios
- ROI OCR profiles
- recent evidence
- docs-linked objects

These presets are shortcuts for the existing repository filter system. They only change the current UI state.

## Filtered Counts

The navigation shell now shows filtered counts for:

- rules
- targets
- OCR profiles
- scenarios
- runs

This makes it easier to understand the size of the currently visible repository slice.

## Docs, Examples, And Evidence Linking

Object detail views now connect more directly to:

- related docs
- related examples
- related evidence

This is implemented as read-only path linking based on current repository structure and validated artifact locations.

## Explorer Behavior

The frontend now behaves more like a repository explorer because users can move from:

- object -> source
- object -> related docs
- object -> related examples
- object -> related evidence

without losing the global navigation shell or current filter context.

## Safety Boundary

The frontend remains strictly read-only.

All presets, counts, breadcrumbs, links, and evidence grouping operate on repository files that are already loaded or already represented as repo-relative paths.
