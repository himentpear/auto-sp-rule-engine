# OCR Phase Architecture

Date: 2026-03-18

## Goal

This phase improves the OCR layer without changing the validated execution boundary:

- capture target window
- preprocess image
- run WinRT OCR
- normalize OCR text
- evaluate JSON rules
- trigger AutoHotkey through the existing control-targeted write path

The write path is unchanged. The new work is limited to OCR stability, efficiency, and configurability.

## OCR Pipeline

Current OCR flow:

1. `scripts/capture_window.ps1` captures the target window.
2. `scripts/winrt_ocr.py` optionally crops an ROI, preprocesses the image, runs WinRT OCR, and normalizes the OCR text.
3. `scripts/run_rules.py` can watch the target repeatedly, skip OCR when the image has not meaningfully changed, and require multi-frame OCR confirmation before evaluating rules.

## ROI Behavior

OCR config now supports:

- `ocr.roi.x`
- `ocr.roi.y`
- `ocr.roi.width`
- `ocr.roi.height`

Coordinate meaning:

- coordinates are measured in pixels
- origin is the top-left corner of the captured window image
- ROI is applied before scaling, thresholding, and border trimming
- the final ROI is clamped to the captured image bounds

If no ROI is provided, OCR runs on the full captured window.

## Preprocessing Behavior

Configurable preprocessing settings:

- `grayscale`
- `scale`
- `threshold.enabled`
- `threshold.value`
- `trim_border.enabled`
- `trim_border.margin`

Why this helps:

- grayscale simplifies the OCR input
- scaling improves readability for small text
- thresholding can improve contrast for high-contrast text regions
- border trimming reduces empty margins and title-bar noise when combined with ROI

Processed OCR images are saved so runs remain auditable.

## Normalization Behavior

Configurable normalization settings:

- `collapse_whitespace`
- `preserve_line_breaks`
- `case`
- `simple_noise_cleanup`

Current normalization improvements:

- newline normalization
- whitespace collapsing
- optional case normalization
- removal of zero-width noise characters
- cleanup of common smart-quote variants

Both raw OCR output and normalized OCR output are logged.

## Change Detection Behavior

`run_rules.py` now supports a lightweight watch loop.

Configurable watch settings:

- `enabled`
- `polling_interval_seconds`
- `max_checks`
- `change_threshold`
- `forced_ocr_interval_seconds`
- `consecutive_match_count`

Change detection method:

- capture the current window image
- apply ROI for comparison when configured
- downscale to a small grayscale comparison image
- compute mean absolute pixel difference against the previous frame

If the difference stays below `change_threshold`, OCR is skipped unless forced by `forced_ocr_interval_seconds`.

This improves efficiency without changing how actions are executed.

## Multi-Frame Confirmation Behavior

If `consecutive_match_count` is greater than `1`, the normalized OCR text must remain identical across that many OCR checks before rules are evaluated.

This reduces the chance of acting on a single unstable OCR frame.

Important boundary:

- the confirmation applies to OCR text stability
- it does not change the downstream action path
- actions still use the validated Notepad control write path

## Structured Logging

OCR-phase logs can now include:

- `screenshot_path`
- `roi_used`
- `preprocessing_settings`
- `normalization_settings`
- `raw_ocr_output`
- `normalized_ocr_output`
- `ocr_skipped_no_change`
- `multi_frame_confirmation_required`
- `multi_frame_confirmation_satisfied`
- per-frame OCR and change-detection details in `frames`

## Why This Improves OCR Without Widening The Boundary

These changes improve the reliability of the perception layer, not the execution layer.

They do not introduce:

- low-level keyboard simulation
- mouse automation
- LLM behavior
- a broader desktop action surface

The system still acts only through the known AutoHotkey control-targeted write path that was already validated.
