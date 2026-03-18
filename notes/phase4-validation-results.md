# Phase 4 Validation Results

Date: 2026-03-18
Targets: Windows Notepad
Control path: `RichEditD2DPT1`

## Final Result

Result: **multi-target plus multi-profile works on the validated local rule-engine path**

Validated boundary remained:

- capture
- OCR
- normalization
- rule match
- AutoHotkey control-targeted write

## Validation Setup

Validation config:

- `config/phase4.multi-target.sample.json`

Validation targets:

- `notes/phase4-primary-target.txt`
- `notes/phase4-secondary-target.txt`

Named target bundles used:

- top-level default target: `phase4-primary-target.txt - Notepad`
- named target: `secondary_notepad` -> `phase4-secondary-target.txt - Notepad`

OCR profiles used:

- `primary_full_window`
- `secondary_roi`
- `secondary_confirmed`

## Rule 1: Default Target + Default OCR Profile

Rule:

- `primary-default-full-window`

Resolved target:

- `phase4-primary-target.txt - Notepad`

Resolved OCR profile:

- `primary_full_window`

Observed:

- full-window OCR matched `primary trigger token`
- action applied: `append_text`
- appended text: `PHASE4_PRIMARY_APPEND`

Evidence:

- `examples/logs/phase4-multi-target.json`
- `examples/logs/phase4-primary-readback.txt`
- `screenshots/examples/phase4-primary-default-full-window-check1.png`
- `screenshots/examples/phase4-primary-default-full-window-check1-processed.png`

## Rule 2: Secondary Target + ROI OCR Profile

Rule:

- `secondary-roi-append`

Resolved target:

- `phase4-secondary-target.txt - Notepad`

Resolved OCR profile:

- `secondary_roi`

Observed:

- ROI OCR matched `secondary token`
- action applied: `append_text`
- appended text: `PHASE4_SECONDARY_APPEND`
- ROI and preprocessing were different from Rule 1

Evidence:

- `examples/logs/phase4-multi-target.json`
- `examples/logs/phase4-secondary-readback.txt`
- `screenshots/examples/phase4-secondary-roi-append-check1.png`
- `screenshots/examples/phase4-secondary-roi-append-check1-processed.png`

## Rule 3: Secondary Target + Confirmed OCR Profile

Rule:

- `secondary-confirm-write-if-missing`

Resolved target:

- `phase4-secondary-target.txt - Notepad`

Resolved OCR profile:

- `secondary_confirmed`

Observed:

- the same secondary target was recaptured with a different OCR profile
- `consecutive_match_count` required `2`
- frame 1 waited for confirmation
- frame 2 produced the same normalized OCR output
- multi-frame confirmation was satisfied
- action applied: `write_if_missing`
- appended marker: `PHASE4_CONFIRM_MARKER`

Evidence:

- `examples/logs/phase4-multi-target.json`
- `examples/logs/phase4-secondary-readback.txt`
- `screenshots/examples/phase4-secondary-confirm-write-if-missing-check1.png`
- `screenshots/examples/phase4-secondary-confirm-write-if-missing-check1-processed.png`
- `screenshots/examples/phase4-secondary-confirm-write-if-missing-check2.png`
- `screenshots/examples/phase4-secondary-confirm-write-if-missing-check2-processed.png`

## What Was Validated

Validated in this round:

- per-rule target resolution
- per-rule control resolution through the existing control path
- named OCR profile resolution
- per-rule OCR profile selection
- independent capture and OCR execution per rule
- two different Notepad targets in one config
- three rules hitting different target/profile combinations
- stable action execution preserved on the validated control-targeted write path

## Evidence Summary

Primary target readback:

- `PHASE4_PRIMARY_APPEND` was appended to the primary target

Secondary target readback:

- `PHASE4_SECONDARY_APPEND` was appended
- `PHASE4_CONFIRM_MARKER` was written after multi-frame confirmation

## Final Assessment

Whether multi-target plus multi-profile works:

- Yes. Different rules resolved different targets and different OCR profiles successfully in one run.

Whether stability is preserved:

- Yes. The system stayed on explicit window titles, explicit controls, and the same validated AutoHotkey control-targeted write mechanism.

What the next step should be:

- package reusable target bundles and OCR profiles into clearer public examples, then add repo-level examples showing one config driving multiple safe targets
