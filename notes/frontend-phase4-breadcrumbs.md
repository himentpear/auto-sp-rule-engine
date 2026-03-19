# Frontend Phase 4 Breadcrumbs

Date: 2026-03-18

## Scope

This round improved orientation and traceability only.

It did not add:

- config editing
- script triggering
- file write-back
- log creation
- execution controls

## Breadcrumb Navigation

The frontend now adds breadcrumb paths in key detail views.

Examples:

- scenario -> rule
- run -> matched rule
- target -> related run
- profile -> related rule

These breadcrumbs are read-only selection shortcuts. They only move the user through already-loaded repository objects.

## Lightweight Object Graph

Each major detail view now includes a lightweight relationship panel rather than a heavy visual graph.

The panel shows:

- current object
- upstream related objects
- downstream related objects
- related evidence when available

This keeps navigation explicit while preserving the minimal UI style.

## Standardized Detail Layout

The main object detail views are now closer to a shared structure:

- Summary
- Related
- Source
- Evidence

This applies across:

- rule detail
- profile detail
- target detail
- scenario detail
- run detail

## Safety Boundary

The frontend remains strictly read-only.

Breadcrumbs, cross-links, source links, and relationship panels only change local UI state or copy repo-relative paths.

They do not run scripts, mutate files, or control the validated automation pipeline.
