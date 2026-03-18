# Phase 4 Public Examples

Date: 2026-03-18

## Purpose

This note explains the public-facing Phase 4 examples structure.

The goal is to make the validated Phase 4 capability easy for an external reader to understand without implying broader desktop automation claims.

## Example Structure

Phase 4 examples are split into three parts:

- `examples/targets/`
- `examples/profiles/`
- `examples/scenarios/`

## What A Target Bundle Is

A target bundle is a small JSON object that defines:

- the window title substring
- the full window title
- the process name
- the control used for the validated write path

In this repository, target bundles stay narrow and validated. They point only to the known Notepad control path.

Current target examples:

- `examples/targets/primary-notepad-target.json`
- `examples/targets/secondary-notepad-target.json`

## What An OCR Profile Is

An OCR profile is a reusable OCR tuning bundle that defines:

- ROI
- preprocessing
- normalization
- watch behavior

This allows OCR behavior to vary per rule without changing the execution path.

Current OCR profile examples:

- `examples/profiles/default-full-window.json`
- `examples/profiles/roi-profile.json`
- `examples/profiles/multi-frame-confirmation.json`

## How A Rule Resolves Target And Profile

Rule resolution stays explicit:

1. start from global target and control defaults
2. optionally resolve a named target bundle
3. optionally apply rule-level target or control overrides
4. start from the default OCR profile
5. optionally resolve a named per-rule OCR profile
6. optionally apply a rule-level OCR override

This means one config can safely drive multiple targets while keeping each rule auditable.

## Main Scenario Example

The main public scenario is:

- `examples/scenarios/single-config-multi-target.json`

It demonstrates:

- default target plus default OCR profile
- named secondary target plus ROI OCR profile
- named secondary target plus multi-frame OCR profile

Validated evidence for that scenario:

- `examples/logs/phase4-multi-target.json`
- `examples/logs/phase4-primary-readback.txt`
- `examples/logs/phase4-secondary-readback.txt`
- `notes/phase4-validation-results.md`

## Why This Stays Within The Safety Boundary

These examples do not add new execution capability.

They still depend on:

- explicit window titles
- explicit control names
- OCR-based rule matching
- AutoHotkey control-targeted writes

They do not introduce:

- mouse automation
- low-level keyboard simulation
- LLM behavior

## Reader Guidance

External readers should treat the Phase 4 examples as validated configuration patterns, not as proof of generic desktop automation coverage.
