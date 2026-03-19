param(
  [Parameter(Mandatory = $true)]
  [string]$ProcessName
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class Win32Inspect {
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
}
"@

$proc = Get-Process -Name $ProcessName -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) {
  throw "No main window found for process $ProcessName"
}

$results = New-Object System.Collections.Generic.List[object]
$callback = [Win32Inspect+EnumWindowsProc]{
  param($hwnd, $lparam)
  $classBuilder = New-Object System.Text.StringBuilder 512
  $textBuilder = New-Object System.Text.StringBuilder 512
  [void][Win32Inspect]::GetClassName($hwnd, $classBuilder, $classBuilder.Capacity)
  [void][Win32Inspect]::GetWindowText($hwnd, $textBuilder, $textBuilder.Capacity)
  $results.Add([pscustomobject]@{
    Hwnd = ('0x{0:X}' -f $hwnd.ToInt64())
    Class = $classBuilder.ToString()
    Text = $textBuilder.ToString()
  }) | Out-Null
  return $true
}

[void][Win32Inspect]::EnumChildWindows($proc.MainWindowHandle, $callback, [IntPtr]::Zero)

[pscustomobject]@{
  ProcessName = $proc.ProcessName
  MainWindowTitle = $proc.MainWindowTitle
  MainWindowHandle = ('0x{0:X}' -f $proc.MainWindowHandle)
  Children = $results
} | ConvertTo-Json -Depth 5
