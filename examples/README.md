# Examples

This folder is the public example layer for the 0.2.0 release candidate. It remains the object source behind the read-only frontend explorer and evidence hub.

Main areas:

- `targets/`
  named target bundles for the validated Notepad path and Phase 8 second-application migration targets
- `profiles/`
  named OCR profiles used in validated OCR refinement and second-application validation
- `scenarios/`
  repository-level scenario examples including validated multi-target routing
- `drafts/`
  non-executing visual-designer draft examples for safe schema validation and preview
- `logs/`
  representative evidence logs and readback files

Single-action examples:

- `append_text.notepad.json`
- `prepend_text.notepad.json`
- `replace_text.notepad.json`
- `write_if_missing.notepad.json`
- `append_timestamped_note.notepad.json`

Phase 8 second-application evidence:

- `targets/phase8-7zip-target.json`
- `profiles/phase8-7zip-address-bar.json`
- `logs/phase8-7zip-replace-validation.json`
- `logs/phase8-7zip-write-if-missing-validation.json`

Phase 9 target-abstraction evidence:

- `targets/primary-notepad-target.json`
- `targets/secondary-notepad-target.json`
- `targets/phase8-7zip-target.json`
- `logs/phase9-notepad-target-abstraction-validation.json`
- `logs/phase9-7zip-target-abstraction-validation.json`

Phase 11 designer-validation bridge examples:

- `drafts/valid-designer-draft.json`
- `drafts/invalid-designer-draft.json`

Related read-only entrypoints:

- `docs/evidence-index.md`
- `docs/morning-workflow.md`
- `notes/v2-upgrade-summary.md`
- `notes/v2-evidence-system.md`
