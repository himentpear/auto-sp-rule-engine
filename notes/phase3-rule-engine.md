# Phase 3 Rule Engine

Date: 2026-03-18

## Goal

Phase 3 expands the validated Phase 2 local pipeline into a reusable multi-rule engine while staying inside the proven safe path:

- capture target window
- run WinRT OCR
- evaluate JSON rules
- trigger AutoHotkey
- write through a control-targeted path
- validate with control readback

## Why This Still Avoids Unverified Input Simulation

Phase 3 does not introduce low-level keyboard simulation or mouse automation.

Execution still relies on:

- a known target window
- a known target control
- `ControlGetText`
- `ControlSetText`

This preserves the path already validated on modern Notepad and avoids broadening the execution layer into mechanisms not yet proven reliable on this machine.

## Config Format

Primary sample file:

- `config/rules.phase3.sample.json`

Supported top-level sections:

- `target`
- `control`
- `automation`
- `engine`
- `rules`

### Target

Defines:

- window title substring
- full target window title
- process name

### Control

Defines:

- control name
- control type label

### Engine

Defines:

- `stop_after_first_match`
- `recent_rule_hit_cooldown_seconds`

### Rules

Each rule has:

- `name`
- `match`
- `action`

## Supported Match Types

Implemented match types:

- `contains`
- `contains_any`
- `contains_all`
- `not_contains`
- `regex`

Rule evaluation is explicit and each rule logs:

- whether it matched
- why it matched or failed
- whether duplicate prevention blocked action execution

## Supported Action Types

Implemented action types:

- `append_text`
- `replace_text`
- `prepend_text`
- `write_if_missing`
- `append_timestamped_note`

These are mapped onto the validated control-targeted write path in `scripts/trigger_action.ahk`.

Validation configs now exist for the remaining safe write actions:

- `config/phase3.prepend.json`
- `config/phase3.replace.json`
- `config/phase3.append-timestamped-note.json`

Implementation detail:

- `append_timestamped_note` is expanded in `scripts/run_rules.py` into a stable payload format: `[YYYY-MM-DD HH:MM:SS] TEXT`
- the expanded payload is then sent through the same validated `append_text` control-write path

## Duplicate Prevention

Phase 3 keeps duplicate prevention simple and deterministic.

Current behavior:

- if the action payload already exists in the control text, action execution is skipped
- optional recent-hit cooldown is supported through JSON log inspection

This means Phase 3 can avoid obvious repeated writes without relying on hidden state or non-deterministic heuristics.

Validated duplicate-prevention behaviors:

- `write_if_missing` skips when the payload already exists in the control text
- recent-hit cooldown remains available, but the current formal validations relied on direct text existence checks rather than cooldown timing

## Dry-Run Behavior

`run_rules.py` supports:

- `--dry-run`

In dry-run mode:

- capture still runs
- OCR still runs
- rules are still evaluated
- matched rule is still logged
- action payload is still computed
- AutoHotkey write is not executed
- validation readback remains unchanged

This is useful for safe verification of rule logic before allowing a write.

## Structured Logging

Each Phase 3 run writes a JSON file in `logs/`.

Stable fields:

- `timestamp`
- `target_window`
- `target_control`
- `screenshot_path`
- `ocr_text`
- `evaluated_rules`
- `matched_rule`
- `action_type`
- `action_payload`
- `ahk_exit_code`
- `validation_result`
- `dry_run`

`validation_result` includes:

- pre-action control text
- post-action control text
- whether action was actually applied
- duplicate-prevention result
- readback exit code

## Entry Points

Validated Phase 3 entrypoints:

- `scripts/capture_window.ps1`
- `scripts/winrt_ocr.py`
- `scripts/run_rules.py`
- `scripts/trigger_action.ahk`

Formal validation configs:

- `config/phase3.contains.json`
- `config/phase3.write-if-missing.json`
- `config/phase3.dry-run.json`
- `config/phase3.prepend.json`
- `config/phase3.replace.json`
- `config/phase3.append-timestamped-note.json`

## Current Boundary

Phase 3 is a deterministic local rule engine.

It is not yet:

- an LLM-driven agent
- a generalized desktop automation framework
- a low-level keyboard simulation system

That boundary remains intentional.

## Validation Status

Implemented:

- explicit match types: `contains`, `contains_any`, `contains_all`, `not_contains`, `regex`
- safe action types: `append_text`, `prepend_text`, `replace_text`, `write_if_missing`, `append_timestamped_note`
- structured JSON logging
- dry-run execution mode
- simple duplicate prevention

Validated:

- `append_text`
- `prepend_text`
- `replace_text`
- `write_if_missing`
- `append_timestamped_note`
- dry-run no-write behavior
- duplicate prevention via text existence check

Not yet validated:

- per-rule target window overrides
- per-rule target control overrides
