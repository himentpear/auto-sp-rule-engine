# auto-sp-rule-engine

`auto-sp-rule-engine` is a local Windows rule engine for low-risk desktop automation on a narrow, validated path:

`capture window -> WinRT OCR -> JSON rule match -> AutoHotkey control-targeted write`

This repository is prepared for `v0.1.0` as a bounded release. It is intentionally scoped to the capabilities that were actually validated on this machine.

## What It Does

- captures a known target window with PowerShell
- runs WinRT OCR on the captured image
- evaluates one or more JSON rules
- triggers an AutoHotkey action through a known control path
- logs OCR input, rule evaluation, matched rule, action payload, and validation readback

The current validated target is modern Windows Notepad using control `RichEditD2DPT1`.

## Validated Pipeline

Validated end-to-end:

- `scripts/capture_window.ps1`
- `scripts/winrt_ocr.py`
- `scripts/run_rules.py`
- `scripts/trigger_action.ahk`

Validated safe action types:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

Also validated:

- multi-rule evaluation
- dry-run mode
- simple duplicate prevention based on text existence
- structured JSON logging

## Safety Boundary

This release does not claim reliable support for:

- low-level keyboard simulation
- mouse automation
- arbitrary desktop applications
- generic UI element detection
- autonomous agent behavior

All validated writes still go through a known window title and a known control path in Notepad. That boundary is intentional.

## Repository Structure

- `scripts/`
  Phase 2 and Phase 3 entrypoints for capture, OCR, rule evaluation, and AutoHotkey execution.
- `config/`
  Sample and validation-oriented configs used to verify the current pipeline.
- `examples/`
  Minimal public-facing example configs and representative validation logs.
- `screenshots/examples/`
  Small representative screenshot set for public release.
- `notes/`
  Architecture notes, validation results, and release-readiness notes.
- `vendor/autohotkey/2.0.19/`
  Repo-local AutoHotkey v2 executable used by the sample configs.

## Requirements

- Windows
- PowerShell
- Python 3 available as `py -3`
- modern Notepad installed
- WinRT OCR available through Windows

Python dependencies for the validated pipeline are standard-library only. See [requirements.txt](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/requirements.txt).

## Quick Start

1. Open [ahk-ocr-validation-target.txt](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/ahk-ocr-validation-target.txt) in Notepad.
2. Ensure the window title is `ahk-ocr-validation-target.txt - Notepad`.
3. Run one of the example configs, for example:

```powershell
py -3 scripts\run_rules.py examples\append_text.notepad.json
```

4. Inspect the generated JSON log in `logs/`.

For a no-write validation pass:

```powershell
py -3 scripts\run_rules.py config\phase3.dry-run.json --dry-run
```

## Public Examples

Minimal example configs are included for each validated safe action type:

- [append_text.notepad.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/append_text.notepad.json)
- [prepend_text.notepad.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/prepend_text.notepad.json)
- [replace_text.notepad.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/replace_text.notepad.json)
- [write_if_missing.notepad.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/write_if_missing.notepad.json)
- [append_timestamped_note.notepad.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/append_timestamped_note.notepad.json)

Representative validation evidence is included in:

- `examples/logs/`
- `screenshots/examples/`
- [phase3-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase3-validation-results.md)

## What This Release Does Not Claim

This repository does not claim that:

- OCR is robust across arbitrary desktop layouts
- AutoHotkey control writes generalize to unknown apps
- the project is ready for unattended social-app automation
- the project has validated low-level input primitives

Those claims would exceed the current evidence.

## Next Planned Step

The next highest-value expansion is:

- per-rule target window overrides
- per-rule target control overrides

That expands reuse without crossing into unvalidated low-level input methods.
