# Phase 8 Migration Validation

## Scope

Phase 8 validated whether the current architecture could migrate from the validated Notepad path to a second real Windows application without widening the execution boundary.

Validated boundary retained:

- capture
- WinRT OCR
- normalized JSON rule match
- AutoHotkey control-targeted write

Selected second application:

- `7-Zip File Manager`

## Target Definition

New target bundle:

- `examples/targets/phase8-7zip-target.json`

Resolved target definition:

- window title substring: `phase8-7zip-target`
- window title: `C:\\Users\\jisub\\Documents\\GitHub\\auto sp rule engine\\notes\\phase8-7zip-target\\`
- process name: `7zFM`
- control: `Edit1`

Difference from validated Notepad target:

- Notepad used `RichEditD2DPT1`
- 7-Zip used a Win32 address-bar `Edit1`
- 7-Zip required explicit window activation and control focus before reliable read/write

## OCR Profile

Dedicated OCR profile:

- `examples/profiles/phase8-7zip-address-bar.json`

Profile choices:

- narrow ROI around the visible address bar
- grayscale preprocessing
- scale `2.5`
- no thresholding
- lowercase normalization
- single-check confirmation

Resolved ROI:

- `x=12`
- `y=122`
- `width=560`
- `height=42`

Why this changed from Notepad:

- the OCR target moved from a large editor region to a compact single-line address bar
- a tighter ROI was needed to avoid file-list noise and title-bar path noise

## Rule Set

Phase 8 config:

- `config/phase8.second-app.7zip.json`

Migration-validation rules:

1. `phase8-7zip-replace-text`
   - match: contains `phase8 seed replace`
   - action: `replace_text`
   - payload: `PHASE8 REPLACE COMPLETE`

2. `phase8-7zip-write-if-missing`
   - match: contains `phase8 seed append`
   - action: `write_if_missing`
   - payload: `PHASE8 WRITE IF MISSING MARKER`

## Engine / Script Adjustments

The migration exposed two portability gaps that were corrected without widening the safety boundary:

- `scripts/ahk/read_control_text.ahk`
  - generalized readback to arbitrary window/control
  - added `WinActivate`, `WinWaitActive`, and `ControlFocus`

- `scripts/trigger_action.ahk`
  - added `WinActivate`, `WinWaitActive`, and `ControlFocus` before `ControlGetText` / `ControlSetText`

- `scripts/run_rules.py`
  - switched from a Notepad-only readback script to a generic control readback script

- `scripts/Invoke-WinRtOcr.ps1` and `scripts/winrt_ocr.py`
  - normalized UTF-8 subprocess output handling so OCR JSON remained readable on this machine

These changes stayed inside the same validated path. They improved reliability but did not add new execution capability.

## Formal Validation Runs

### Run 1: Replace Text

Seed state written into `Edit1`:

- `PHASE8 SEED REPLACE`

Command:

- `py -3 scripts/run_rules.py config/phase8.second-app.7zip.json`

Observed result:

- OCR raw: `PHASE8 SEED REPLACE`
- normalized OCR: `phase8 seed replace`
- matched rule: `phase8-7zip-replace-text`
- action applied: `replace_text`
- post-action readback: `PHASE8 REPLACE COMPLETE`

Evidence:

- `examples/logs/phase8-7zip-replace-validation.json`
- `examples/logs/phase8-7zip-replace-readback.txt`
- `screenshots/phase8-7zip-replace-validation.png`

### Run 2: Write If Missing

Seed state written into `Edit1`:

- `PHASE8 SEED APPEND`

Command:

- `py -3 scripts/run_rules.py config/phase8.second-app.7zip.json`

Observed result:

- OCR raw: `PHASE8 SEED APPEND`
- normalized OCR: `phase8 seed append`
- matched rule: `phase8-7zip-write-if-missing`
- action applied: `write_if_missing`
- post-action readback:
  - `PHASE8 SEED APPEND`
  - `PHASE8 WRITE IF MISSING MARKER`

Evidence:

- `examples/logs/phase8-7zip-write-if-missing-validation.json`
- `examples/logs/phase8-7zip-write-if-missing-readback.txt`
- `screenshots/phase8-7zip-write-if-missing-validation.png`

## What Was Validated

Validated on the second application:

- capture of the real application window
- OCR on an application-specific narrow ROI
- normalized string matching
- control-targeted `replace_text`
- control-targeted `write_if_missing`
- readback verification from the same target control

## Migration Outcome

The architecture did migrate beyond Notepad, but not completely without application-specific handling.

What migrated cleanly:

- top-level architecture
- JSON rule structure
- OCR profile selection
- per-target control definition
- control-targeted write model

What remained application-specific:

- control identity changed from `RichEditD2DPT1` to `Edit1`
- OCR ROI had to be significantly narrowed
- 7-Zip required activation/focus before reliable read/write
- `write_if_missing` on a single-line address-bar control produced a newline-delimited readback value, which is valid for this validation but not editor-like

## Validation Commands Run

Phase 8 migration commands:

- `py -3 scripts/run_rules.py config/phase8.second-app.7zip.json`
  - run 1 with seed `PHASE8 SEED REPLACE`
  - run 2 with seed `PHASE8 SEED APPEND`

Repository safety checks after Phase 8 changes:

- `npm run frontend:build`
- `npm run docs:check`
- `npm run repo:health`
- `npm run repo:ux:check`
