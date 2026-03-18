# auto-sp-rule-engine

`auto-sp-rule-engine` is a local Windows rule engine for low-risk desktop automation on a narrow, validated path:

`capture -> WinRT OCR -> normalization -> rule match -> AutoHotkey control-targeted write`

The repository is intentionally bounded to what has actually been validated on this machine. It does not claim generic desktop automation, low-level keyboard simulation, mouse automation, or LLM-driven behavior.

## What Is Validated

Validated on the current Notepad-based path:

- window capture
- WinRT OCR
- OCR ROI, preprocessing, normalization, no-change skip, forced OCR fallback, and multi-frame confirmation
- config-driven rule matching
- safe action types:
  - `append_text`
  - `prepend_text`
  - `replace_text`
  - `write_if_missing`
  - `append_timestamped_note`
- per-rule target and control overrides
- per-rule OCR profile selection
- single-config multi-target scenarios

## Start Here

- Project overview: [overview.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/overview.md)
- Validation progression: [validation-path.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/validation-path.md)
- Simplest verified run: [quickstart-notepad.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/quickstart-notepad.md)

## Public Examples

- Target bundles: [examples/targets](C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/targets)
- OCR profiles: [examples/profiles](C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/profiles)
- Scenario configs: [examples/scenarios](C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios)
- Representative evidence: [examples/logs](C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/logs)

Main Phase 4 scenario:

- [single-config-multi-target.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios/single-config-multi-target.json)

## Safety Boundary

The validated execution boundary is still:

- explicit window titles
- explicit control names
- OCR-based rule matching
- AutoHotkey control-targeted writes

Out of scope:

- mouse automation
- low-level keyboard simulation
- arbitrary application coverage
- autonomous agent behavior

## Requirements

- Windows
- PowerShell
- Python 3 available as `py -3`
- modern Notepad
- WinRT OCR available through Windows
- `Pillow`

Dependencies are listed in [requirements.txt](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/requirements.txt).
