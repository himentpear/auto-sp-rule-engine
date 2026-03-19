import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain } from 'electron';
import {
  createWorkspace,
  deleteWorkspace,
  ensureDefaultWorkspace,
  getWorkspace,
  listWorkspaces,
  saveWorkspace,
} from './workspaces.js';
import { executeWorkspaceRule } from './execution.js';
import { monitorManager } from './monitor.js';
import { inspectWindowControls, listWindows } from './windows.js';
import { sanitizeMonitorOptions, sanitizeRulePayload } from './security.js';
import { applyLaunchAtLogin, cleanupOldWorkspaceLogs, getSettings, saveSettings } from './settings.js';
import { getWorkspacesRoot } from './workspaces.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;

function getRendererEntry() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  return path.join(__dirname, '../../dist/index.html');
}

function getPreloadPath() {
  return path.join(__dirname, '../preload/preload.cjs');
}

async function createMainWindow() {
  const preloadPath = getPreloadPath();
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1280,
    minHeight: 840,
    backgroundColor: '#ebe6dc',
    title: 'Auto SP Rule Engine Assistant',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const entry = getRendererEntry();
  if (entry.startsWith('http')) {
    await mainWindow.loadURL(entry);
  } else {
    await mainWindow.loadFile(entry);
  }
}

function registerWorkspaceIpc() {
  ipcMain.handle('workspaces:list', async () => listWorkspaces(app.getPath('userData')));
  ipcMain.handle('workspaces:get', async (_event, workspaceId) => getWorkspace(app.getPath('userData'), workspaceId));
  ipcMain.handle('workspaces:create', async (_event, input) => createWorkspace(app.getPath('userData'), input));
  ipcMain.handle('workspaces:save', async (_event, workspaceId, payload) => saveWorkspace(app.getPath('userData'), workspaceId, payload));
  ipcMain.handle('workspaces:delete', async (_event, workspaceId) => {
    await deleteWorkspace(app.getPath('userData'), workspaceId);
    return { ok: true };
  });
  ipcMain.handle('workspaces:execute-rule', async (_event, workspaceId, rule) => {
    const sanitizedRule = sanitizeRulePayload(rule);
    return executeWorkspaceRule(app.getPath('userData'), workspaceId, sanitizedRule);
  });
  ipcMain.handle('monitor:list-windows', async (_event, titleRegex) => listWindows(titleRegex));
  ipcMain.handle('monitor:inspect-controls', async (_event, windowTitle) => inspectWindowControls(windowTitle));
  ipcMain.handle('monitor:start', async (_event, workspaceId, options) => {
    const workspace = await getWorkspace(app.getPath('userData'), workspaceId);
    const sanitizedOptions = sanitizeMonitorOptions(options, workspace);
    return monitorManager.start(app.getPath('userData'), workspaceId, sanitizedOptions);
  });
  ipcMain.handle('monitor:stop', async (_event, workspaceId) => monitorManager.stop(workspaceId));
  ipcMain.handle('monitor:status', async (_event, workspaceId) => monitorManager.getStatus(workspaceId));
  ipcMain.handle('monitor:logs', async (_event, workspaceId) =>
    monitorManager.loadWorkspaceLogs(app.getPath('userData'), workspaceId),
  );
  ipcMain.handle('monitor:export-captures', async (_event, workspaceId) =>
    monitorManager.exportCapturedContent(app.getPath('userData'), workspaceId),
  );
  ipcMain.handle('settings:get', async () => getSettings(app.getPath('userData')));
  ipcMain.handle('settings:save', async (_event, nextSettings) => saveSettings(app.getPath('userData'), nextSettings));
}

app.whenReady().then(async () => {
  await ensureDefaultWorkspace(app.getPath('userData'));
  const settings = await getSettings(app.getPath('userData'));
  applyLaunchAtLogin(settings.launchAtLogin);
  await cleanupOldWorkspaceLogs(getWorkspacesRoot(app.getPath('userData')), settings.logRetentionDays);
  registerWorkspaceIpc();
  monitorManager.on('status', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:status', payload);
    }
  });
  monitorManager.on('log', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:log', payload);
    }
  });
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
