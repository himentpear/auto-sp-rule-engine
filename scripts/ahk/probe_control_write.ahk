#Requires AutoHotkey v2.0
SetTitleMatchMode 2

if A_Args.Length < 4 {
    ExitApp(64)
}

targetTitle := A_Args[1]
targetControl := A_Args[2]
payloadFile := A_Args[3]
outFile := A_Args[4]

if !WinExist(targetTitle) {
    ExitApp(2)
}

if !FileExist(payloadFile) {
    ExitApp(5)
}

payload := FileRead(payloadFile, "UTF-8")
before := ControlGetText(targetControl, targetTitle)
ControlSetText(payload, targetControl, targetTitle)
Sleep(500)
after := ControlGetText(targetControl, targetTitle)

if FileExist(outFile) {
    FileDelete(outFile)
}

FileAppend("BEFORE=" before "`nPAYLOAD=" payload "`nAFTER=" after, outFile, "UTF-8")
ExitApp(0)
