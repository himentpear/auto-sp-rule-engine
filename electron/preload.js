import { contextBridge, ipcRenderer } from 'electron';

const workspaceApi = {
  list: () => ipcRenderer.invoke('workspaces:list'),
  get: (workspaceId) => ipcRenderer.invoke('workspaces:get', workspaceId),
  create: (input) => ipcRenderer.invoke('workspaces:create', input),
  save: (workspaceId, payload) => ipcRenderer.invoke('workspaces:save', workspaceId, payload),
  delete: (workspaceId) => ipcRenderer.invoke('workspaces:delete', workspaceId),
  executeRule: (workspaceId, rule) => ipcRenderer.invoke('workspaces:execute-rule', workspaceId, rule),
  listWindows: (titleRegex) => ipcRenderer.invoke('monitor:list-windows', titleRegex),
  startMonitor: (workspaceId, options) => ipcRenderer.invoke('monitor:start', workspaceId, options),
  stopMonitor: (workspaceId) => ipcRenderer.invoke('monitor:stop', workspaceId),
  getMonitorStatus: (workspaceId) => ipcRenderer.invoke('monitor:status', workspaceId),
  loadWorkspaceLogs: (workspaceId) => ipcRenderer.invoke('monitor:logs', workspaceId),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  onMonitorStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('monitor:status', listener);
    return () => ipcRenderer.removeListener('monitor:status', listener);
  },
  onMonitorLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('monitor:log', listener);
    return () => ipcRenderer.removeListener('monitor:log', listener);
  },
};

contextBridge.exposeInMainWorld('workspaceApi', workspaceApi);
