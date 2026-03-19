# Frontend Phase 2 Read-Only Enhancements

Date: 2026-03-18

## Goal

This phase improves explainability and navigation without adding any execution control.

The frontend remains read-only and continues to preserve the validated safety boundary.

## New Read-Only Capabilities

Added in this phase:

- scenario drilldown
- recent run detail view
- source-file path display
- copy-path convenience for repo-relative paths
- repo and data health section

## Scenario Drilldown

The scenario panel now supports a detail view.

For the selected scenario it shows:

- which rules belong to the scenario
- which target each rule resolves to
- which OCR profile each rule resolves to
- related recent runs when matching evidence is available

This makes the single-config multi-target example easier to understand for an external reader.

## Run Detail View

The recent runs panel now supports a read-only detail view for the selected run.

Shown fields:

- matched rule
- target
- OCR profile
- screenshot path
- raw OCR output
- normalized OCR output
- validation result
- source log file

## Source-File Linking

The UI now displays repo-relative source paths for:

- targets
- OCR profiles
- scenarios
- rules
- recent runs

This improves traceability from dashboard view back to repository evidence and config files.

## Why The UI Still Stays Safe

This phase does not add:

- config editing
- script triggering
- file write-back
- new log creation
- any execution capability

The dashboard remains a read-only repository viewer over the existing validated project boundary.
