# Phase 8 Summary

## Result

Second-application migration succeeded.

The repository now has formal end-to-end evidence beyond Notepad using `7-Zip File Manager` as a second real application target.

## What Was Selected

Selected second application:

- `7-Zip File Manager`

Why it was selected:

- low-risk local desktop application
- visible stable window title
- exposed a standard Win32 `Edit1` control
- narrow address-bar ROI was OCR-readable
- could stay inside the validated `capture -> OCR -> rule match -> control-targeted write` boundary

## What Had To Change

Target definition changes:

- Notepad `RichEditD2DPT1` changed to 7-Zip `Edit1`
- process changed from `Notepad` to `7zFM`
- target window became a fixed folder window instead of a document editor window

OCR profile changes:

- moved to a compact address-bar ROI
- increased scale to `2.5`
- kept preprocessing explicit and narrow

Infrastructure changes:

- generic control readback replaced the Notepad-only readback path
- explicit activation/focus was added before control read/write
- OCR subprocess encoding was normalized to UTF-8 for reliable local execution

## Validated Actions

Validated on the second application:

- `replace_text`
- `write_if_missing`

Evidence files:

- `examples/logs/phase8-7zip-replace-validation.json`
- `examples/logs/phase8-7zip-write-if-missing-validation.json`
- `examples/logs/phase8-7zip-replace-readback.txt`
- `examples/logs/phase8-7zip-write-if-missing-readback.txt`
- `screenshots/phase8-7zip-replace-validation.png`
- `screenshots/phase8-7zip-write-if-missing-validation.png`

## Honest Scope

The migration did not prove that every desktop application will behave like Notepad.

What this phase does prove:

- the architecture now has evidence beyond Notepad
- the current pipeline can migrate to a second real application when that application exposes a standard editable control and the target is defined narrowly

What still appears application-specific:

- control naming and control class
- activation/focus requirements before read/write
- ROI placement and OCR tuning
- behavior differences between editor controls and single-line address-bar controls

## Next Best Step

Next best step: `deeper target abstraction`

Reason:

- Phase 8 showed that the high-level pipeline transfers, but control activation/readback behavior still varies by application class
- a deeper abstraction around target activation, readable control identity, and control-type constraints is a better next step than frontend surfacing
- once that abstraction is stable, another application migration will be more meaningful and less ad hoc
