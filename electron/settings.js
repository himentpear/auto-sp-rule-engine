import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

function getDefaultConversationLogRoot() {
  return path.join(app.getPath('documents'), 'OpenClose', 'Log');
}

const DEFAULT_SETTINGS = {
  monitorIntervalSeconds: 5,
  logRetentionDays: 14,
  launchAtLogin: false,
  theme: 'dark',
  conversationLogRoot: getDefaultConversationLogRoot(),
  emergencyStopHotkey: 'CommandOrControl+Q',
  historyScanDefaultEnabled: false,
  wechatScanRegion: {
    enabled: false,
    x: 0,
    y: 220,
    width: 1274,
    height: 936,
  },
  wechatMaskRegions: [
    {
      id: 'top-mask',
      label: '顶部遮盖',
      enabled: true,
      x: 0,
      y: 0,
      width: 1274,
      height: 220,
    },
    {
      id: 'bottom-mask',
      label: '底部遮盖',
      enabled: true,
      x: 0,
      y: 1157,
      width: 1274,
      height: 369,
    },
    {
      id: 'custom-mask',
      label: '自定义遮盖',
      enabled: false,
      x: 0,
      y: 0,
      width: 320,
      height: 120,
    },
  ],
};

function settingsPath(userDataPath) {
  return path.join(userDataPath, 'settings.json');
}

function sanitizeRegion(region, fallback) {
  const source = region || fallback || {};
  return {
    ...fallback,
    ...source,
    enabled: Boolean(source.enabled),
    x: Math.max(0, Number(source.x) || 0),
    y: Math.max(0, Number(source.y) || 0),
    width: Math.max(1, Number(source.width) || fallback?.width || 1),
    height: Math.max(1, Number(source.height) || fallback?.height || 1),
  };
}

function validateScanRegion(region, fallback) {
  const safe = sanitizeRegion(region, fallback);
  const minWidth = 120;
  const minHeight = 120;
  if (safe.enabled && (safe.width < minWidth || safe.height < minHeight)) {
    return {
      ...fallback,
      enabled: false,
    };
  }
  return safe;
}

function sanitizeMaskRegions(regions) {
  const fallbackRegions = DEFAULT_SETTINGS.wechatMaskRegions;
  const incoming = Array.isArray(regions) ? regions : fallbackRegions;
  return fallbackRegions.map((fallback, index) =>
    sanitizeRegion(
      incoming.find((item) => item?.id === fallback.id) || incoming[index] || fallback,
      fallback,
    ),
  );
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
  const nextConversationLogRoot =
    typeof nextSettings.conversationLogRoot === 'string' && nextSettings.conversationLogRoot.trim()
      ? path.resolve(nextSettings.conversationLogRoot.trim())
      : current.conversationLogRoot || getDefaultConversationLogRoot();
  const nextWechatScanRegionInput = nextSettings.wechatScanRegion || current.wechatScanRegion || DEFAULT_SETTINGS.wechatScanRegion;
  const nextWechatScanRegion = validateScanRegion(nextWechatScanRegionInput, DEFAULT_SETTINGS.wechatScanRegion);
  const nextWechatMaskRegions = sanitizeMaskRegions(nextSettings.wechatMaskRegions || current.wechatMaskRegions);
  const merged = {
    ...current,
    ...nextSettings,
    monitorIntervalSeconds: Math.max(3, Math.min(8, Number(nextSettings.monitorIntervalSeconds ?? current.monitorIntervalSeconds) || 5)),
    logRetentionDays: Math.max(1, Math.min(365, Number(nextSettings.logRetentionDays ?? current.logRetentionDays) || 14)),
    launchAtLogin: Boolean(nextSettings.launchAtLogin ?? current.launchAtLogin),
    theme: nextSettings.theme === 'light' ? 'light' : 'dark',
    conversationLogRoot: nextConversationLogRoot,
    historyScanDefaultEnabled: Boolean(nextSettings.historyScanDefaultEnabled ?? current.historyScanDefaultEnabled),
    emergencyStopHotkey:
      typeof nextSettings.emergencyStopHotkey === 'string' && nextSettings.emergencyStopHotkey.trim()
        ? nextSettings.emergencyStopHotkey.trim()
        : current.emergencyStopHotkey || DEFAULT_SETTINGS.emergencyStopHotkey,
    wechatScanRegion: nextWechatScanRegion,
    wechatMaskRegions: nextWechatMaskRegions,
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
