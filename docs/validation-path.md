# Validation Path

This project evolved through a sequence of bounded validation rounds. Each phase expanded configuration or OCR behavior without widening the execution boundary.

## Phase 2

Phase 2 established the reusable local pipeline:

- capture target window
- OCR the captured image
- match JSON rule
- trigger AutoHotkey
- write through the validated Notepad control path

Primary references:

- [phase2-architecture.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase2-architecture.md)
- [phase2-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase2-validation-results.md)

## Phase 3 Safe Actions

Phase 3 turned the single-rule path into a reusable rule engine and validated the safe action set:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`

It also validated:

- multi-rule evaluation
- dry-run
- simple duplicate prevention

Primary references:

- [phase3-rule-engine.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase3-rule-engine.md)
- [phase3-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase3-validation-results.md)

## OCR Refinement

The OCR phase improved the perception layer while leaving the action boundary unchanged.

Validated OCR improvements:

- ROI support
- preprocessing
- normalization
- no-change skip
- forced OCR fallback
- multi-frame confirmation

Primary references:

- [ocr-phase-architecture.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/ocr-phase-architecture.md)
- [ocr-phase-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/ocr-phase-validation-results.md)

## Phase 4 Multi-Target Examples

Phase 4 extended the configuration model so different rules could resolve different targets and different OCR profiles.

Validated in Phase 4:

- per-rule target overrides
- per-rule control overrides
- named OCR profiles
- per-rule OCR profile selection
- one config driving multiple safe targets

Primary references:

- [phase4-target-override.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase4-target-override.md)
- [phase4-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase4-validation-results.md)
- [single-config-multi-target.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios/single-config-multi-target.json)

## Consistent Boundary Across Phases

What changed across phases:

- rule structure
- OCR quality and efficiency
- target/profile resolution
- examples and documentation

What did not change:

- no mouse automation
- no low-level keyboard simulation
- no LLM behavior
- no move away from explicit Notepad control-targeted writes
