# Release Readiness v0.1.0

Date: 2026-03-18

## What Is Validated

- the bounded pipeline `capture -> WinRT OCR -> JSON rule match -> AutoHotkey control-targeted write`
- multi-rule evaluation on the validated Notepad target
- safe action types:
  - `append_text`
  - `prepend_text`
  - `replace_text`
  - `write_if_missing`
  - `append_timestamped_note`
- dry-run mode
- simple duplicate prevention based on text existence
- structured JSON logging with validation readback

## What Is Intentionally Out of Scope

- low-level keyboard simulation
- mouse automation
- arbitrary application support
- generic UI automation claims
- LLM-driven behavior

## Why This Release Is Honest And Bounded

The release only documents and exposes the path that was actually validated. It does not claim robustness outside the known Notepad control path, and it does not market unverified input methods as stable project primitives.

The public examples are intentionally narrow. They demonstrate the validated config format and action types without implying broader desktop automation coverage.

## Next Milestone

The next milestone should be per-rule target window overrides and per-rule target control overrides while preserving the same OCR plus control-write boundary.
