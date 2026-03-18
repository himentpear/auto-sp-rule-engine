# Phase 2 Architecture

Date: 2026-03-18

## Purpose

Phase 2 turns the validated MVP into a reusable local pipeline for low-risk desktop automation on Windows.

The proven path from Phase 1 was:

- capture the target window
- run WinRT OCR on the captured image
- match a text rule
- trigger AutoHotkey
- modify Notepad through a control-targeted write path

## Why This Architecture

This design intentionally avoids unverified low-level keyboard simulation.

What was already validated:

- modern Notepad exposes a stable editor control path
  `RichEditD2DPT1`
- AutoHotkey can modify that control through control-level text operations
- WinRT OCR can reliably read a captured Notepad window image
- OCR output can drive a rule that triggers another AutoHotkey action

What was not validated:

- low-level key simulation as the dependable execution layer
- generic mouse-first automation

Because of that, Phase 2 keeps the execution layer narrow and explicit:

- recognition: screenshot + WinRT OCR
- decision: JSON rules
- action: AutoHotkey control-targeted write

## Pipeline

1. `scripts/capture_window.ps1`
   Captures a specific target window, preferring `PrintWindow` so the result reflects the target window content rather than overlapping screen pixels.

2. `scripts/winrt_ocr.py`
   Reusable OCR entrypoint. It accepts an image path and returns OCR JSON by calling the validated WinRT OCR implementation.

3. `scripts/run_rules.py`
   Orchestrates the pipeline:
   - load JSON config
   - capture the target window
   - run OCR
   - match configured rules
   - create action payload text
   - invoke AutoHotkey action
   - read back the control text
   - write structured logs

4. `scripts/trigger_action.ahk`
   Dedicated AutoHotkey action runner. It accepts:
   - target window title
   - target control
   - write mode: `write`, `append`, or `prepend`
   - text file path

   This keeps action execution on the validated control-targeted write path.

## Config-Driven Rules

Rules live in JSON.

Current sample:

- `config/rules.sample.json`

It defines:

- target window title substring
- full target window title
- target process name
- target control name
- AutoHotkey executable path
- one or more OCR text match rules
- action mode and action text

## Logging Model

Each run writes a dedicated JSON log in `logs/`.

Recorded fields include:

- timestamp
- target window
- screenshot path
- OCR output
- matched rule
- action details
- post-action control readback

This makes each run auditable without adding an LLM.

## Why This Is Maintainable

Phase 1 had many one-off scripts used to prove isolated steps.

Phase 2 improves that by separating responsibilities:

- one reusable capture entrypoint
- one reusable OCR entrypoint
- one config-driven rule runner
- one reusable AutoHotkey action script

This lowers coupling and makes it practical to:

- swap rules without changing code
- reuse the same action script on other safe targets with known controls
- add more rules and more screenshots while keeping logging consistent

## Current Boundary

Phase 2 is still a local deterministic automation tool.

It is not yet:

- a generalized desktop agent
- a mouse automation framework
- an LLM-driven system

That boundary is intentional. The current architecture is built only on mechanisms already validated on this machine.
