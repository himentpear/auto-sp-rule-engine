# Phase 4 Target And OCR Profile Overrides

Date: 2026-03-18

## Goal

Phase 4 extends the validated local rule engine so different rules can operate on different targets and different OCR profiles without changing the validated execution boundary.

Validated action boundary remains:

- capture a known window
- run OCR
- normalize text
- evaluate rules
- trigger AutoHotkey through a known control path

## Config Structure

Phase 4 adds:

- top-level `target`
- top-level `control`
- top-level `targets`
- top-level `ocr_profile`
- top-level `ocr_profiles`
- per-rule `target`
- per-rule `target_override`
- per-rule `control_override`
- per-rule `ocr_profile`
- per-rule `ocr_override`

Reference sample:

- `config/phase4.multi-target.sample.json`

## Override Resolution Logic

### Target Resolution

Each rule resolves its target in this order:

1. start from top-level `target`
2. start from top-level `control`
3. if the rule references a named target through `rule.target`, merge that target bundle
4. if `rule.target_override` exists, merge it into the resolved target
5. if `rule.control_override` exists, merge it into the resolved control

Result:

- every rule gets its own resolved target window
- every rule gets its own resolved control path

### OCR Profile Resolution

Each rule resolves OCR settings in this order:

1. build the profile set from top-level `ocr_profiles`
2. use top-level `ocr_profile` as the default profile name
3. if a rule declares `rule.ocr_profile`, use that profile instead
4. if `rule.ocr_override` exists, merge it into the resolved profile

Result:

- each rule can use a different ROI
- each rule can use different preprocessing and normalization
- each rule can use different change-detection and multi-frame confirmation settings

## OCR Profile System

OCR profiles are defined under:

- `ocr_profiles`

Each profile can define:

- `roi`
- `preprocessing`
- `normalization`
- `watch`

This keeps OCR tuning separate from rule intent.

## Rule Evaluation Model

Phase 4 no longer assumes one capture and one OCR result for the whole config.

Instead:

- each rule resolves its own target
- each rule resolves its own OCR profile
- each rule captures its own window
- each rule runs its own OCR pipeline
- each rule evaluates independently

If `engine.stop_after_first_match` is `false`, multiple rules can hit in one run, even when they point at different targets.

## Logging

Top-level logs still provide a single summary for the first matched rule, but detailed rule-level evidence now lives under:

- `rule_runs`

Each `rule_runs[]` entry records:

- resolved target
- resolved control
- OCR profile used
- ROI used
- raw OCR output
- normalized OCR output
- frame-by-frame OCR behavior
- matched rule result
- action result

## Safety Boundary Preserved

Phase 4 does not introduce:

- mouse automation
- low-level keyboard simulation
- LLM behavior

Even with multiple targets and multiple OCR profiles, actions still execute only through explicit window titles and explicit control names using the validated AutoHotkey control-targeted write path.

The new flexibility is in configuration and OCR tuning, not in broader desktop execution methods.
