#Requires AutoHotkey v2.0
SetTitleMatchMode 2

if A_Args.Length < 4 {
    ExitApp(64)
}

targetTitle := A_Args[1]
targetControl := A_Args[2]
actionType := A_Args[3]
textFile := A_Args[4]

if !WinExist(targetTitle) {
    ExitApp(2)
}

if !FileExist(textFile) {
    ExitApp(5)
}

payload := FileRead(textFile, "UTF-8")
existingText := ControlGetText(targetControl, targetTitle)

if (actionType = "replace_text") {
    newText := payload
} else if (actionType = "append_text") {
    if (existingText = "") {
        newText := payload
    } else {
        newText := existingText . "`r`n" . payload
    }
} else if (actionType = "prepend_text") {
    if (existingText = "") {
        newText := payload
    } else {
        newText := payload . "`r`n" . existingText
    }
} else if (actionType = "write_if_missing") {
    if (InStr(existingText, payload)) {
        ExitApp(0)
    }
    if (existingText = "") {
        newText := payload
    } else {
        newText := existingText . "`r`n" . payload
    }
} else {
    ExitApp(6)
}

ControlSetText(newText, targetControl, targetTitle)
Sleep(300)
ExitApp(0)
