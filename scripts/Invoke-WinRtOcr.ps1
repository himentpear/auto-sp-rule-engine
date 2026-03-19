param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
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

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
if (-not $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if (-not $engine) {
    throw 'Unable to create WinRT OCR engine.'
}

$ocrResult = Await-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

[PSCustomObject]@{
    ImagePath = $resolvedImagePath
    Language = $engine.RecognizerLanguage.LanguageTag
    LineCount = [int]($ocrResult.Lines | Measure-Object).Count
    Text = ($ocrResult.Text -replace "`r", '')
} | ConvertTo-Json -Depth 4
