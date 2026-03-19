# Phase 9 Target Abstraction

## Goal

Phase 9 reduced application-specific duplication between the validated Notepad and 7-Zip targets without widening the execution boundary.

Validated boundary remained:

- capture
- WinRT OCR
- JSON rule match
- AutoHotkey control-targeted write

## Abstraction Model

The target abstraction layer is now expressed through `target_bundle`.

Target bundle fields:

- `window_matcher`
  - `window_title_substring`
  - `window_title`
  - `process_name`
- `focus_strategy`
  - explicit focus/activation behavior
- `control_strategy`
  - control identity and control type
- `readback_strategy`
  - readback method and any readback-specific focus behavior
- `default_ocr_profile`
  - reusable profile reference
- `ocr_overrides`
  - narrow per-target OCR overrides
- `roi_presets`
  - named reusable ROI blocks
- `default_roi_preset`
  - optional default ROI preset for the target

Legacy compatibility was preserved:

- existing `target` and `control` fields still resolve
- the read-only frontend can continue using the previous fields
- old configs still map cleanly into the new normalized runtime model

## Focus Strategy Types

The runtime now formalizes explicit focus strategies:

- `activate_only`
- `activate_then_focus_control`
- `focus_control_direct`
- `activate_then_wait`

Validated in this phase:

- Notepad: `focus_control_direct`
- 7-Zip: `activate_then_focus_control`

## Readback Strategy Types

The runtime now formalizes explicit readback strategies:

- `control_text`
- `window_text`
- `ocr_readback`
- `hybrid_readback`

Validated in this phase:

- Notepad: `control_text`
- 7-Zip: `control_text`

The non-control readback types are formalized in the runtime model and can be resolved without changing the boundary, but they were not the primary validated path in this phase.

## OCR Profile Reuse

The abstraction now allows a target bundle to reference a reusable OCR profile and narrow it with target-specific overrides.

Validated example:

- `phase8_7zip_target`
  - default OCR profile: `primary_full_window`
  - target override:
    - ROI preset `address_bar`
    - scale `2.5`

This reduced duplication compared with keeping a completely separate target-specific OCR definition embedded everywhere the target appeared.

## Runtime Changes

Key runtime changes:

- `scripts/run_rules.py`
  - normalizes legacy target definitions and `target_bundle`
  - resolves inherited target bundles for named targets
  - applies target-level focus strategy and readback strategy
  - applies target-level OCR overrides and ROI presets
  - records target bundle, focus strategy, and readback strategy in run logs

- `scripts/trigger_action.ahk`
  - accepts explicit focus strategy arguments

- `scripts/ahk/read_control_text.ahk`
  - accepts explicit focus strategy and readback mode arguments

## Config Refactor

Refactored validated configs:

- `config/phase4.multi-target.sample.json`
- `config/phase8.second-app.7zip.json`
- `examples/scenarios/single-config-multi-target.json`
- `examples/targets/primary-notepad-target.json`
- `examples/targets/secondary-notepad-target.json`
- `examples/targets/phase8-7zip-target.json`

What duplication was reduced:

- repeated control definition between primary and secondary Notepad targets
- repeated focus/readback behavior description across targets
- repeated 7-Zip OCR settings by moving them to a base profile plus narrow target override
- repeated target behavior hidden only in scripts instead of declared in config

## Read-only Frontend Surfacing

The frontend remains strictly read-only, but target details now surface:

- matcher
- focus strategy
- readback strategy
- default OCR profile
- ROI preset names

This makes the abstraction visible without adding execution controls or config editing.

## Honest Limits

The abstraction reduced duplication, but it did not eliminate application-specific behavior.

Still application-specific:

- control class and control name
- whether direct focus is sufficient
- whether activation is required before focus
- ROI placement and OCR scaling
- how newline-delimited writes behave inside different control classes

The result is a cleaner abstraction layer, not a claim that all Windows applications now behave the same.
