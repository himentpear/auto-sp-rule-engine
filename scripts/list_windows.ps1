param(
    [string]$TitleRegex = '.*'
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$pattern = [regex]::new($TitleRegex, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class WindowEnum {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$results = New-Object System.Collections.Generic.List[object]
$callback = [WindowEnum+EnumWindowsProc]{
    param($hwnd, $lparam)

    if (-not [WindowEnum]::IsWindowVisible($hwnd)) {
        return $true
    }

    $length = [WindowEnum]::GetWindowTextLength($hwnd)
    if ($length -le 0) {
        return $true
    }

    $builder = New-Object System.Text.StringBuilder ($length + 1)
    [void][WindowEnum]::GetWindowText($hwnd, $builder, $builder.Capacity)
    $windowTitle = $builder.ToString().Trim()
    if ([string]::IsNullOrWhiteSpace($windowTitle)) {
        return $true
    }

    $processId = [uint32]0
    [void][WindowEnum]::GetWindowThreadProcessId($hwnd, [ref]$processId)

    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        $processName = $process.ProcessName
    } catch {
        return $true
    }

    if ($pattern.IsMatch($windowTitle) -or $pattern.IsMatch($processName)) {
        $results.Add([PSCustomObject]@{
            ProcessName = $processName
            ProcessId = [int]$processId
            WindowTitle = $windowTitle
            Handle = ('0x{0:X}' -f $hwnd.ToInt64())
        }) | Out-Null
    }

    return $true
}

[void][WindowEnum]::EnumWindows($callback, [IntPtr]::Zero)

$results |
    Sort-Object ProcessName, WindowTitle -Unique |
    ConvertTo-Json -Depth 3
