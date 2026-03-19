import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultWorkspacePayload } from './templates/defaultWorkspace.js';

const WORKSPACE_FILES = {
  metadata: 'workspace.json',
  targets: 'targets.json',
  profiles: 'profiles.json',
  scenarios: 'scenarios.json',
};

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function readJson(targetPath, fallback = null) {
  try {
    const content = await fs.readFile(targetPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(targetPath, value) {
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function workspaceDir(rootDir, workspaceId) {
  return path.join(rootDir, workspaceId);
}

function workspaceFilePath(rootDir, workspaceId, fileKey) {
  return path.join(workspaceDir(rootDir, workspaceId), WORKSPACE_FILES[fileKey]);
}

function normalizeWorkspaceRecord(metadata, counts = {}) {
  return {
    id: metadata.id,
    name: metadata.name,
    version: metadata.version ?? 1,
    createdAt: metadata.createdAt ?? null,
    updatedAt: metadata.updatedAt ?? null,
    counts: {
      targets: counts.targets ?? 0,
      profiles: counts.profiles ?? 0,
      scenarios: counts.scenarios ?? 0,
      rules: counts.rules ?? 0,
    },
  };
}

export function getWorkspacesRoot(userDataPath) {
  return path.join(userDataPath, 'workspaces');
}

export async function ensureWorkspaceRoot(userDataPath) {
  const rootDir = getWorkspacesRoot(userDataPath);
  await ensureDir(rootDir);
  return rootDir;
}

export async function writeWorkspaceFiles(rootDir, payload) {
  const workspaceId = payload.metadata.id;
  const dir = workspaceDir(rootDir, workspaceId);
  const metadata = {
    ...payload.metadata,
    updatedAt: new Date().toISOString(),
  };

  await ensureDir(dir);
  await writeJson(workspaceFilePath(rootDir, workspaceId, 'metadata'), metadata);
  await writeJson(workspaceFilePath(rootDir, workspaceId, 'targets'), payload.targets);
  await writeJson(workspaceFilePath(rootDir, workspaceId, 'profiles'), payload.profiles);
  await writeJson(workspaceFilePath(rootDir, workspaceId, 'scenarios'), payload.scenarios);

  return normalizeWorkspaceRecord(metadata, {
    targets: payload.targets.length,
    profiles: payload.profiles.length,
    scenarios: payload.scenarios.length,
    rules: payload.scenarios.reduce((count, scenario) => count + (scenario.rules?.length ?? 0), 0),
  });
}

export async function ensureDefaultWorkspace(userDataPath) {
  const rootDir = await ensureWorkspaceRoot(userDataPath);
  const defaultId = 'default-workspace';
  const defaultMetadataPath = workspaceFilePath(rootDir, defaultId, 'metadata');

  if (await pathExists(defaultMetadataPath)) {
    const metadata = await readJson(defaultMetadataPath);
    if ((metadata?.version ?? 0) >= 2) {
      return rootDir;
    }
    const upgradedPayload = createDefaultWorkspacePayload({
      id: defaultId,
      name: metadata?.name || 'Default Workspace',
    });
    if (metadata?.createdAt) {
      upgradedPayload.metadata.createdAt = metadata.createdAt;
    }
    await writeWorkspaceFiles(rootDir, upgradedPayload);
    return rootDir;
  }

  const payload = createDefaultWorkspacePayload({
    id: defaultId,
    name: 'Default Workspace',
  });
  await writeWorkspaceFiles(rootDir, payload);
  return rootDir;
}

export async function listWorkspaces(userDataPath) {
  const rootDir = await ensureDefaultWorkspace(userDataPath);
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const workspaces = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workspaceId = entry.name;
    const metadata = await readJson(workspaceFilePath(rootDir, workspaceId, 'metadata'));
    const targets = await readJson(workspaceFilePath(rootDir, workspaceId, 'targets'), []);
    const profiles = await readJson(workspaceFilePath(rootDir, workspaceId, 'profiles'), []);
    const scenarios = await readJson(workspaceFilePath(rootDir, workspaceId, 'scenarios'), []);

    if (!metadata) continue;

    workspaces.push(
      normalizeWorkspaceRecord(metadata, {
        targets: targets.length,
        profiles: profiles.length,
        scenarios: scenarios.length,
        rules: scenarios.reduce((count, scenario) => count + (scenario.rules?.length ?? 0), 0),
      }),
    );
  }

  return workspaces.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getWorkspace(userDataPath, workspaceId) {
  const rootDir = await ensureDefaultWorkspace(userDataPath);
  const metadata = await readJson(workspaceFilePath(rootDir, workspaceId, 'metadata'));

  if (!metadata) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const targets = await readJson(workspaceFilePath(rootDir, workspaceId, 'targets'), []);
  const profiles = await readJson(workspaceFilePath(rootDir, workspaceId, 'profiles'), []);
  const scenarios = await readJson(workspaceFilePath(rootDir, workspaceId, 'scenarios'), []);

  return {
    metadata: normalizeWorkspaceRecord(metadata, {
      targets: targets.length,
      profiles: profiles.length,
      scenarios: scenarios.length,
      rules: scenarios.reduce((count, scenario) => count + (scenario.rules?.length ?? 0), 0),
    }),
    targets,
    profiles,
    scenarios,
    filePaths: {
      root: workspaceDir(rootDir, workspaceId),
      metadata: workspaceFilePath(rootDir, workspaceId, 'metadata'),
      targets: workspaceFilePath(rootDir, workspaceId, 'targets'),
      profiles: workspaceFilePath(rootDir, workspaceId, 'profiles'),
      scenarios: workspaceFilePath(rootDir, workspaceId, 'scenarios'),
      logs: path.join(workspaceDir(rootDir, workspaceId), 'logs'),
      screenshots: path.join(workspaceDir(rootDir, workspaceId), 'screenshots'),
    },
  };
}

export async function createWorkspace(userDataPath, input = {}) {
  const rootDir = await ensureDefaultWorkspace(userDataPath);
  const baseName = input.name?.trim() || 'New Workspace';
  const workspaceId = `${toSlug(baseName)}-${randomUUID().slice(0, 8)}`;
  const payload = createDefaultWorkspacePayload({
    id: workspaceId,
    name: baseName,
  });

  return writeWorkspaceFiles(rootDir, payload);
}

export async function saveWorkspace(userDataPath, workspaceId, nextState) {
  const rootDir = await ensureDefaultWorkspace(userDataPath);
  const current = await getWorkspace(userDataPath, workspaceId);
  const payload = {
    metadata: {
      ...current.metadata,
      ...nextState.metadata,
      id: workspaceId,
      name: nextState.metadata?.name?.trim() || current.metadata.name,
      createdAt: current.metadata.createdAt,
    },
    targets: Array.isArray(nextState.targets) ? nextState.targets : current.targets,
    profiles: Array.isArray(nextState.profiles) ? nextState.profiles : current.profiles,
    scenarios: Array.isArray(nextState.scenarios) ? nextState.scenarios : current.scenarios,
  };

  return writeWorkspaceFiles(rootDir, payload);
}

export async function deleteWorkspace(userDataPath, workspaceId) {
  if (workspaceId === 'default-workspace') {
    throw new Error('Default workspace cannot be deleted.');
  }

  const rootDir = await ensureDefaultWorkspace(userDataPath);
  const dir = workspaceDir(rootDir, workspaceId);

  if (!(await pathExists(dir))) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  await fs.rm(dir, { recursive: true, force: true });
}

export { WORKSPACE_FILES };
