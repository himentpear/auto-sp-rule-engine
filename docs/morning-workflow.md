# Morning Workflow

Use this read-only flow when reopening the repository tomorrow.

## Recommended Order

1. Open `docs/repo-map.md`
   Rebuild the repository structure first.
2. Open `notes/v2-upgrade-summary.md`
   Use the 0.2.0 RC summary as the latest handoff note.
3. Open `docs/evidence-index.md`
   Re-anchor on the current evidence set and cross references.
4. Run `npm run repo:health`
   Confirm docs, examples, evidence, build status, and dashboard data still load cleanly.
5. Run `npm run repo:ux:check`
   Confirm saved views and evidence grouping still resolve cleanly.
6. Run `npm run repo:validate`
   Use the single safe release-candidate validation pass when needed.
7. Open the read-only frontend
   Useful saved-view order:
   `Overview`, `Release Ready`, `Recent Evidence`, `Multi-target`

## Most Useful Read-only Entry Points

- `README.md`
- `docs/repo-map.md`
- `docs/evidence-index.md`
- `notes/v2-upgrade-summary.md`
- `notes/v2-release-readiness.md`
- `scripts/dev/start-morning.ps1`

## Optional Helper

`scripts/dev/start-morning.ps1` opens the main read-only files for this workflow. It does not start the automation pipeline and does not edit repository files.
