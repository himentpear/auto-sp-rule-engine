
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  FolderKanban,
  LayoutGrid,
  MonitorPlay,
  Moon,
  Play,
  RefreshCcw,
  Share2,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Square,
  Sun,
} from 'lucide-react';
import { Button } from './components/ui/button.jsx';
import { Badge } from './components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.jsx';
import { Input } from './components/ui/input.jsx';
import { Select } from './components/ui/select.jsx';
import { Switch } from './components/ui/switch.jsx';
import wechatWorkbenchBg from './assets/wechat-workbench-bg.png';

const pageTabs = [
  { id: 'monitor', label: '监控 Monitor', icon: MonitorPlay },
  { id: 'workspaces', label: '工作区 Workspaces', icon: FolderKanban },
  { id: 'settings', label: '设置 Settings', icon: Settings2 },
];

const WECHAT_WORKBENCH_SIZE = { width: 1274, height: 1526 };

function clampRect(rect, bounds = WECHAT_WORKBENCH_SIZE) {
  const x = Math.max(0, Math.min(bounds.width - 1, Number(rect?.x) || 0));
  const y = Math.max(0, Math.min(bounds.height - 1, Number(rect?.y) || 0));
  const width = Math.max(1, Math.min(bounds.width - x, Number(rect?.width) || 1));
  const height = Math.max(1, Math.min(bounds.height - y, Number(rect?.height) || 1));
  return { x, y, width, height };
}

function rectToStyle(rect, bounds = WECHAT_WORKBENCH_SIZE) {
  const safeRect = clampRect(rect, bounds);
  return {
    left: `${(safeRect.x / bounds.width) * 100}%`,
    top: `${(safeRect.y / bounds.height) * 100}%`,
    width: `${(safeRect.width / bounds.width) * 100}%`,
    height: `${(safeRect.height / bounds.height) * 100}%`,
  };
}

function AppLogo() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-panel">
      <ShieldCheck className="h-6 w-6 text-white" />
    </div>
  );
}

