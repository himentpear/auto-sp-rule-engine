#Requires AutoHotkey v2.0
SetTitleMatchMode 2
CoordMode("Mouse", "Screen")

if A_Args.Length < 4 {
    ExitApp(64)
}

targetTitle := A_Args[1]
targetX := Integer(A_Args[2])
targetY := Integer(A_Args[3])
notches := Max(1, Integer(A_Args[4]))
settleDelayMs := A_Args.Length >= 5 ? Integer(A_Args[5]) : 450

if !WinExist(targetTitle) {
    ExitApp(2)
}

WinActivate(targetTitle)
WinWaitActive(targetTitle, , 1.5)
MouseMove(targetX, targetY, 0)
Loop notches {
    Click("WheelUp")
    Sleep(30)
}
Sleep(settleDelayMs)
ExitApp(0)
