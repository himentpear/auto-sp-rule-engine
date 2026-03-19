import React, { useEffect, useState } from 'react';
import {
  BellRing,
  FolderKanban,
  LayoutGrid,
  MonitorPlay,
  Moon,
  Play,
  RefreshCcw,
  Settings2,
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

const pageTabs = [
  { id: 'monitor', label: 'Monitor', icon: MonitorPlay },
  { id: 'workspaces', label: 'Workspaces', icon: FolderKanban },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

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

function JsonPanel({ title, value }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[24rem] overflow-auto rounded-lg bg-slate-950/90 p-4 text-xs text-slate-100">{JSON.stringify(value, null, 2)}</pre>
      </CardContent>
    </Card>
  );
}

function StatusPill({ running }) {
  return (
    <Badge className={running ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-slate-500/30 bg-slate-500/15 text-slate-300'}>
      {running ? 'Running' : 'Stopped'}
    </Badge>
  );
}

function SidebarNav({ activeTab, onChange, workspaces, activeWorkspaceId, onSelectWorkspace, onCreateWorkspace }) {
  return (
    <aside className="flex w-full max-w-xs flex-col gap-6 border-r border-border bg-slate-950/70 p-6 backdrop-blur">
      <div className="space-y-3">
        <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-300">Electron + OCR Monitor</Badge>
        <div className="flex items-start gap-3">
          <AppLogo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Auto SP Assistant</h1>
            <p className="mt-2 text-sm text-muted-foreground">Desktop automation assistant with isolated workspaces and a main-process enforced safety boundary.</p>
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
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
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
          <CardTitle className="text-base">Workspaces</CardTitle>
          <CardDescription>Each workspace keeps its own targets, profiles, scenarios, logs, and screenshots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={onCreateWorkspace}>Create Workspace</Button>
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => onSelectWorkspace(workspace.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  workspace.id === activeWorkspaceId ? 'border-primary bg-primary/10' : 'border-border bg-background/50 hover:bg-secondary'
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
    busy,
  } = props;

  const scenarios = activeWorkspace?.scenarios || [];
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) || scenarios[0] || null;
  const selectedTarget = activeWorkspace?.targets.find((item) => item.id === selectedScenario?.targetRef || item.name === selectedScenario?.targetRef) || null;
  const selectedProfile = activeWorkspace?.profiles.find((item) => item.id === selectedScenario?.ocrProfileRef || item.profile_key === selectedScenario?.ocrProfileRef || item.name === selectedScenario?.ocrProfileRef) || null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-slate-950/50">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Monitor Console</CardTitle>
                <CardDescription>Run WinRT OCR, normalization, rule matching, and safe text actions every 3-8 seconds.</CardDescription>
              </div>
              <StatusPill running={monitorStatus?.running} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario</label>
                <Select value={selectedScenario?.id || ''} onChange={(event) => setSelectedScenarioId(event.target.value)}>
                  {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Window Title Regex</label>
                <Input value={titleRegex} onChange={(event) => setTitleRegex(event.target.value)} placeholder="WeChat|微信" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Interval Seconds</label>
                <Input type="number" min="3" max="8" value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={refreshWindows} variant="secondary" disabled={busy}><RefreshCcw className="mr-2 h-4 w-4" />Refresh Windows</Button>
              <Button onClick={startMonitor} disabled={busy || !activeWorkspaceId || !selectedScenario}><Play className="mr-2 h-4 w-4" />Start Monitor</Button>
              <Button onClick={stopMonitor} variant="outline" disabled={busy || !monitorStatus?.running}><Square className="mr-2 h-4 w-4" />Stop</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">Active Workspace</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{activeWorkspace?.metadata?.name || 'n/a'}</div><div className="text-xs text-muted-foreground">{workspaces.length} workspaces loaded</div></CardContent></Card>
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">Last Tick</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{formatTime(monitorStatus?.lastTickAt)}</div><div className="text-xs text-muted-foreground">{monitorStatus?.lastError || 'No recent error'}</div></CardContent></Card>
              <Card className="bg-background/70"><CardHeader className="pb-3"><CardTitle className="text-sm">Matched Window</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">{monitorStatus?.matchedWindow?.WindowTitle || 'Waiting'}</div><div className="text-xs text-muted-foreground">{monitorStatus?.matchedWindow?.ProcessName || 'No process yet'}</div></CardContent></Card>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium"><LayoutGrid className="h-4 w-4" />Window Matches</div>
              <div className="grid gap-2">
                {(windowResults.length ? windowResults : monitorStatus?.matchedWindow ? [monitorStatus.matchedWindow] : []).map((item) => (
                  <div key={`${item.ProcessId}-${item.WindowTitle}`} className="rounded-lg border border-border bg-slate-950/30 px-3 py-2">
                    <div className="font-medium">{item.WindowTitle}</div>
                    <div className="text-xs text-muted-foreground">{item.ProcessName}</div>
                  </div>
                ))}
                {!windowResults.length && !monitorStatus?.matchedWindow ? <div className="text-sm text-muted-foreground">No matching window yet.</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Log Stream</CardTitle>
            <CardDescription>Main process pushes monitor state. Renderer only displays it.</CardDescription>
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
                {entry.payload?.action_type ? <div className="text-xs text-muted-foreground">Action: {entry.payload.action_type}</div> : null}
              </div>
            )) : <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Waiting for monitor events.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Run History</CardTitle>
            <CardDescription>Structured logs are stored under `userData/workspaces/&lt;id&gt;/logs/`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspaceLogs.length ? workspaceLogs.map((item) => (
              <div key={`${item.id}-${item.path}`} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
                <div><div className="font-medium">{item.id}</div><div className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</div></div>
                <div>{item.matchedRule || 'no-match'}</div>
                <div>{item.actionType || 'n/a'}</div>
              </div>
            )) : <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No persisted run records for this workspace yet.</div>}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <JsonPanel title="Target JSON" value={selectedTarget} />
          <JsonPanel title="OCR Profile JSON" value={selectedProfile} />
          <JsonPanel title="Scenario JSON" value={selectedScenario} />
        </div>
      </div>
    </div>
  );
}