function formatTime(value) {
  if (!value) return 'n/a';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function JsonPanel({ title, value }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[24rem] overflow-auto rounded-lg bg-slate-950/90 p-4 text-xs text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function StatusPill({ running }) {
  return (
    <Badge
      className={
        running
          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
          : 'border-slate-500/30 bg-slate-500/15 text-slate-300'
      }
    >
      {running ? '运行中 Running' : '已停止 Stopped'}
    </Badge>
  );
}

function BrowserFallback() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-300" />
              <CardTitle>需要 Electron 运行时 / Electron Runtime Required</CardTitle>
            </div>
            <CardDescription>
              `http://localhost:5173` 只是前端预览页，不包含 Electron preload IPC、工作区存储、监控控制或窗口捕获。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-200">
            <div>`.exe` 窗口才是真正桌面应用，所以它和浏览器标签页显示内容会不同。</div>
            <div>If you see this same screen inside the `.exe`, the Electron preload bridge failed to load and the package needs to be rebuilt.</div>
            <div>
              请运行：
              <pre className="mt-2 rounded-lg bg-slate-950/90 p-4 text-xs text-slate-100">{`npm run electron:dev
release\\OpenClose 桌面OCR助手-0.2.0.exe`}</pre>
            </div>
            <div>启动 Electron 后，请到监控页点击 `刷新窗口 / Refresh Windows`。</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SidebarNav({ activeTab, onChange, workspaces, activeWorkspaceId, onSelectWorkspace, onCreateWorkspace }) {
  return (
    <aside className="flex w-full max-w-xs flex-col gap-6 border-r border-border bg-slate-950/70 p-6 backdrop-blur">
      <div className="space-y-3">
        <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-300">桌面 OCR 监控 / Desktop OCR Monitor</Badge>
        <div className="flex items-start gap-3">
          <AppLogo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">OpenClose 桌面OCR助手</h1>
            <p className="mt-2 text-sm text-muted-foreground">带隔离工作区和主进程安全边界的桌面自动化助手。</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {pageTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card className="bg-slate-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">工作区 Workspaces</CardTitle>
          <CardDescription>每个工作区独立保存 targets、profiles、scenarios、logs、screenshots。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={onCreateWorkspace}>创建工作区 Create Workspace</Button>
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => onSelectWorkspace(workspace.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  workspace.id === activeWorkspaceId
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background/50 hover:bg-secondary'
                }`}
              >
                <div className="font-medium">{workspace.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{workspace.counts.scenarios} scenarios / {workspace.counts.rules} rules</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
function MonitorPage(props) {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    selectedScenarioId,
    setSelectedScenarioId,
    titleRegex,
    setTitleRegex,
    intervalSeconds,
    setIntervalSeconds,
    refreshWindows,
    startMonitor,
    stopMonitor,
    monitorStatus,
    windowResults,
    workspaceLogs,
    exportCapturedContent,
    exportStatus,
    inspectedControls,
    inspectControls,
    busy,
    historyScanEnabled,
    setHistoryScanEnabled,
    settings,
  } = props;

  const scenarios = activeWorkspace?.scenarios || [];
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) || scenarios[0] || null;
  const selectedTarget = activeWorkspace?.targets.find((item) => item.id === selectedScenario?.targetRef || item.name === selectedScenario?.targetRef) || null;
  const selectedProfile = activeWorkspace?.profiles.find((item) => item.id === selectedScenario?.ocrProfileRef || item.profile_key === selectedScenario?.ocrProfileRef || item.name === selectedScenario?.ocrProfileRef) || null;
  const canStart = Boolean(activeWorkspaceId && selectedScenario && titleRegex.trim()) && !busy;
  const effectiveWindows = windowResults.length ? windowResults : monitorStatus?.matchedWindow ? [monitorStatus.matchedWindow] : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-slate-950/50">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">监控控制台 Monitor Console</CardTitle>
                <CardDescription>每 3-8 秒执行一次 WinRT OCR、规范化、规则匹配和安全动作。</CardDescription>
              </div>
              <StatusPill running={monitorStatus?.running} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">场景 Scenario</label>
                <Select value={selectedScenario?.id || ''} onChange={(event) => setSelectedScenarioId(event.target.value)}>
                  {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">窗口标题正则 Window Title Regex</label>
                <Input value={titleRegex} onChange={(event) => setTitleRegex(event.target.value)} placeholder="从下面窗口列表中选择 / Select from window list" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">监控间隔 Interval Seconds</label>
                <Input type="number" min="3" max="8" value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
              <div>
                <div className="font-medium">启动监控时向上翻页扫描历史消息</div>
                <div className="text-sm text-muted-foreground">仅在启动监控时执行一次历史消息上翻扫描，平时轮询不会自动翻页。</div>
              </div>
              <Switch checked={historyScanEnabled} onCheckedChange={setHistoryScanEnabled} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={refreshWindows} variant="secondary" disabled={busy}><RefreshCcw className="mr-2 h-4 w-4" />刷新窗口 Refresh Windows</Button>
              <Button onClick={startMonitor} disabled={!canStart}><Play className="mr-2 h-4 w-4" />启动监控 Start Monitor</Button>
              <Button onClick={stopMonitor} variant="outline" disabled={busy || !monitorStatus?.running}><Square className="mr-2 h-4 w-4" />停止 Stop</Button>
              <Button onClick={exportCapturedContent} variant="outline" disabled={busy || !activeWorkspaceId}><Share2 className="mr-2 h-4 w-4" />导出捕获 Export Captures</Button>
              <Button onClick={inspectControls} variant="outline" disabled={busy || !monitorStatus?.matchedWindow?.WindowTitle}><LayoutGrid className="mr-2 h-4 w-4" />检查控件 Inspect Controls</Button>
            </div>

            {exportStatus ? (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                已导出 {exportStatus.uniqueRecordCount} 条去重结果，共扫描 {exportStatus.rawRecordCount} 条记录。 JSON: {exportStatus.jsonPath} TXT: {exportStatus.txtPath}
              </div>
            ) : null}

            {!titleRegex.trim() ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                启动监控前请先填写窗口正则。最稳妥的方式是先点 `刷新窗口 / Refresh Windows`，再点 `使用精确标题 / Use Exact Title`。
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">当前工作区 Active Workspace</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{activeWorkspace?.metadata?.name || 'n/a'}</div><div className="text-xs text-muted-foreground">{workspaces.length} workspaces loaded</div></CardContent></Card>
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">最近轮询 Last Tick</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{formatTime(monitorStatus?.lastTickAt)}</div><div className="text-xs text-muted-foreground">{monitorStatus?.lastError || 'No recent error'}</div></CardContent></Card>
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">命中窗口 Matched Window</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">{monitorStatus?.matchedWindow?.WindowTitle || 'Waiting'}</div><div className="text-xs text-muted-foreground">{monitorStatus?.matchedWindow?.ProcessName || 'No process yet'}</div><div className="mt-2 text-xs text-muted-foreground">历史上翻: {monitorStatus?.historyScanEnabled ? (monitorStatus?.historyScanCompleted ? '已完成' : '待执行') : '关闭'}</div><div className="text-xs text-muted-foreground">安全键: {settings.emergencyStopHotkey || 'CommandOrControl+Q'}</div></CardContent></Card>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium"><LayoutGrid className="h-4 w-4" />窗口匹配 Window Matches</div>
              <div className="grid gap-2">
                {effectiveWindows.map((item) => (
                  <div key={`${item.ProcessId}-${item.WindowTitle}`} className="rounded-lg border border-border bg-slate-950/30 px-3 py-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">{item.WindowTitle}</div>
                        <div className="text-xs text-muted-foreground">{item.ProcessName}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setTitleRegex(escapeRegex(item.WindowTitle))}>使用精确标题 Use Exact Title</Button>
                        <Button variant="outline" onClick={() => setTitleRegex(item.WindowTitle)}>使用原始正则 Use Raw Regex</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!effectiveWindows.length ? <div className="text-sm text-muted-foreground">还没有匹配到窗口。可以先用 `Weixin|微信` 同时匹配进程名和中文聊天/群聊标题。</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>实时日志 Live Log Stream</CardTitle>
            <CardDescription>主进程推送监控状态，renderer 只负责显示。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(monitorStatus?.logs || []).length ? monitorStatus.logs.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{entry.message}</div>
                  <Badge>{entry.level || 'info'}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatTime(entry.timestamp)}</div>
                {entry.payload?.matched_rule ? <div className="mt-2 text-xs text-cyan-300">Matched rule: {entry.payload.matched_rule}</div> : null}
                {entry.payload?.detectedByClassifier ? <div className="mt-2 text-xs text-cyan-300">Detected by classifier</div> : null}
                {entry.payload?.action_type ? <div className="text-xs text-muted-foreground">Action: {entry.payload.action_type}</div> : null}
                {entry.payload?.contentType ? <div className="text-xs text-muted-foreground">Type: {entry.payload.contentType}</div> : null}
                {entry.payload?.ocrPreview ? <div className="text-xs text-muted-foreground">OCR: {entry.payload.ocrPreview}</div> : null}
                {entry.payload?.contentSummary ? <div className="text-xs text-muted-foreground">Summary: {entry.payload.contentSummary}</div> : null}
                {entry.payload?.validation_result?.action_applied === false && entry.payload?.matched_rule ? <div className="text-xs text-amber-300">Log-only run: no control write attempted.</div> : null}
              </div>
            )) : <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">等待监控事件 / Waiting for monitor events.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>工作区运行历史 Workspace Run History</CardTitle>
            <CardDescription>结构化日志保存在 `userData/workspaces/&lt;id&gt;/logs/`。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspaceLogs.length ? workspaceLogs.map((item) => (
              <div key={`${item.id}-${item.path}`} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
                <div><div className="font-medium">{item.id}</div><div className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</div></div>
                <div>{item.matchedRule || 'no-match'}</div>
                <div>{item.actionType || 'n/a'}</div>
              </div>
            )) : <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">当前工作区还没有持久化运行记录。</div>}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <JsonPanel title="目标 JSON / Target JSON" value={selectedTarget} />
          <JsonPanel title="OCR 配置 JSON / OCR Profile JSON" value={selectedProfile} />
          <JsonPanel title="场景 JSON / Scenario JSON" value={selectedScenario} />
        </div>
      </div>

      {inspectedControls ? (
        <Card>
          <CardHeader>
            <CardTitle>控件检查 Control Inspection</CardTitle>
            <CardDescription>对当前匹配窗口做只读 AHK 控件枚举。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">Window: {inspectedControls.title || 'n/a'}</div>
            <div className="text-sm text-muted-foreground">Focused: {inspectedControls.focused || 'n/a'}</div>
            <div className="grid gap-2">
              {(inspectedControls.controls || []).map((item) => (
                <div key={`${item.control}-${item.textSample}`} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="font-medium">{item.control || '(empty control id)'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.textSample || 'no text sample'}</div>
                </div>
              ))}
              {!inspectedControls.controls?.length ? <div className="text-sm text-muted-foreground">No controls returned.</div> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function WechatWorkbench({ settings, setSettings, saveSettings, busy }) {
  const boardRef = useRef(null);
  const dragStateRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState('scan');

  const masks = settings.wechatMaskRegions || [];

  const applyRegionPatch = (layer, nextRect) => {
    const safeRect = clampRect(nextRect);
    setSettings((current) => {
      if (layer === 'scan') {
        return {
          ...current,
          wechatScanRegion: {
            ...(current.wechatScanRegion || {}),
            ...safeRect,
            enabled: true,
          },
        };
      }
      const nextMasks = (current.wechatMaskRegions || []).map((item) =>
        item.id === layer
          ? {
              ...item,
              ...safeRect,
              enabled: true,
            }
          : item,
      );
      return {
        ...current,
        wechatMaskRegions: nextMasks,
      };
    });
  };

  const handleBoardPointer = (event) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WECHAT_WORKBENCH_SIZE.width;
    const y = ((event.clientY - rect.top) / rect.height) * WECHAT_WORKBENCH_SIZE.height;
    return {
      x: Math.max(0, Math.min(WECHAT_WORKBENCH_SIZE.width, Math.round(x))),
      y: Math.max(0, Math.min(WECHAT_WORKBENCH_SIZE.height, Math.round(y))),
    };
  };

  const handlePointerDown = (event) => {
    const point = handleBoardPointer(event);
    if (!point) return;
    dragStateRef.current = {
      layer: activeLayer,
      start: point,
    };
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current) return;
    const point = handleBoardPointer(event);
    if (!point) return;
    const { start, layer } = dragStateRef.current;
    const left = Math.min(start.x, point.x);
    const top = Math.min(start.y, point.y);
    const width = Math.max(1, Math.abs(point.x - start.x));
    const height = Math.max(1, Math.abs(point.y - start.y));
    applyRegionPatch(layer, { x: left, y: top, width, height });
  };

  const handlePointerUp = () => {
    if (dragStateRef.current) {
      const { start, layer } = dragStateRef.current;
      const currentRect =
        layer === 'scan'
          ? settings.wechatScanRegion
          : (settings.wechatMaskRegions || []).find((item) => item.id === layer);
      if (!currentRect || currentRect.width < 12 || currentRect.height < 12) {
        applyRegionPatch(layer, {
          x: start.x,
          y: start.y,
          width: layer === 'scan' ? 640 : 320,
          height: layer === 'scan' ? 720 : 120,
        });
      }
    }
    dragStateRef.current = null;
  };

  const workbenchLayers = [
    {
      id: 'scan',
      label: '识别区',
      color: 'border-emerald-400 bg-emerald-500/20 text-emerald-100',
      rect: settings.wechatScanRegion,
    },
    ...masks.map((item, index) => ({
      id: item.id,
      label: item.label || `遮盖区 ${index + 1}`,
      color: 'border-rose-400 bg-rose-500/20 text-rose-100',
      rect: item,
    })),
  ];

  return (
    <Card className="bg-slate-950/50">
      <CardHeader>
        <CardTitle className="text-2xl">微信监控总工作台 WeChat Monitor Workbench</CardTitle>
        <CardDescription>把历史上翻、识别区、遮盖区和安全停止统一放在一个可视化面板里。拖拽背景图即可调整识别区或遮盖区。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {workbenchLayers.map((layer) => (
                <Button
                  key={layer.id}
                  type="button"
                  variant={activeLayer === layer.id ? 'default' : 'outline'}
                  onClick={() => setActiveLayer(layer.id)}
                  className="min-w-24"
                >
                  {layer.label}
                </Button>
              ))}
            </div>
            <div
              ref={boardRef}
              className="relative overflow-hidden rounded-2xl border border-border bg-slate-900"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              style={{ aspectRatio: `${WECHAT_WORKBENCH_SIZE.width} / ${WECHAT_WORKBENCH_SIZE.height}` }}
            >
              <img src={wechatWorkbenchBg} alt="WeChat workbench background" className="h-full w-full object-cover select-none" draggable="false" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/10" />
              {workbenchLayers.map((layer) => (
                <div
                  key={layer.id}
                  className={`pointer-events-none absolute rounded-xl border-2 ${layer.color} ${activeLayer === layer.id ? 'ring-2 ring-white/60' : ''} ${layer.rect?.enabled === false ? 'opacity-40' : ''}`}
                  style={rectToStyle(layer.rect)}
                >
                  <div className="absolute left-2 top-2 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-white">
                    {layer.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              背景使用微信监控截图。当前激活层：`{workbenchLayers.find((item) => item.id === activeLayer)?.label || '识别区'}`。按住鼠标拖拽即可重新划定范围。
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
                <div>
                  <div className="font-medium">默认历史上翻</div>
                  <div className="text-sm text-muted-foreground">启动监控时默认启用历史消息上翻扫描。</div>
                </div>
                <Switch
                  checked={Boolean(settings.historyScanDefaultEnabled)}
                  onCheckedChange={(value) => setSettings((current) => ({ ...current, historyScanDefaultEnabled: value }))}
                />
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <label className="text-sm font-medium">安全停止热键</label>
                <Input
                  className="mt-2"
                  value={settings.emergencyStopHotkey || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, emergencyStopHotkey: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium">识别区</div>
                <Switch
                  checked={Boolean(settings.wechatScanRegion?.enabled)}
                  onCheckedChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      wechatScanRegion: {
                        ...(current.wechatScanRegion || {}),
                        enabled: value,
                      },
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {['x', 'y', 'width', 'height'].map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium">{field.toUpperCase()}</label>
                    <Input
                      type="number"
                      min={field === 'width' || field === 'height' ? '1' : '0'}
                      value={settings.wechatScanRegion?.[field] ?? 0}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          wechatScanRegion: {
                            ...(current.wechatScanRegion || {}),
                            [field]: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
              <div className="font-medium">遮盖区</div>
              {masks.map((mask) => (
                <div key={mask.id} className="rounded-xl border border-border bg-slate-950/30 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium">{mask.label}</div>
                    <Switch
                      checked={Boolean(mask.enabled)}
                      onCheckedChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          wechatMaskRegions: (current.wechatMaskRegions || []).map((item) =>
                            item.id === mask.id ? { ...item, enabled: value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {['x', 'y', 'width', 'height'].map((field) => (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium">{field.toUpperCase()}</label>
                        <Input
                          type="number"
                          min={field === 'width' || field === 'height' ? '1' : '0'}
                          value={mask[field] ?? 0}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              wechatMaskRegions: (current.wechatMaskRegions || []).map((item) =>
                                item.id === mask.id ? { ...item, [field]: Number(event.target.value) } : item,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={saveSettings} disabled={busy}>保存微信工作台设置 Save WeChat Workbench</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspacePage({ activeWorkspace, activeWorkspaceId, deleteWorkspace, busy, settings, setSettings, saveSettings }) {
  const scenarios = activeWorkspace?.scenarios || [];
  const targets = activeWorkspace?.targets || [];
  const profiles = activeWorkspace?.profiles || [];
  const hasWechatWorkspace = targets.some((target) => target?.target_bundle?.window_matcher?.process_name === 'Weixin');

  return (
    <div className="space-y-6">
      <Card className="bg-slate-950/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">{activeWorkspace?.metadata?.name || 'Workspace'}</CardTitle>
            <CardDescription>默认示例包含微信监控回复和文本互动示例。</CardDescription>
          </div>
          {activeWorkspaceId && activeWorkspaceId !== 'default-workspace' ? <Button variant="destructive" onClick={() => deleteWorkspace(activeWorkspaceId)} disabled={busy}>删除工作区 Delete Workspace</Button> : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">场景 Scenarios</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{scenarios.length}</CardContent></Card>
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">目标 Targets</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{targets.length}</CardContent></Card>
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">OCR 配置 OCR Profiles</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{profiles.length}</CardContent></Card>
        </CardContent>
      </Card>

      {hasWechatWorkspace ? <WechatWorkbench settings={settings} setSettings={setSettings} saveSettings={saveSettings} busy={busy} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <JsonPanel title="Targets" value={targets} />
        <JsonPanel title="Profiles" value={profiles} />
        <JsonPanel title="Scenarios" value={scenarios} />
      </div>
    </div>
  );
}

function SettingsPage({ settings, setSettings, saveSettings, busy }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="bg-slate-950/50">
        <CardHeader>
          <CardTitle className="text-2xl">全局设置 Global Settings</CardTitle>
          <CardDescription>由主进程持久化保存监控间隔、日志保留、自启动、主题和群聊日志路径。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">默认监控间隔 Default Monitor Interval</label>
              <Input type="number" min="3" max="8" value={settings.monitorIntervalSeconds} onChange={(event) => setSettings((current) => ({ ...current, monitorIntervalSeconds: Number(event.target.value) }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">日志保留天数 Log Retention Days</label>
              <Input type="number" min="1" max="365" value={settings.logRetentionDays} onChange={(event) => setSettings((current) => ({ ...current, logRetentionDays: Number(event.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
            <div><div className="font-medium">开机自启 Launch At Login</div><div className="text-sm text-muted-foreground">通过 Electron `app.setLoginItemSettings` 管理。</div></div>
            <Switch checked={settings.launchAtLogin} onCheckedChange={(value) => setSettings((current) => ({ ...current, launchAtLogin: value }))} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
            <div><div className="font-medium">主题 Theme</div><div className="text-sm text-muted-foreground">默认深色，可切换浅色用于检查日志。</div></div>
            <Button variant="secondary" onClick={() => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}>
              {settings.theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {settings.theme === 'dark' ? '切换浅色 Switch To Light' : '切换深色 Switch To Dark'}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">群聊日志路径 Conversation Log Path</label>
            <Input
              value={settings.conversationLogRoot || ''}
              onChange={(event) => setSettings((current) => ({ ...current, conversationLogRoot: event.target.value }))}
            />
            <div className="text-xs text-muted-foreground">默认路径：文档\\OpenClose\\Log。监听任务会按日期自动建文件夹，并按群名写入 `txt` 与 `jsonl`。</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">安全停止热键 Emergency Stop Hotkey</label>
            <Input
              value={settings.emergencyStopHotkey || ''}
              onChange={(event) => setSettings((current) => ({ ...current, emergencyStopHotkey: event.target.value }))}
            />
            <div className="text-xs text-muted-foreground">默认 `Ctrl+Q`。保存后由主进程注册为全局热键，用于立即停止所有监控会话。</div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">微信扫描范围 WeChat Scan Region</div>
                <div className="text-sm text-muted-foreground">按当前微信窗口截图坐标手动划定 OCR 区域。启用后会覆盖默认禁扫边界。</div>
              </div>
              <Switch
                checked={Boolean(settings.wechatScanRegion?.enabled)}
                onCheckedChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    wechatScanRegion: {
                      ...(current.wechatScanRegion || {}),
                      enabled: value,
                    },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">X</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.wechatScanRegion?.x ?? 0}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      wechatScanRegion: {
                        ...(current.wechatScanRegion || {}),
                        x: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Y</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.wechatScanRegion?.y ?? 0}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      wechatScanRegion: {
                        ...(current.wechatScanRegion || {}),
                        y: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Width</label>
                <Input
                  type="number"
                  min="1"
                  value={settings.wechatScanRegion?.width ?? 1}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      wechatScanRegion: {
                        ...(current.wechatScanRegion || {}),
                        width: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Height</label>
                <Input
                  type="number"
                  min="1"
                  value={settings.wechatScanRegion?.height ?? 1}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      wechatScanRegion: {
                        ...(current.wechatScanRegion || {}),
                        height: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">坐标原点是当前截图窗口左上角。建议把范围压到聊天正文区域，不包含群名、置顶、昵称栏和输入框。</div>
          </div>

          <Button onClick={saveSettings} disabled={busy}>保存设置 Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>安全边界 Safety Summary</CardTitle>
          <CardDescription>执行边界由主进程和 Python 双层强制执行。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">固定 5 种安全动作 / Exactly 5 safe actions</div><div>`append_text`, `prepend_text`, `replace_text`, `write_if_missing`, `append_timestamped_note`</div></div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <BellRing className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">主进程请求清洗 / Main-process sanitization</div><div>IPC 输入会先被清洗，renderer 不能直接越过执行边界。</div></div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">AutoHotkey 限制 / AHK restriction</div><div>只允许 control-targeted 写入，`SendInput`、`Click` 和鼠标原语都被阻止。</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const api = typeof window !== 'undefined' ? window.workspaceApi : null;
  const [activeTab, setActiveTab] = useState('monitor');
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [workspaceLogs, setWorkspaceLogs] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [windowResults, setWindowResults] = useState([]);
  const [inspectedControls, setInspectedControls] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    monitorIntervalSeconds: 5,
    logRetentionDays: 14,
    launchAtLogin: false,
    theme: 'dark',
    conversationLogRoot: '',
    historyScanDefaultEnabled: false,
    emergencyStopHotkey: 'CommandOrControl+Q',
    wechatScanRegion: {
      enabled: false,
      x: 0,
      y: 220,
      width: 1274,
      height: 936,
    },
  });
  const [titleRegex, setTitleRegex] = useState('Weixin|微信');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [exportStatus, setExportStatus] = useState(null);
  const [historyScanEnabled, setHistoryScanEnabled] = useState(false);

  const activeScenario = useMemo(
    () => activeWorkspace?.scenarios?.find((scenario) => scenario.id === selectedScenarioId) || activeWorkspace?.scenarios?.[0] || null,
    [activeWorkspace, selectedScenarioId],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  async function hydrateWorkspace(workspaceId) {
    if (!api || !workspaceId) return;
    const workspace = await api.get(workspaceId);
    setActiveWorkspace(workspace);
    const nextScenarioId = workspace.scenarios[0]?.id || '';
    setSelectedScenarioId(nextScenarioId);
    setWorkspaceLogs(await api.loadWorkspaceLogs(workspaceId));
    setMonitorStatus(await api.getMonitorStatus(workspaceId));
  }

  useEffect(() => {
    if (!api) return;
    let mounted = true;
    (async () => {
      setBusy(true);
      try {
        const [workspaceItems, nextSettings] = await Promise.all([api.list(), api.getSettings()]);
        if (!mounted) return;
        setWorkspaces(workspaceItems);
        setSettings(nextSettings);
        setIntervalSeconds(nextSettings.monitorIntervalSeconds);
        setHistoryScanEnabled(Boolean(nextSettings.historyScanDefaultEnabled));
        const firstWorkspaceId = workspaceItems[0]?.id || null;
        setActiveWorkspaceId(firstWorkspaceId);
        if (firstWorkspaceId) {
          await hydrateWorkspace(firstWorkspaceId);
        }
      } catch (nextError) {
        if (mounted) setError(nextError.message);
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void hydrateWorkspace(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeScenario || titleRegex.trim()) return;
    const fallbackTitle = activeScenario.name.includes('微信') ? 'Weixin|微信' : '.*';
    setTitleRegex(fallbackTitle);
  }, [activeScenario, titleRegex]);
  useEffect(() => {
    if (!api) return undefined;
    const offStatus = api.onMonitorStatus((payload) => {
      if (payload.workspaceId === activeWorkspaceId) setMonitorStatus(payload);
    });
    const offLog = api.onMonitorLog((payload) => {
      if (payload.workspaceId === activeWorkspaceId) {
        setMonitorStatus((current) => (current ? { ...current, logs: [payload.entry, ...(current.logs || [])].slice(0, 50) } : current));
      }
    });
    return () => {
      offStatus?.();
      offLog?.();
    };
  }, [api, activeWorkspaceId]);

  async function createWorkspace() {
    if (!api) return;
    const name = window.prompt('请输入工作区名称 / Workspace name', '新工作区');
    if (!name) return;
    setBusy(true);
    try {
      const created = await api.create({ name });
      const items = await api.list();
      setWorkspaces(items);
      setActiveWorkspaceId(created.id);
      setActiveTab('workspaces');
    } finally {
      setBusy(false);
    }
  }

  async function deleteWorkspace(workspaceId) {
    if (!api || workspaceId === 'default-workspace') return;
    if (!window.confirm('确认删除该工作区？ / Delete this workspace?')) return;
    setBusy(true);
    try {
      await api.delete(workspaceId);
      const items = await api.list();
      setWorkspaces(items);
      setActiveWorkspaceId(items[0]?.id || null);
    } finally {
      setBusy(false);
    }
  }

  async function refreshWindows() {
    if (!api) return;
    setBusy(true);
    setError('');
    try {
      const results = await api.listWindows(titleRegex || '.*');
      setWindowResults(results);
      setInspectedControls(null);
      setExportStatus(null);
      if (results.length === 1 && !titleRegex) {
        setTitleRegex(escapeRegex(results[0].WindowTitle));
      }
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function startMonitor() {
    if (!api || !activeWorkspaceId || !selectedScenarioId || !titleRegex.trim()) return;
    setBusy(true);
    setError('');
    try {
      const status = await api.startMonitor(activeWorkspaceId, {
        scenarioId: selectedScenarioId,
        titleRegex,
        intervalSeconds,
        historyScanEnabled,
      });
      setMonitorStatus(status);
      setWorkspaceLogs(await api.loadWorkspaceLogs(activeWorkspaceId));
      setExportStatus(null);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopMonitor() {
    if (!api || !activeWorkspaceId) return;
    setBusy(true);
    try {
      setMonitorStatus(await api.stopMonitor(activeWorkspaceId));
      setWorkspaceLogs(await api.loadWorkspaceLogs(activeWorkspaceId));
    } finally {
      setBusy(false);
    }
  }

  async function persistSettings() {
    if (!api) return;
    setBusy(true);
    try {
      const saved = await api.saveSettings(settings);
      setSettings(saved);
      setIntervalSeconds(saved.monitorIntervalSeconds);
      setHistoryScanEnabled(Boolean(saved.historyScanDefaultEnabled));
    } finally {
      setBusy(false);
    }
  }

  async function inspectControls() {
    if (!api || !monitorStatus?.matchedWindow?.WindowTitle) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.inspectWindowControls(monitorStatus.matchedWindow.WindowTitle);
      setInspectedControls(result);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCapturedContent() {
    if (!api || !activeWorkspaceId) return;
    setBusy(true);
    setError('');
    try {
      setExportStatus(await api.exportCapturedContent(activeWorkspaceId));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!api) {
    return <BrowserFallback />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col xl:flex-row">
        <SidebarNav
          activeTab={activeTab}
          onChange={setActiveTab}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={setActiveWorkspaceId}
          onCreateWorkspace={createWorkspace}
        />

        <main className="flex-1 p-4 md:p-6 xl:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <Card className="border-cyan-500/20 bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-sky-950/60">
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="h-4 w-4" />主进程强制执行安全策略 / Main-process enforced execution policy</div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">工作区驱动的桌面自动化 / Workspace-driven desktop automation</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">renderer 只能发请求；主进程和 Python 执行层负责动作白名单、AHK 限制、schema 校验和监控调度。</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">5 safe actions</Badge>
                  <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-300">3-8s monitor loop</Badge>
                  <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-300">{settings.theme === 'dark' ? <Moon className="mr-1 h-3 w-3" /> : <Sun className="mr-1 h-3 w-3" />}{settings.theme === 'dark' ? '深色 Dark' : '浅色 Light'}</Badge>
                </div>
              </CardContent>
            </Card>

            {error ? <Card className="border-destructive/40 bg-destructive/10"><CardContent className="p-4 text-sm text-destructive-foreground">{error}</CardContent></Card> : null}

            {activeTab === 'monitor' ? <MonitorPage workspaces={workspaces} activeWorkspace={activeWorkspace} activeWorkspaceId={activeWorkspaceId} selectedScenarioId={selectedScenarioId} setSelectedScenarioId={setSelectedScenarioId} titleRegex={titleRegex} setTitleRegex={setTitleRegex} intervalSeconds={intervalSeconds} setIntervalSeconds={setIntervalSeconds} refreshWindows={refreshWindows} startMonitor={startMonitor} stopMonitor={stopMonitor} monitorStatus={monitorStatus} windowResults={windowResults} workspaceLogs={workspaceLogs} exportCapturedContent={exportCapturedContent} exportStatus={exportStatus} inspectedControls={inspectedControls} inspectControls={inspectControls} busy={busy} historyScanEnabled={historyScanEnabled} setHistoryScanEnabled={setHistoryScanEnabled} settings={settings} /> : null}
            {activeTab === 'workspaces' ? <WorkspacePage activeWorkspace={activeWorkspace} activeWorkspaceId={activeWorkspaceId} deleteWorkspace={deleteWorkspace} busy={busy} settings={settings} setSettings={setSettings} saveSettings={persistSettings} /> : null}
            {activeTab === 'settings' ? <SettingsPage settings={settings} setSettings={setSettings} saveSettings={persistSettings} busy={busy} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
