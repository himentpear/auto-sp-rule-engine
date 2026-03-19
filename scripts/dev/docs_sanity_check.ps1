param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'

$requiredDocs = @(
  'README.md',
  'docs/repo-map.md',
  'docs/evidence-index.md',
  'docs/overview.md',
  'docs/quickstart-notepad.md',
  'docs/validation-path.md',
  'notes/release-readiness-v0.1.0.md',
  'notes/overnight-refactor-summary.md'
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
  'docs/overview.md'
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
