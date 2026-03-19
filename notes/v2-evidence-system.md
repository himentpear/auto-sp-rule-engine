# V2 Evidence System

Date: 2026-03-19

## Goal

Make repository evidence easier to understand and re-open as a release-candidate evidence system instead of a loose set of logs and screenshots.

## Main Changes

- kept `docs/evidence-index.md` as the generated evidence inventory
- kept the frontend evidence hub aligned with repository evidence files already on disk
- improved morning-flow linkage between repo map, evidence index, repo health, and frontend evidence browsing
- made evidence review part of the standard release-candidate validation path

## Evidence Layers

- `examples/logs/`
  JSON logs and readback text
- `screenshots/examples/`
  representative screenshot evidence
- frontend evidence hub
  read-only grouping by scenario, rule, run status, or source file

## Scope Guarantee

This evidence system remains read-only and documentation-oriented. It does not introduce any new execution capability.
