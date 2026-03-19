# auto-sp-rule-engine 0.2.0 RC

Local Windows rule engine on a narrow validated path:

`capture -> WinRT OCR -> normalization -> rule match -> AutoHotkey control-targeted write`

This repository is now organized as a 0.2.0 release candidate. It is cleaner to open, easier to re-check tomorrow, and more explicit about what is and is not validated. The validated execution boundary did not widen.

## Start Here

Open these read-only entrypoints in order:

- Repo map: [docs/repo-map.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/repo-map.md)
- Morning workflow: [docs/morning-workflow.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/morning-workflow.md)
- Overview: [docs/overview.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/overview.md)
- Evidence index: [docs/evidence-index.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/docs/evidence-index.md)
- 0.2.0 summary: [notes/v2-upgrade-summary.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-upgrade-summary.md)
- 0.2.0 release readiness: [notes/v2-release-readiness.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-release-readiness.md)

## Validated Scope

Validated and still in scope:

- safe validated pipeline
- five validated safe action types
- validated OCR refinement
- validated multi-target and multi-profile routing
- strictly read-only repository explorer frontend

Still out of scope:

- mouse automation
- low-level keyboard simulation as a primary path
- frontend execution controls
- frontend config editing
- frontend file write-back
- LLM-driven execution

## Read-only Frontend 0.2.0

The frontend remains strictly read-only. It now acts as a 0.2.0 repository guide with:

- unified landing and 0.2.0 RC framing
- named saved views
- shareable URL-preserved view state
- stronger evidence hub navigation
- clearer repo health and morning workflow visibility

Saved views:

- Overview
- Release Ready
- Recent Evidence
- Multi-target
- OCR Profiles
- Docs-linked
- Validated Safe Actions

## Main Repository Objects

- Targets: [examples/targets](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/targets)
- OCR profiles: [examples/profiles](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/profiles)
- Scenarios: [examples/scenarios](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/scenarios)
- Examples index: [examples/README.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/README.md)
- Evidence logs: [examples/logs](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/examples/logs)
- Representative screenshots: [screenshots/examples](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/screenshots/examples)

## Safe RC Commands

```powershell
npm run evidence:index
npm run docs:check
npm run repo:health
npm run repo:ux:check
npm run repo:validate
powershell -ExecutionPolicy Bypass -File scripts/dev/start-morning.ps1
```

## Release Notes

- 0.2.0 upgrade plan: [notes/v2-upgrade-plan.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-upgrade-plan.md)
- 0.2.0 summary: [notes/v2-upgrade-summary.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-upgrade-summary.md)
- 0.2.0 release readiness: [notes/v2-release-readiness.md](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/notes/v2-release-readiness.md)
