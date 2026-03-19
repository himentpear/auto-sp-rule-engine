# Frontend Phase 5 Navigation Shell

Date: 2026-03-18

## Scope

This round added a repository-level navigation shell in read-only mode only.

It did not add:

- config editing
- script triggering
- file write-back
- log creation
- execution controls

## Global Navigation Shell

The frontend now includes a top-level navigation shell above the main dashboard content.

It adds:

- a global breadcrumb path
- a shared repository filter bar
- a clearer sense of current location across dashboard objects

This complements the local detail breadcrumbs added in the previous round.

## Filtering

The read-only filter system can narrow visible data by:

- object type
- target
- OCR profile
- scenario
- run status
- source file

These filters affect which rules, profiles, targets, scenarios, and runs are shown, but they do not mutate repository state.

## Evidence Grouping

Evidence is now grouped more consistently across detail views.

Current grouping categories include:

- screenshots
- logs
- readback
- source config
- related notes

This makes it easier for an external reader to understand which files are configuration, which are logs, and which are validation artifacts.

## Safety Boundary

The frontend remains strictly read-only.

Global breadcrumbs, global filters, local breadcrumbs, cross-links, and evidence groups all operate on already loaded repository data only.
