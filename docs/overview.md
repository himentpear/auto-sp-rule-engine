# Overview

`auto-sp-rule-engine` is a local Windows rule engine for low-risk desktop automation on a constrained, validated path. The current repository state is organized as a 0.2.0 release candidate for that same narrow path.

Its current purpose is narrow:

- capture a known target window
- run WinRT OCR
- normalize OCR text
- match JSON rules
- trigger AutoHotkey through a known control path

The validated target family in this repository is modern Windows Notepad using control `RichEditD2DPT1`.

## Validated Boundary

The project is validated on this boundary:

```text
capture
  -> OCR
  -> normalization
  -> rule match
  -> AutoHotkey control-targeted write
```

Simple architecture view:

```text
PowerShell capture
  -> WinRT OCR
  -> text normalization
  -> JSON rules
  -> AutoHotkey ControlSetText path
  -> validation readback + logs
```

This boundary matters because it excludes broader, unverified execution methods.

## Main Architecture

Core entrypoints:

- [capture_window.ps1](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/capture_window.ps1)
- [winrt_ocr.py](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/winrt_ocr.py)
- [run_rules.py](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/run_rules.py)
- [trigger_action.ahk](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/trigger_action.ahk)

Phase 4 also validates:

- per-rule target resolution
- per-rule control resolution
- named OCR profiles
- per-rule OCR profile selection
- single-config multi-target scenarios

## Safe Action Types

Validated safe action types:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

These remain on the same control-targeted write path.

## Out Of Scope

This repository does not currently claim:

- low-level keyboard simulation as a reliable primitive
- mouse automation
- generic support for arbitrary desktop apps
- robust OCR across arbitrary layouts
- LLM-driven decision making

## Where To Go Next

- 0.2.0 summary: [v2-upgrade-summary.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-upgrade-summary.md)
- 0.2.0 release readiness: [v2-release-readiness.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-release-readiness.md)
- Validation progression: [validation-path.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/validation-path.md)
- Simplest verified run: [quickstart-notepad.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/quickstart-notepad.md)
- Phase 4 public examples: [phase4-public-examples.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase4-public-examples.md)
- Scenario example: [single-config-multi-target.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios/single-config-multi-target.json)