function WorkspacePage({ activeWorkspace, activeWorkspaceId, deleteWorkspace, busy }) {
  const scenarios = activeWorkspace?.scenarios || [];
  const targets = activeWorkspace?.targets || [];
  const profiles = activeWorkspace?.profiles || [];

  return (
    <div className="space-y-6">
      <Card className="bg-slate-950/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">{activeWorkspace?.metadata?.name || 'Workspace'}</CardTitle>
            <CardDescription>Default examples include WeChat monitor reply and text-only social interaction guidance.</CardDescription>
          </div>
          {activeWorkspaceId && activeWorkspaceId !== 'default-workspace' ? <Button variant="destructive" onClick={() => deleteWorkspace(activeWorkspaceId)} disabled={busy}>Delete Workspace</Button> : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">Scenarios</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{scenarios.length}</CardContent></Card>
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">Targets</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{targets.length}</CardContent></Card>
          <Card className="bg-background/60"><CardHeader className="pb-3"><CardTitle className="text-base">OCR Profiles</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{profiles.length}</CardContent></Card>
        </CardContent>
      </Card>

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
          <CardTitle className="text-2xl">Global Settings</CardTitle>
          <CardDescription>Persisted in the main process: monitor interval, log retention, launch at login, and theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Monitor Interval</label>
              <Input type="number" min="3" max="8" value={settings.monitorIntervalSeconds} onChange={(event) => setSettings((current) => ({ ...current, monitorIntervalSeconds: Number(event.target.value) }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Log Retention Days</label>
              <Input type="number" min="1" max="365" value={settings.logRetentionDays} onChange={(event) => setSettings((current) => ({ ...current, logRetentionDays: Number(event.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
            <div><div className="font-medium">Launch At Login</div><div className="text-sm text-muted-foreground">Managed through Electron `app.setLoginItemSettings`.</div></div>
            <Switch checked={settings.launchAtLogin} onCheckedChange={(value) => setSettings((current) => ({ ...current, launchAtLogin: value }))} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
            <div><div className="font-medium">Theme</div><div className="text-sm text-muted-foreground">Tailwind dark mode is default. Toggle for lighter inspection.</div></div>
            <Button variant="secondary" onClick={() => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}>
              {settings.theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {settings.theme === 'dark' ? 'Switch To Light' : 'Switch To Dark'}
            </Button>
          </div>

          <Button onClick={saveSettings} disabled={busy}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Safety Summary</CardTitle>
          <CardDescription>Main process and Python enforce the execution boundary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">Exactly 5 safe actions</div><div>`append_text`, `prepend_text`, `replace_text`, `write_if_missing`, `append_timestamped_note`</div></div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <BellRing className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">Main-process request sanitization</div><div>IPC inputs are cleaned before the monitor or execution layer sees them.</div></div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div><div className="font-medium text-foreground">AutoHotkey restriction</div><div>Only control-targeted writes are allowed. `SendInput`, `Click`, and mouse primitives are blocked.</div></div>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    monitorIntervalSeconds: 5,
    logRetentionDays: 14,
    launchAtLogin: false,
    theme: 'dark',
  });
  const [titleRegex, setTitleRegex] = useState('WeChat|微信');
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  async function hydrateWorkspace(workspaceId) {
    if (!api || !workspaceId) return;
    const workspace = await api.get(workspaceId);
    setActiveWorkspace(workspace);
    setSelectedScenarioId(workspace.scenarios[0]?.id || '');
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
    const name = window.prompt('Workspace name', 'New Workspace');
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
    if (!window.confirm('Delete this workspace?')) return;
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
      setWindowResults(await api.listWindows(titleRegex || '.*'));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function startMonitor() {
    if (!api || !activeWorkspaceId || !selectedScenarioId) return;
    setBusy(true);
    setError('');
    try {
      const status = await api.startMonitor(activeWorkspaceId, {
        scenarioId: selectedScenarioId,
        titleRegex,
        intervalSeconds,
      });
      setMonitorStatus(status);
      setWorkspaceLogs(await api.loadWorkspaceLogs(activeWorkspaceId));
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
    } finally {
      setBusy(false);
    }
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
                  <div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="h-4 w-4" />Main-process enforced execution policy</div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">Workspace-driven desktop automation</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">Renderer requests only. Main process and Python execution layers enforce action whitelists, AHK restrictions, schema validation, and monitor scheduling.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">5 safe actions</Badge>
                  <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-300">3-8s monitor loop</Badge>
                  <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-300">{settings.theme === 'dark' ? <Moon className="mr-1 h-3 w-3" /> : <Sun className="mr-1 h-3 w-3" />}{settings.theme}</Badge>
                </div>
              </CardContent>
            </Card>

            {error ? <Card className="border-destructive/40 bg-destructive/10"><CardContent className="p-4 text-sm text-destructive-foreground">{error}</CardContent></Card> : null}

            {activeTab === 'monitor' ? <MonitorPage workspaces={workspaces} activeWorkspace={activeWorkspace} activeWorkspaceId={activeWorkspaceId} selectedScenarioId={selectedScenarioId} setSelectedScenarioId={setSelectedScenarioId} titleRegex={titleRegex} setTitleRegex={setTitleRegex} intervalSeconds={intervalSeconds} setIntervalSeconds={setIntervalSeconds} refreshWindows={refreshWindows} startMonitor={startMonitor} stopMonitor={stopMonitor} monitorStatus={monitorStatus} windowResults={windowResults} workspaceLogs={workspaceLogs} busy={busy} /> : null}
            {activeTab === 'workspaces' ? <WorkspacePage activeWorkspace={activeWorkspace} activeWorkspaceId={activeWorkspaceId} deleteWorkspace={deleteWorkspace} busy={busy} /> : null}
            {activeTab === 'settings' ? <SettingsPage settings={settings} setSettings={setSettings} saveSettings={persistSettings} busy={busy} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
