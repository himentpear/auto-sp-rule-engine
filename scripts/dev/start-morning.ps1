param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'

$paths = @(
  'README.md',
  'docs/repo-map.md',
  'docs/morning-workflow.md',
  'docs/evidence-index.md',
  'notes/v2-upgrade-summary.md',
  'notes/v2-release-readiness.md'
)

foreach ($relative in $paths) {
  $fullPath = Join-Path $RepoRoot $relative
  if (Test-Path $fullPath) {
    Start-Process $fullPath
  }
}

Write-Output 'Opened read-only morning entrypoints.'
