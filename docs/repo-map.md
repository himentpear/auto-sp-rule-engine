# Repo Map

`auto-sp-rule-engine` 2.0 RC is organized as a read-only repository guide over a narrow validated automation core.

## Top-level Reading Path

1. `README.md`
   Short 2.0 RC landing page.
2. `docs/`
   Overview, workflow, validation path, evidence index, and navigation map.
3. `examples/`
   Targets, OCR profiles, scenarios, action configs, and evidence logs.
4. `frontend/`
   Strictly read-only repository explorer, saved views, evidence hub, and repo health.
5. `notes/`
   Release-candidate notes, validation history, frontend notes, and 2.0 summaries.

## Core Terms

- Repository guide
  The combined docs and read-only frontend entry path.
- Saved views
  Named read-only frontend filters for common repository slices.
- Evidence hub
  Read-only evidence browser grouped by scenario, rule, run status, or source file.
- Repo health
  Summary across docs, notes, examples, evidence, screenshots, build presence, and load errors.
- Release candidate
  Cleaner release-quality repository state without widening the validated execution boundary.

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

- `examples/logs/`
- `screenshots/examples/`
- `docs/evidence-index.md`

## 2.0 RC Entry Points

- `docs/morning-workflow.md`
- `docs/evidence-index.md`
- `notes/v2-upgrade-summary.md`
- `notes/v2-release-readiness.md`

## Safe Validation Commands

- `npm run evidence:index`
- `npm run docs:check`
- `npm run repo:health`
- `npm run repo:ux:check`
- `npm run repo:validate`
