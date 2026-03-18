#Requires AutoHotkey v2.0
SetTitleMatchMode 2

outFile := A_ScriptDir "\read_notepad_text.txt"
if FileExist(outFile) {
    FileDelete(outFile)
}

targetTitle := A_Args.Length >= 1 ? A_Args[1] : "ahk-ocr-validation-target.txt - Notepad"
targetControl := "RichEditD2DPT1"
currentText := ControlGetText(targetControl, targetTitle)
FileAppend(currentText, outFile, "UTF-8")
ExitApp(0)
