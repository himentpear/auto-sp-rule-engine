# Phase 2 Validation Results

Date: 2026-03-18
Validation target: Windows Notepad
Validation config: `config/rules.sample.json`

## End-to-End Result

Result: **the refactored Phase 2 pipeline still works end-to-end**

Validated end-to-end flow:

1. `scripts/run_rules.py` loaded the sample JSON config
2. `scripts/capture_window.ps1` captured the Notepad target window
3. `scripts/winrt_ocr.py` produced OCR text from the captured image
4. Rule `append-on-trigger-token` matched on `TRIGGER TOKEN`
5. `scripts/trigger_action.ahk` ran through the configured AutoHotkey executable
6. The Notepad control was modified
7. The run was logged to `examples/logs/phase2-validation.json`

## Validation Setup

Target file:

- `notes/ahk-ocr-validation-target.txt`

Baseline content before run:

```text
AHK OCR validation target.
TRIGGER TOKEN: RULE_OK
```

Configured rule:

- if OCR output contains `TRIGGER TOKEN`
- then append visible line `PHASE2_RULE_APPEND`

## Refactored Run Output

Observed `run_rules.py` output:

- `matched_rule`: `append-on-trigger-token`
- action `exit_code`: `0`
- action `mode`: `append`
- readback included `PHASE2_RULE_APPEND`

Structured log file:

- `examples/logs/phase2-validation.json`

## OCR Evidence

OCR before action from the logged capture:

```text
ahk-ocr-validation-target.txt AHK OCR validation target. TRIGGER TOKEN: RULE 0K
```

OCR after action from the logged capture:

```text
ahk-ocr-validation-target.txt AHK OCR validation target. TRIGGER TOKEN: RULE 0K PHASE2 RULE APPEND
```

This confirms the appended line became visible in the target window.

## Control Readback Evidence

The Phase 2 run also performed a post-action control readback.

Logged readback text:

```text
AHK OCR validation target.
TRIGGER TOKEN: RULE_OK

PHASE2_RULE_APPEND
```

This is the strongest confirmation that the validated control-targeted write path still works after refactoring.

## Public Release Evidence

The public release keeps the structured JSON evidence log:

- `examples/logs/phase2-validation.json`

The public screenshot set is focused on the finalized Phase 3 release path rather than preserving every Phase 2 transient image.

## Notes

One transient issue occurred when `winrt_ocr.py` was run immediately after saving the post-action screenshot. Re-running OCR directly on the saved file succeeded. This did not affect the final validation result.

No LLM was introduced.
No mouse automation was required.
The validation remained on the control-targeted write path.

## Final Statement

The refactored Phase 2 pipeline works end-to-end on this machine for the validated path:

- capture target window
- OCR the screenshot
- match configured text rule
- trigger AutoHotkey
- modify Notepad through control-targeted writing
- log the run

## Next Most Valuable Expansion Step

The next most valuable step is:

- add support for multiple safe rule targets and multiple control-targeted actions while keeping the same logging and OCR pipeline

Why this is next:

- it extends the proven architecture without depending on unverified low-level key simulation
- it tests whether the current pipeline generalizes cleanly beyond one hard-coded Notepad scenario
- it keeps risk low while improving practical usefulness
