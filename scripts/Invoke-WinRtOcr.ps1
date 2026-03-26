param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath,

    [string[]]$PreferredLanguages = @('zh-CN', 'zh-Hans', 'en-US')
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]

function Await-WinRt {
    param(
        [Parameter(Mandatory = $true)]
        $AsyncOperation,

        [Parameter(Mandatory = $true)]
        [Type]$ResultType
    )

    $asTaskDefinition = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.ToString() -eq 'System.Threading.Tasks.Task`1[TResult] AsTask[TResult](Windows.Foundation.IAsyncOperation`1[TResult])'
        } |
        Select-Object -First 1

    if (-not $asTaskDefinition) {
        throw 'Unable to locate System.WindowsRuntimeSystemExtensions.AsTask<T>(IAsyncOperation<T>) overload.'
    }

    $task = $asTaskDefinition.MakeGenericMethod($resultType).Invoke($null, @($AsyncOperation))
    $task.Wait()

    if ($task.Status -ne [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
        throw $task.Exception
    }

    return $task.Result
}

$resolvedImagePath = (Resolve-Path $ImagePath).Path
$storageFile = Await-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolvedImagePath)) ([Windows.Storage.StorageFile])
$stream = Await-WinRt ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await-WinRt ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

function Try-CreateOcrEngine {
    param(
        [string[]]$LanguageTags
    )

    foreach ($tag in ($LanguageTags | Where-Object { $_ } | Select-Object -Unique)) {
        try {
            $candidate = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new($tag))
            if ($candidate) {
                return $candidate
            }
        } catch {
        }
    }

    return $null
}

$engine = Try-CreateOcrEngine -LanguageTags $PreferredLanguages
if (-not $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if (-not $engine) {
    $engine = Try-CreateOcrEngine -LanguageTags @('en-US')
}
if (-not $engine) {
    throw 'Unable to create WinRT OCR engine.'
}

$ocrResult = Await-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

$lines = @()
foreach ($line in $ocrResult.Lines) {
    if (-not $line.Words -or $line.Words.Count -eq 0) {
        continue
    }
    $left = [double]::PositiveInfinity
    $top = [double]::PositiveInfinity
    $right = [double]0
    $bottom = [double]0
    $words = @()

    foreach ($word in $line.Words) {
        $wordLeft = [double]$word.BoundingRect.X
        $wordTop = [double]$word.BoundingRect.Y
        $wordRight = [double]($word.BoundingRect.X + $word.BoundingRect.Width)
        $wordBottom = [double]($word.BoundingRect.Y + $word.BoundingRect.Height)
        if ($wordLeft -lt $left) { $left = $wordLeft }
        if ($wordTop -lt $top) { $top = $wordTop }
        if ($wordRight -gt $right) { $right = $wordRight }
        if ($wordBottom -gt $bottom) { $bottom = $wordBottom }
        $words += [PSCustomObject]@{
            Text = ($word.Text -replace "`r", '')
            BoundingRect = [PSCustomObject]@{
                X = $wordLeft
                Y = $wordTop
                Width = [double]$word.BoundingRect.Width
                Height = [double]$word.BoundingRect.Height
            }
        }
    }

    $lines += [PSCustomObject]@{
        Text = ($line.Text -replace "`r", '')
        BoundingRect = [PSCustomObject]@{
            X = $left
            Y = $top
            Width = ($right - $left)
            Height = ($bottom - $top)
        }
        Words = $words
    }
}

[PSCustomObject]@{
    ImagePath = $resolvedImagePath
    Language = $engine.RecognizerLanguage.LanguageTag
    LineCount = [int]($ocrResult.Lines | Measure-Object).Count
    Text = ($ocrResult.Text -replace "`r", '')
    Lines = $lines
} | ConvertTo-Json -Depth 6
