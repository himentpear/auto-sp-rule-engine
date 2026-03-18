# Changelog

## v0.1.0 - 2026-03-18

Initial public release candidate for the bounded local Windows rule engine.

Included in this release:

- validated pipeline: capture -> WinRT OCR -> JSON rule match -> AutoHotkey control-targeted write
- validated safe action types:
  - `append_text`
  - `prepend_text`
  - `replace_text`
  - `write_if_missing`
  - `append_timestamped_note`
- multi-rule evaluation
- dry-run mode
- simple duplicate prevention based on existing text checks
- structured JSON logging for OCR, rule evaluation, action execution, and readback validation

Release boundary:

- no low-level keyboard simulation
- no mouse automation
- no new automation features beyond the validated Notepad control-write path
