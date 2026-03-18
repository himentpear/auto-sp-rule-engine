# Quickstart: Notepad

This is the simplest reproducible verified path for a new reader.

It stays on the validated Notepad boundary and uses an already validated safe action config.

## Requirements

- Windows
- PowerShell
- Python available as `py -3`
- modern Notepad
- dependencies installed from [requirements.txt](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/requirements.txt)

Install the Python dependency:

```powershell
py -3 -m pip install -r requirements.txt
```

## Open The Validation Target

Open this file in Notepad:

- [ahk-ocr-validation-target.txt](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/ahk-ocr-validation-target.txt)

The validated window title is:

- `ahk-ocr-validation-target.txt - Notepad`

## Run The Simplest Verified Example

Run:

```powershell
py -3 scripts\run_rules.py examples\append_text.notepad.json
```

Expected behavior:

- the target window is captured
- OCR sees `TRIGGER TOKEN`
- the append rule matches
- AutoHotkey appends visible text to Notepad through the validated control path

## Verify The Result

Check:

- the Notepad document should include the appended line from the example config
- a JSON run log should appear in `logs/`

Representative validated evidence:

- [phase3-append_text.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/logs/phase3-append_text.json)
- [phase3-validation-results.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase3-validation-results.md)

## If You Want The Multi-Target Example

After the simple verified run, move to:

- [single-config-multi-target.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios/single-config-multi-target.json)
- [phase4-public-examples.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/phase4-public-examples.md)

## What This Quickstart Does Not Prove

This quickstart does not prove:

- low-level keyboard simulation
- mouse automation
- arbitrary application support
- generic OCR robustness outside the validated Notepad path
