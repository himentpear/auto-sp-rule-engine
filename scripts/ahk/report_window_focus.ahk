#Requires AutoHotkey v2.0
SetTitleMatchMode 2

if A_Args.Length < 2 {
    ExitApp(64)
}

targetTitle := A_Args[1]
outFile := A_Args[2]

if FileExist(outFile) {
    FileDelete(outFile)
}

if !WinExist(targetTitle) {
    FileAppend("WINDOW_NOT_FOUND", outFile, "UTF-8")
    ExitApp(2)
}

WinActivate(targetTitle)
WinWaitActive(targetTitle, , 3)
Sleep(500)

focused := ""
try {
    focused := ControlGetFocus(targetTitle)
}

FileAppend("TITLE=" targetTitle "`r`n", outFile, "UTF-8")
FileAppend("FOCUSED=" focused "`r`n", outFile, "UTF-8")
ExitApp(0)
