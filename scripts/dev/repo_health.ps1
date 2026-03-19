param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
Set-Location $RepoRoot

function Test-PathRequired {
  param([string]$RelativePath)
  [pscustomobject]@{
    Path = $RelativePath
    Exists = Test-Path (Join-Path $RepoRoot $RelativePath)
  }
}

$required = @(
  'README.md',
  'docs/repo-map.md',
  'docs/morning-workflow.md',
  'docs/evidence-index.md',
  'docs/overview.md',
  'docs/quickstart-notepad.md',
  'docs/validation-path.md',
  'examples/targets',
  'examples/profiles',
  'examples/scenarios',
  'examples/logs',
  'frontend/src/App.jsx',
  'frontend/server.mjs',
  'notes/v2-upgrade-plan.md',
  'notes/v2-upgrade-summary.md',
  'notes/v2-repo-release-consolidation.md',
  'notes/frontend-v2-polish.md',
  'notes/v2-evidence-system.md',
  'notes/v2-devex.md',
  'notes/v2-release-readiness.md'
) | ForEach-Object { Test-PathRequired $_ }

$dashboardJson = @'
import("./frontend/server.mjs").then(async (m) => {
  const data = await m.buildDashboardData();
  console.log(JSON.stringify({
    targets: data.targets.length,
    profiles: data.ocrProfiles.length,
    rules: data.rules.length,
    scenarios: data.scenarios.length,
    recentRuns: data.recentRuns.length,
    evidenceItems: data.evidenceItems.length,
    docs: data.repoHealth.docsCount,
    notes: data.repoHealth.notesCount,
    loadErrors: data.loadErrors.length,
    frontendBuild: data.repoHealth.frontendBuildStatus
  }));
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
'@

$dashboard = $dashboardJson | node - | ConvertFrom-Json

$result = [pscustomobject]@{
  CheckedAt = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  RequiredPaths = $required
  Dashboard = $dashboard
  MissingCount = @($required | Where-Object { -not $_.Exists }).Count
}

$result | ConvertTo-Json -Depth 6
