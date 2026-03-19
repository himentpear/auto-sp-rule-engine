# Phase 8 Second Application Selection

## Objective

Select one second real Windows desktop application that stays inside the validated boundary:

- capture
- WinRT OCR
- JSON rule match
- AutoHotkey control-targeted write

The selected application needed to be lower risk than a complex business application and usable without mouse automation, low-level keyboard simulation as the primary path, or any expansion of the execution boundary.

## Local Candidate Inspection

The local environment was inspected for stable desktop applications with visible titles and standard child controls.

Candidates inspected:

- Visual Studio Code
- Microsoft Visual Studio 2022
- Windows PowerShell ISE
- Git GUI
- gitk
- 7-Zip File Manager
- WinRAR

## Rejected Candidates

### Visual Studio Code

- Exposed `Chrome_RenderWidgetHostHWND` and `Intermediate D3D Window`
- Did not expose a stable standard editable control for `ControlSetText`
- Not compatible with the current validated control-targeted write path

### Microsoft Visual Studio 2022

- Child-window inspection did not expose a standard editable control usable through the current AutoHotkey path
- Too complex for a narrow migration validation

### Windows PowerShell ISE

- Child-window inspection did not expose a stable text control through the current boundary
- Not suitable for a clean control-targeted write validation

### Git GUI / gitk

- Tk-based windows exposed mostly generic `TkChild` controls
- Control identity was not explicit enough for a narrow, low-risk first migration

### WinRAR

- Trial/notification windows complicated stable launch-state control
- Main application path was less clean than 7-Zip for a narrow first migration

## Selected Application

Selected application: `7-Zip File Manager`

Selection rationale:

- Installed locally and easy to launch without login or account state
- Stable classic Win32 window with a visible title
- Exposed a standard `Edit1` child control in the address bar
- The address bar text was visible to OCR inside a narrow ROI
- Control text could be written and read back using the existing AutoHotkey control-targeted path after adding explicit window activation/focus steps

## Why 7-Zip Was Acceptable

7-Zip is not a text editor, so it is not as clean as Notepad. It was still the strongest available second-application candidate because:

- it remained low risk
- it exposed a real standard control
- it allowed end-to-end validation without adding mouse automation
- it let the migration stay inside the same safety boundary

## Application-Specific Caveat

7-Zip required explicit activation and focus before write/read operations were reliable on `Edit1`. That does not widen the execution boundary, but it does show that control interaction is not entirely application-agnostic yet.
