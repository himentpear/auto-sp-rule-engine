# Frontend Data Integration

Date: 2026-03-18

## Frontend Structure

The original static UI prototype lived in:

- `auto_sp_rule_engine_ui.jsx`

That file is now a thin re-export of the real app entrypoint:

- `frontend/src/App.jsx`

The local runtime now consists of:

- `frontend/server.mjs`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/styles.css`
- `frontend/index.html`

## How To Run Locally

Install dependencies:

```powershell
npm install
```

Run the local read-only dashboard:

```powershell
npm run dev
```

Build the frontend bundle:

```powershell
npm run build
```

Current local URL:

- `http://localhost:4173`

## Read-Only Data Sources

The dashboard reads directly from repository files.

Primary sources:

- `config/*.json`
- `examples/targets/*.json`
- `examples/profiles/*.json`
- `examples/scenarios/*.json`
- `examples/logs/*.json`
- `notes/release-readiness-v0.1.0.md`
- `docs/overview.md`

## Normalized UI Data Model

The local API normalizes repository files into:

- `targets`
- `ocrProfiles`
- `rules`
- `scenarios`
- `recentRuns`
- `validatedActionTypes`
- `boundarySummary`

Mapping details:

- `targets`
  from `examples/targets/*.json`
- `ocrProfiles`
  from `examples/profiles/*.json`
- `rules`
  flattened from `config/*.json` and `examples/scenarios/*.json`
- `scenarios`
  from `examples/scenarios/*.json`
- `recentRuns`
  derived from the newest `examples/logs/*.json`
- `validatedActionTypes`
  derived from real logged `action_type` values
- `boundarySummary`
  derived from `notes/release-readiness-v0.1.0.md` and `docs/overview.md`

## Connected UI Sections

The frontend now renders real repository data in:

- Rules tab
- OCR profiles tab
- Targets tab
- Scenarios panel
- Recent runs panel
- Boundary and status panel
- Scenario detail view
- Run detail view
- Repo and data health panel

## Error Handling

The dashboard includes read-only handling for:

- missing files
- malformed JSON
- empty logs
- partial repo state

Load errors are surfaced in the UI instead of failing silently.

## Drilldown Behavior

Scenario drilldown:

- selecting a scenario reveals the rules in that scenario
- each rule shows its resolved target
- each rule shows its resolved OCR profile
- related recent runs are linked when matching rule names are available

Run drilldown:

- selecting a recent run reveals its matched rule
- target
- OCR profile
- screenshot path
- raw OCR output when available
- normalized OCR output when available
- validation result
- source log path

## Source-File Linking

Targets, OCR profiles, scenarios, rules, and runs now expose repo-relative source paths in the UI.

The UI also includes a read-only copy-path affordance for convenience. This does not mutate repository state.

## Cross-Object Navigation

The frontend now exposes read-only navigation links across related repository objects.

Examples:

- rule -> target
- rule -> OCR profile
- rule -> scenario
- rule -> recent runs
- target -> related rules
- target -> related runs
- OCR profile -> related rules
- OCR profile -> related runs
- run -> matched rule
- run -> resolved target
- run -> OCR profile
- run -> related scenario

These links only change the current view state inside the dashboard. They do not trigger scripts, edit files, or create new logs.

## Breadcrumbs And Relationship View

The dashboard now adds a lightweight orientation layer on top of the existing detail panels.

This includes:

- breadcrumb paths for key object transitions such as scenario -> rule and run -> matched rule
- a lightweight object graph panel showing current object, upstream objects, downstream objects, and linked evidence

The relationship view is intentionally structured and text-based. It does not introduce a heavy visualization layer.

## Global Navigation Shell

The frontend now also includes a repository-level navigation shell above the main content.

It provides:

- a global breadcrumb path
- repository-wide read-only filters
- a shared orientation layer across rules, profiles, targets, scenarios, and runs

This makes local detail breadcrumbs and global navigation work together instead of competing.

## Global Filtering

The global filter bar can narrow the visible repository state by:

- object type
- target
- OCR profile
- scenario
- run status
- source file

Filtering remains read-only. It only changes which objects are visible in the current UI session.

The shell now also supports read-only preset views such as:

- all rules
- matched runs
- multi-target scenarios
- ROI OCR profiles
- recent evidence
- docs-linked objects

Filtered object counts are shown next to the shell so readers can see how many rules, targets, profiles, scenarios, and runs are currently visible.

## Evidence Navigation

Run detail now groups evidence and source references in a consistent way.

When the underlying repository data is available, a run can expose:

- source log path
- screenshot path
- related readback or text evidence paths from `examples/logs/*.txt`

All of these are shown as repo-relative paths with the same copy-path affordance.

Evidence is now grouped more consistently across detail views, using categories such as:

- screenshots
- logs
- readback
- source config
- related notes

Object detail views also connect more directly to related docs and example files, so the frontend can be used more like a repository explorer and less like a set of disconnected record panes.

## What Remains Intentionally Read-Only

This phase does not implement:

- editing configs
- triggering scripts
- mutating files
- writing new logs

Buttons that imply action remain visual placeholders only.

## Next Frontend Phase

The next frontend phase should add:

- a cleaner repo-aware navigation model
- richer scenario detail views
- deeper per-run drilldown

But it should still remain read-only until that layer is clearly validated as useful.
