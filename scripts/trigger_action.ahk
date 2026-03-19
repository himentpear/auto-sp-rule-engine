#Requires AutoHotkey v2.0
SetTitleMatchMode 2

ApplyFocusStrategy(strategyType, targetTitle, targetControl, waitTimeoutSeconds, settleDelayMs) {
    if (strategyType = "focus_control_direct") {
        if (targetControl != "") {
            try {
                ControlFocus(targetControl, targetTitle)
            } catch {
                ExitApp(8)
            }
        }
        Sleep(settleDelayMs)
        return
    }

    WinActivate(targetTitle)
    WinWaitActive(targetTitle, , waitTimeoutSeconds)

    if (strategyType = "activate_only" || strategyType = "activate_then_wait") {
        Sleep(settleDelayMs)
        return
    }

    if (targetControl != "") {
        try {
            ControlFocus(targetControl, targetTitle)
        } catch {
            ExitApp(8)
        }
    }
    Sleep(settleDelayMs)
}

if A_Args.Length < 4 {
    ExitApp(64)
}

targetTitle := A_Args[1]
targetControl := A_Args[2]
actionType := A_Args[3]
textFile := A_Args[4]
focusStrategyType := A_Args.Length >= 5 ? A_Args[5] : "activate_then_focus_control"
waitTimeoutSeconds := A_Args.Length >= 6 ? Number(A_Args[6]) : 1.0
settleDelayMs := A_Args.Length >= 7 ? Integer(A_Args[7]) : 150

if !WinExist(targetTitle) {
    ExitApp(2)
}

if !FileExist(textFile) {
    ExitApp(5)
}

if (targetControl = "") {
    ExitApp(7)
}

payload := FileRead(textFile, "UTF-8")
ApplyFocusStrategy(focusStrategyType, targetTitle, targetControl, waitTimeoutSeconds, settleDelayMs)
try {
    existingText := ControlGetText(targetControl, targetTitle)
} catch {
    ExitApp(9)
}

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

; Hard stop: only control-targeted writes are allowed in this script.
try {
    ControlSetText(newText, targetControl, targetTitle)
} catch {
    ExitApp(10)
}
Sleep(300)
ExitApp(0)
