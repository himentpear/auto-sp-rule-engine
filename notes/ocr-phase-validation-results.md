# OCR Phase Validation Results

Date: 2026-03-18
Target: Windows Notepad
Control path: `RichEditD2DPT1`

## Final Result

Result: **the OCR layer is now more stable, efficient, and configurable on the validated Notepad path**

Validated boundary remained:

- capture
- WinRT OCR
- JSON rule evaluation
- AutoHotkey control-targeted write

All OCR-phase validations were run in `--dry-run` mode to keep this round focused on OCR behavior rather than additional action changes.

## Validation Run 1: Full-Window OCR

Config:

- `config/ocr.full-window.json`

Observed:

- full-window OCR matched `trigger token`
- normalized OCR output still included title-bar noise:
  - `ahk-ocr-validation-target.txt ... hi b 1 s`
- matched rule: `full-window-trigger-token`
- `multi_frame_confirmation_satisfied`: `true`
- `ocr_skipped_no_change`: `false`

Evidence:

- `examples/logs/ocr-phase-full-window.json`
- `screenshots/examples/ocr-phase-full-window-capture.png`
- `screenshots/examples/ocr-phase-full-window-processed.png`

## Validation Run 2: ROI OCR

Config:

- `config/ocr.roi.json`

ROI used:

- `x=24`
- `y=96`
- `width=1100`
- `height=280`

Observed:

- ROI OCR matched `trigger token`
- normalized OCR output was cleaner than full-window OCR
- title-bar noise was removed from the normalized OCR output
- matched rule: `roi-trigger-token`
- thresholding and border trimming completed successfully

Normalized OCR output:

- `ocr phase validation trigger token timestamp token full window base`

Evidence:

- `examples/logs/ocr-phase-roi.json`
- `screenshots/examples/ocr-phase-roi-capture.png`
- `screenshots/examples/ocr-phase-roi-processed.png`

## Validation Run 3: OCR Skip On No Change

Config:

- `config/ocr.skip-no-change.json`

Observed:

- frame 1 performed OCR
- frames 2 and 3 were skipped because the captured image did not change
- `change_ratio` was `0.0` on the skipped frames
- top-level `ocr_skipped_no_change`: `true`
- no rule matched, which kept the run inside observation-only behavior

Frame result summary:

- check 1: OCR executed
- check 2: OCR skipped
- check 3: OCR skipped

Evidence:

- `examples/logs/ocr-phase-skip-no-change.json`
- `screenshots/examples/ocr-phase-skip-check1.png`

## Validation Run 4: Multi-Frame Confirmation

Config:

- `config/ocr.multi-frame.json`

Observed:

- `consecutive_match_count` required `2`
- frame 1 produced normalized OCR output but did not evaluate rules yet
- frame 2 produced the same normalized OCR output
- multi-frame confirmation count advanced from `1` to `2`
- `multi_frame_confirmation_satisfied`: `true`
- matched rule: `multi-frame-trigger-token`

Frame result summary:

- check 1: `waiting_for_multi_frame_confirmation_1_of_2`
- check 2: confirmation satisfied and rule evaluation proceeded

Evidence:

- `examples/logs/ocr-phase-multi-frame.json`
- `screenshots/examples/ocr-phase-multi-frame-check1.png`
- `screenshots/examples/ocr-phase-multi-frame-check2.png`

## Implemented OCR Improvements

- ROI-based OCR
- configurable preprocessing
- OCR text normalization
- lightweight change detection
- forced OCR fallback interval
- multi-frame confirmation
- expanded OCR logging

## Validated OCR Improvements

- full-window OCR logging with normalized output
- ROI-based OCR on Notepad
- grayscale plus scaling preprocessing
- thresholding and border trimming in the ROI validation path
- normalized OCR output logging
- OCR skip on no-change
- multi-frame confirmation across two consecutive OCR checks

## Not Yet Validated In This Round

- per-target ROI presets beyond the current Notepad path
- normalization modes that preserve line breaks
- non-Notepad OCR targets

## Final Assessment

Which OCR improvements are implemented?

- ROI support
- preprocessing
- normalization
- change detection
- multi-frame confirmation
- structured OCR logging

Which OCR improvements are validated?

- ROI support
- preprocessing on the validated Notepad target
- normalization on the validated Notepad target
- OCR skip on no-change
- multi-frame confirmation with `consecutive_match_count = 2`

Is the OCR layer now more stable and efficient on the validated path?

- Yes. ROI plus preprocessing reduced OCR noise, change detection skipped redundant OCR work, and multi-frame confirmation reduced single-frame sensitivity.

What is the next best step after OCR refinement?

- add per-rule target and control overrides while allowing each target to carry its own OCR profile
