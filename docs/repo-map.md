# Repo Map

`auto-sp-rule-engine` is easiest to navigate as five connected layers:

1. `README.md`
   Fast navigation page.
2. `docs/`
   Overview, validation path, quickstart, repo map, evidence index.
3. `examples/`
   Public target bundles, OCR profiles, scenarios, action examples, and evidence logs.
4. `frontend/`
   Strictly read-only repository explorer.
5. `notes/`
   Validation notes, release notes, and refactor summaries.

## Start Here

- Overview: `docs/overview.md`
- Validation progression: `docs/validation-path.md`
- Simplest verified run: `docs/quickstart-notepad.md`
- Evidence index: `docs/evidence-index.md`

## Main Objects

Targets:

- `examples/targets/primary-notepad-target.json`
- `examples/targets/secondary-notepad-target.json`

OCR profiles:

- `examples/profiles/default-full-window.json`
- `examples/profiles/roi-profile.json`
- `examples/profiles/multi-frame-confirmation.json`

Scenarios:

- `examples/scenarios/single-config-multi-target.json`

Action examples:

- `examples/append_text.notepad.json`
- `examples/prepend_text.notepad.json`
- `examples/replace_text.notepad.json`
- `examples/write_if_missing.notepad.json`
- `examples/append_timestamped_note.notepad.json`

Evidence:

- Logs and readback: `examples/logs/`
- Representative screenshots: `screenshots/examples/`
- Generated evidence index: `docs/evidence-index.md`

## Script Entrypoints

Core validated pipeline:

- `scripts/capture_window.ps1`
- `scripts/winrt_ocr.py`
- `scripts/run_rules.py`
- `scripts/trigger_action.ahk`

Daily convenience scripts:

- `npm run frontend:dev`
- `npm run frontend:build`
- `npm run repo:health`
- `npm run evidence:index`
- `npm run docs:check`
- `npm run repo:refresh`

## Frontend Explorer

Main files:

- `frontend/src/App.jsx`
- `frontend/src/styles.css`
- `frontend/server.mjs`

The frontend is intentionally read-only. It is for navigation, filtering, evidence lookup, and repository orientation only.

## Release And Notes

Release-facing files:

- `CHANGELOG.md`
- `notes/release-readiness-v0.1.0.md`
- `notes/release-cleanup-summary.md`

Validation notes:

- `notes/phase2-validation-results.md`
- `notes/ocr-phase-validation-results.md`
- `notes/phase3-validation-results.md`
- `notes/phase4-validation-results.md`

Latest repo cleanup summary:

- `notes/overnight-refactor-summary.md`
