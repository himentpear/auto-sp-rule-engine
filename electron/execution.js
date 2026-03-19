import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getWorkspace, getWorkspacesRoot } from './workspaces.js';
import { getExternalRoot, getExternalScriptPath, getExternalVendorPath } from './runtimePaths.js';

function normalizeName(value, fallback) {
  return String(value || fallback || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}

function toProfileRecord(profile) {
  const { id, name, profile_key, ...rest } = profile;
  return {
    key: profile_key || normalizeName(id || name, 'default'),
    payload: rest,
  };
}

function resolveWorkspaceTarget(targets, targetRef) {
  const target = targets.find((item) => item.id === targetRef || item.name === targetRef);
  if (!target) {
    throw new Error(`Workspace target not found: ${targetRef}`);
  }
  return target;
}

function resolveWorkspaceProfile(profiles, profileRef) {
  const profile = profiles.find(
    (item) => item.id === profileRef || item.profile_key === profileRef || item.name === profileRef,
  );
  if (!profile) {
    throw new Error(`Workspace OCR profile not found: ${profileRef}`);
  }
  return profile;
}

function buildExecutionConfig(workspace, ruleInput) {
  const rule = {
    ...ruleInput,
    target: ruleInput.target || ruleInput.targetRef,
    ocr_profile: ruleInput.ocr_profile || ruleInput.ocrProfileRef,
  };
  const target = resolveWorkspaceTarget(workspace.targets, rule.target);
  const profile = resolveWorkspaceProfile(workspace.profiles, rule.ocr_profile);
  const profileRecords = workspace.profiles.map(toProfileRecord);
  const ocrProfiles = Object.fromEntries(profileRecords.map((item) => [item.key, item.payload]));
  const selectedProfile = toProfileRecord(profile);

  return {
    description: `Workspace execution for ${workspace.metadata.name}`,
    automation: {
      ahk_exe: getExternalVendorPath('autohotkey', '2.0.19', 'AutoHotkey64.exe'),
    },
    target_bundle: target.target_bundle,
    target: target.target_bundle?.window_matcher || target.target || {},
    control: {
      name: target.target_bundle?.control_strategy?.control_name || target.control?.name || '',
      type: target.target_bundle?.control_strategy?.control_type || target.control?.type || '',
    },
    ocr_profile: selectedProfile.key,
    ocr_profiles: ocrProfiles,
    engine: {
      stop_after_first_match: true,
      recent_rule_hit_cooldown_seconds: 0,
      log_prefix: `workspace-${workspace.metadata.id}`,
    },
    rules: [
      {
        name: rule.name,
        target: target.id,
        ocr_profile: selectedProfile.key,
        dry_run: Boolean(rule.dryRun),
        match: rule.match,
        action: rule.action,
        target_override: rule.targetOverride || {},
      },
    ],
    targets: {
      [target.id]: {
        target_bundle: target.target_bundle,
        target: target.target_bundle?.window_matcher || target.target || {},
        control: {
          name: target.target_bundle?.control_strategy?.control_name || target.control?.name || '',
          type: target.target_bundle?.control_strategy?.control_type || target.control?.type || '',
        },
      },
    },
  };
}

function runPythonConfig(configPath, logsDir, screenshotsDir, dryRun = false) {
  const externalRoot = getExternalRoot();
  const runRulesPath = getExternalScriptPath('run_rules.py');
  const candidates = [
    { command: path.join(externalRoot, '.venv', 'Scripts', 'python.exe'), args: [] },
    { command: 'python', args: [] },
    { command: 'py', args: ['-3'] },
  ];

  const attempt = (index) =>
    new Promise((resolve, reject) => {
      if (index >= candidates.length) {
        reject(new Error('No Python runtime found. Tried .venv\\Scripts\\python.exe, python, and py -3.'));
        return;
      }

      const candidate = candidates[index];
      const child = spawn(
        candidate.command,
        [
          ...candidate.args,
          runRulesPath,
          configPath,
          ...(dryRun ? ['--dry-run'] : []),
          '--logs-dir',
          logsDir,
          '--screenshots-dir',
          screenshotsDir,
        ],
        {
          cwd: externalRoot,
          windowsHide: true,
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', () => {
        resolve(attempt(index + 1));
      });
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || stdout || `Python execution failed with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Unable to parse execution output: ${error.message}`));
        }
      });
    });

  return attempt(0);
}

export async function executeWorkspaceRule(userDataPath, workspaceId, ruleInput) {
  const workspace = await getWorkspace(userDataPath, workspaceId);
  const executionConfig = buildExecutionConfig(workspace, ruleInput);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'auto-sp-rule-engine-'));
  const configPath = path.join(tempDir, 'workspace-execution.json');
  const workspaceRoot = path.join(getWorkspacesRoot(userDataPath), workspaceId);
  const logsDir = path.join(workspaceRoot, 'logs');
  const screenshotsDir = path.join(workspaceRoot, 'screenshots');

  await fs.writeFile(configPath, `${JSON.stringify(executionConfig, null, 2)}\n`, 'utf8');
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(screenshotsDir, { recursive: true });
  try {
    return await runPythonConfig(configPath, logsDir, screenshotsDir, Boolean(ruleInput.dryRun));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
