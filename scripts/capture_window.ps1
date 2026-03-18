param(
    [Parameter(Mandatory = $true)]
    [string]$WindowTitleSubstring,

    [Parameter(Mandatory = $true)]
    [string]$OutFile,

    [string]$ProcessName = 'Notepad',

    [int]$X = 120,
    [int]$Y = 80,
    [int]$Width = 1200,
    [int]$Height = 820
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Capture {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hDC, uint nFlags);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

$proc = Get-Process | Where-Object {
    (!$ProcessName -or $_.ProcessName -eq $ProcessName) -and
    $_.MainWindowTitle -and $_.MainWindowTitle -like "*$WindowTitleSubstring*"
} | Select-Object -First 1

if (-not $proc) {
    throw "Window not found: $WindowTitleSubstring"
}

$handle = $proc.MainWindowHandle
[Win32Capture]::ShowWindow($handle, 9) | Out-Null
[Win32Capture]::MoveWindow($handle, $X, $Y, $Width, $Height, $true) | Out-Null
Start-Sleep -Milliseconds 300
[Win32Capture]::SetForegroundWindow($handle) | Out-Null
Start-Sleep -Milliseconds 300

$rect = New-Object Win32Capture+RECT
[Win32Capture]::GetWindowRect($handle, [ref]$rect) | Out-Null

$bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hDC = $graphics.GetHdc()
$printOk = [Win32Capture]::PrintWindow($handle, $hDC, 2)
$graphics.ReleaseHdc($hDC)

if (-not $printOk) {
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
}

$resolvedOutFile = [System.IO.Path]::GetFullPath($OutFile)
$outDir = Split-Path -Parent $resolvedOutFile
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bitmap.Save($resolvedOutFile, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

[PSCustomObject]@{
    WindowTitle = $proc.MainWindowTitle
    ProcessName = $proc.ProcessName
    ProcessId = $proc.Id
    OutFile = $resolvedOutFile
    Bounds = @{
        Left = $rect.Left
        Top = $rect.Top
        Right = $rect.Right
        Bottom = $rect.Bottom
    }
} | ConvertTo-Json -Depth 4
