param(
    [string]$TitleRegex = '.*'
)

$ErrorActionPreference = 'Stop'

$pattern = [regex]::new($TitleRegex, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

$windows = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle
} | ForEach-Object {
    if ($pattern.IsMatch($_.MainWindowTitle)) {
        [PSCustomObject]@{
            ProcessName = $_.ProcessName
            ProcessId = $_.Id
            WindowTitle = $_.MainWindowTitle
        }
    }
}

$windows | Sort-Object WindowTitle | ConvertTo-Json -Depth 3
