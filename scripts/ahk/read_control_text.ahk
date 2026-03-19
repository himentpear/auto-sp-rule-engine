#Requires AutoHotkey v2.0
SetTitleMatchMode 2

ApplyFocusStrategy(strategyType, targetTitle, targetControl, waitTimeoutSeconds, settleDelayMs) {
    if (strategyType = "focus_control_direct") {
        if (targetControl != "") {
            ControlFocus(targetControl, targetTitle)
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
        ControlFocus(targetControl, targetTitle)
    }
    Sleep(settleDelayMs)
}

if A_Args.Length < 3 {
    ExitApp(64)
}

targetTitle := A_Args[1]
targetControl := A_Args[2]
outFile := A_Args[3]
focusStrategyType := A_Args.Length >= 4 ? A_Args[4] : "activate_then_focus_control"
readbackStrategyType := A_Args.Length >= 5 ? A_Args[5] : "control_text"
waitTimeoutSeconds := A_Args.Length >= 6 ? Number(A_Args[6]) : 1.0
settleDelayMs := A_Args.Length >= 7 ? Integer(A_Args[7]) : 150

if !WinExist(targetTitle) {
    ExitApp(2)
}

ApplyFocusStrategy(focusStrategyType, targetTitle, targetControl, waitTimeoutSeconds, settleDelayMs)
if (readbackStrategyType = "window_text") {
    controlText := WinGetText(targetTitle)
} else {
    controlText := ControlGetText(targetControl, targetTitle)
}
if FileExist(outFile) {
    FileDelete(outFile)
}
FileAppend(controlText, outFile, "UTF-8")
ExitApp(0)
