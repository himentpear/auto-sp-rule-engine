# OpenClose 桌面OCR助手

Windows desktop automation assistant built with Electron, Vite, React, WinRT OCR, and a hard-coded safe execution boundary.

Validated execution path:

`capture -> WinRT OCR -> normalization -> rule match -> control-targeted write`

The renderer does not execute automation directly. It can only request workspace, monitor, and settings operations through IPC. The Electron main process sanitizes payloads before handing them to the Python execution layer.

## What It Does

- Electron desktop shell with `electron-vite`
- Tailwind + shadcn-style responsive UI with dark mode
- Workspace system stored under `userData/workspaces/`
- Background monitor loop for OCR-driven desktop automation
- Global settings page for monitor interval, log retention, and launch-at-login
- Windows-only packaging through `electron-builder`

## Hard Safety Boundary

The execution layer is intentionally narrow:

- Exactly 5 safe actions are allowed:
  - `append_text`
  - `prepend_text`
  - `replace_text`
  - `write_if_missing`
  - `append_timestamped_note`
- Any unsupported action type throws an exception and writes a security log
- Low-level mouse / keyboard automation is rejected
- AutoHotkey is restricted to control-targeted write only
- `SendInput`, `Click`, `MouseMove`, `MouseClick`, and similar calls are blocked
- Every execution is validated against the `examples/drafts/valid-designer-draft.json` template shape before it runs

Relevant files:

- Main process security gate: [electron/security.js](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/electron/security.js)
- Python execution entry: [scripts/run_rules.py](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/run_rules.py)
- AHK write script: [scripts/trigger_action.ahk](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/scripts/trigger_action.ahk)

## Default Workspace Examples

The default workspace is auto-created and upgraded on launch. It contains two ready-made scenarios:

### 1. WeChat 监控回复

- Window title regex example: `WeChat|微信`
- OCR profile focuses on recent chat content
- Match types include `contains_any`
- Typical keywords:
  - `回复`
  - `在吗`
  - `收到请回复`
  - `请回`
- Safe action:
  - write a preset reply into the WeChat input control

### 2. 自动点赞/互动

- Intended for text-entry interaction surfaces only
- If OCR detects `点赞`, `like`, or similar text:
  - write `已赞`
  - or append a timestamped note reminding the user that pure mouse-like automation is intentionally blocked

This is deliberate. Pure mouse clicking is out of scope.

## How To Create A WeChat Workspace

1. Start the desktop app.
2. In the left sidebar, click `新建工作区`.
3. Open the `Workspaces` page and confirm the new workspace is active.
4. Use the default scenario as a template, or keep using the built-in `WeChat 监控回复` scenario in the default workspace.
5. In `Monitor`:
   - choose the `WeChat 监控回复` scenario
   - set window title regex to `WeChat|微信`
   - choose a monitor interval from `3` to `8` seconds
6. Click `刷新窗口` to confirm a matching WeChat window is visible.
7. Click `启动 Monitor`.
8. Watch the status bar and real-time logs for matches and safe action execution.

## WeChat Monitor Reply Example

Typical monitor request from the renderer:

```js
await window.workspaceApi.startMonitor(activeWorkspaceId, {
  scenarioId: 'wechat-monitor-reply',
  titleRegex: 'WeChat|微信',
  intervalSeconds: 5,
})
```

Direct single-rule execution is also available, but still routed through main-process validation:

```js
await window.workspaceApi.executeRule(activeWorkspaceId, {
  name: 'wechat-safe-reply',
  targetRef: 'wechat-chat-input',
  ocrProfileRef: 'wechat-chat-ocr',
  match: { type: 'contains_any', values: ['回复', '在吗'] },
  action: { type: 'append_text', text: '已收到，我稍后回复你。' }
})
```

## Global Settings

The `Settings` page controls:

- default monitor interval
- log retention days
- Windows launch at login via Electron `app.setLoginItemSettings`
- dark / light theme

The settings file is stored in:

- `userData/settings.json`

Workspace logs and screenshots are stored in:

- `userData/workspaces/<workspaceId>/logs/`
- `userData/workspaces/<workspaceId>/screenshots/`

## Development

Install dependencies:

```powershell
npm install
py -3 -m pip install -r requirements.txt
```

Run the desktop app in development:

```powershell
npm run electron:dev
```

Build renderer only:

```powershell
npm run build
```

Build Electron main + preload + renderer:

```powershell
npm run electron:build
```

Package the Windows app:

```powershell
npm run desktop:dist
```

## Packaging Notes

The project is configured for Windows-only packaging and targets a single-file portable executable.

Key config:

- Electron Vite config: [electron.vite.config.js](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/electron.vite.config.js)
- Builder config: [package.json](/C:/Users/jisub/Documents/GitHub/auto%20sp%20rule%20engine/package.json)

Local Electron distribution cache:

- `.electron-binaries/electron-v37.10.3-win32-x64.zip`

## Repository Layout

Top-level structure after the desktop upgrade:

```text
auto sp rule engine/
|-- electron/
|   |-- execution.js
|   |-- main.js
|   |-- monitor.js
|   |-- preload.js
|   |-- security.js
|   |-- settings.js
|   |-- windows.js
|   `-- templates/
|       `-- defaultWorkspace.js
|-- frontend/
|   |-- index.html
|   `-- src/
|       |-- App.jsx
|       |-- globals.css
|       |-- main.jsx
|       |-- components/
|       |   |-- ui/
|       |   |   |-- badge.jsx
|       |   |   |-- button.jsx
|       |   |   |-- card.jsx
|       |   |   |-- input.jsx
|       |   |   |-- select.jsx
|       |   |   `-- switch.jsx
|       |   `-- ...
|       `-- lib/
|           `-- utils.js
|-- scripts/
|   |-- run_rules.py
|   |-- trigger_action.ahk
|   |-- capture_window.ps1
|   `-- list_windows.ps1
|-- examples/
|   `-- drafts/
|       `-- valid-designer-draft.json
|-- dist/
|-- dist-electron/
|-- release/
|-- .electron-binaries/
|-- electron.vite.config.js
|-- tailwind.config.js
|-- postcss.config.js
|-- package.json
`-- README.md
```

## Current Validation Status

Completed locally:

- `npm run build`
- `npm run electron:build`
- Electron runtime smoke start using local `electron.exe`
- `py -3 -m pip install -r requirements.txt`

Packaging status:

- `release/win-unpacked/OpenClose 桌面OCR助手.exe` was generated
- the final portable single-file packaging step may take longer than the default command timeout on this machine
