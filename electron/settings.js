import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

const DEFAULT_SETTINGS = {
  monitorIntervalSeconds: 5,
  logRetentionDays: 14,
  launchAtLogin: false,
  theme: 'dark',
};

function settingsPath(userDataPath) {
  return path.join(userDataPath, 'settings.json');
}

export async function getSettings(userDataPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath(userDataPath), 'utf8'));
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(userDataPath, nextSettings) {
  const current = await getSettings(userDataPath);
  const merged = {
    ...current,
    ...nextSettings,
    monitorIntervalSeconds: Math.max(3, Math.min(8, Number(nextSettings.monitorIntervalSeconds ?? current.monitorIntervalSeconds) || 5)),
    logRetentionDays: Math.max(1, Math.min(365, Number(nextSettings.logRetentionDays ?? current.logRetentionDays) || 14)),
    launchAtLogin: Boolean(nextSettings.launchAtLogin ?? current.launchAtLogin),
    theme: nextSettings.theme === 'light' ? 'light' : 'dark',
  };
  await fs.writeFile(settingsPath(userDataPath), `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  applyLaunchAtLogin(merged.launchAtLogin);
  return merged;
}

export function applyLaunchAtLogin(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: process.execPath,
  });
}

export async function cleanupOldWorkspaceLogs(workspacesRoot, retentionDays) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  try {
    const workspaceEntries = await fs.readdir(workspacesRoot, { withFileTypes: true });
    for (const workspaceEntry of workspaceEntries.filter((entry) => entry.isDirectory())) {
      for (const bucket of ['logs', 'screenshots']) {
        const dir = path.join(workspacesRoot, workspaceEntry.name, bucket);
        try {
          const files = await fs.readdir(dir, { withFileTypes: true });
          for (const file of files.filter((entry) => entry.isFile())) {
            const fullPath = path.join(dir, file.name);
            const stats = await fs.stat(fullPath);
            if (stats.mtimeMs < cutoff) {
              await fs.rm(fullPath, { force: true });
            }
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    return;
  }
}
