param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'

$requiredDocs = @(
  'README.md',
  'docs/repo-map.md',
  'docs/morning-workflow.md',
  'docs/evidence-index.md',
  'docs/overview.md',
  'docs/quickstart-notepad.md',
  'docs/validation-path.md',
  'notes/release-readiness-v0.1.0.md',
  'notes/v2-upgrade-plan.md',
  'notes/v2-upgrade-summary.md',
  'notes/v2-repo-release-consolidation.md',
  'notes/frontend-v2-polish.md',
  'notes/v2-evidence-system.md',
  'notes/v2-devex.md',
  'notes/v2-release-readiness.md'
)

$missing = @()
foreach ($relative in $requiredDocs) {
  if (-not (Test-Path (Join-Path $RepoRoot $relative))) {
    $missing += $relative
  }
}

$readme = Get-Content -Raw (Join-Path $RepoRoot 'README.md')
$requiredMentions = @(
  'docs/repo-map.md',
  'docs/evidence-index.md',
  'docs/overview.md',
  'docs/morning-workflow.md',
  'notes/v2-upgrade-summary.md',
  'notes/v2-release-readiness.md'
)

$missingMentions = @()
foreach ($mention in $requiredMentions) {
  if ($readme -notmatch [regex]::Escape($mention)) {
    $missingMentions += $mention
  }
}

if ($missing.Count -or $missingMentions.Count) {
  [pscustomobject]@{
    Ok = $false
    MissingDocs = $missing
    MissingReadmeMentions = $missingMentions
  } | ConvertTo-Json -Depth 4
  exit 1
}

[pscustomobject]@{
  Ok = $true
  CheckedDocs = $requiredDocs.Count
  ReadmeMentions = $requiredMentions
} | ConvertTo-Json -Depth 4
