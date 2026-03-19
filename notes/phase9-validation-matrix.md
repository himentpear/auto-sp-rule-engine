# Phase 9 Validation Matrix

| App | Target Type | Focus Strategy | Readback Strategy | Validated Actions | Notes |
| --- | --- | --- | --- | --- | --- |
| Notepad | editor rich text (`RichEditD2DPT1`) | `focus_control_direct` | `control_text` | `append_text`, `write_if_missing` | Revalidated through the Phase 4 multi-target sample after refactor. Primary and secondary targets both resolved through the new bundle model. |
| 7-Zip File Manager | address-bar `Edit1` | `activate_then_focus_control` | `control_text` | `replace_text`, `write_if_missing` | Revalidated after refactor using the Phase 8 second-app config. Activation remains necessary before stable control interaction. |

## Validation Evidence

Phase 9 stable evidence files:

- `examples/logs/phase9-notepad-target-abstraction-validation.json`
- `examples/logs/phase9-7zip-target-abstraction-validation.json`
- `screenshots/phase9-notepad-target-abstraction-validation.png`
- `screenshots/phase9-7zip-target-abstraction-validation.png`

## Validation Commands

Notepad validation:

- launch:
  - `notepad.exe notes/phase4-primary-target.txt`
  - `notepad.exe notes/phase4-secondary-target.txt`
- seed:
  - primary -> `primary trigger token`
  - secondary -> `secondary token` + `confirm token`
- validate:
  - `py -3 scripts/run_rules.py config/phase4.multi-target.sample.json`

7-Zip validation:

- launch:
  - `7zFM.exe notes/phase8-7zip-target`
- seed:
  - `PHASE8 SEED REPLACE`
- validate:
  - `py -3 scripts/run_rules.py config/phase8.second-app.7zip.json`

## Observed Outcomes

Notepad:

- primary target bundle resolved to `primary_notepad`
- secondary target bundle resolved to `secondary_notepad`
- direct control focus remained valid
- default OCR profile inheritance worked
- secondary target inherited control/focus/readback from the default bundle and overrode only matcher/default OCR

7-Zip:

- target bundle resolved to `phase8_7zip_target`
- target-level OCR override produced the expected address-bar ROI and scale
- activate-then-focus remained necessary
- action and readback behavior matched the previously validated Phase 8 behavior
