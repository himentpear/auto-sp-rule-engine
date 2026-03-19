import express from 'express';
import { createServer as createViteServer } from 'vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const frontendRoot = join(repoRoot, 'frontend');
const port = 4173;

function repoPath(fullPath) {
  return fullPath.replace(`${repoRoot}\\`, '').replace(/\\/g, '/');
}

function safeSlug(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

async function pathExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(path, loadErrors) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch (error) {
    loadErrors.push({ path: repoPath(path), message: error.message });
    return null;
  }
}

async function readTextFile(path, loadErrors) {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (error) {
    loadErrors.push({ path: repoPath(path), message: error.message });
    return '';
  }
}

async function readDirJson(dir, loadErrors) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items = [];
    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
      const fullPath = join(dir, entry.name);
      const parsed = await readJsonFile(fullPath, loadErrors);
      if (parsed) items.push({ ...parsed, sourceFile: repoPath(fullPath), sourceName: entry.name });
    }
    return items;
  } catch (error) {
    loadErrors.push({ path: repoPath(dir), message: error.message });
    return [];
  }
}

async function readDirFiles(dir, loadErrors, extensions) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension)))
      .map((entry) => ({ name: entry.name, sourceFile: repoPath(join(dir, entry.name)) }));
  } catch (error) {
    loadErrors.push({ path: repoPath(dir), message: error.message });
    return [];
  }
}

function parseMarkdownBullets(markdown, header) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const section = markdown.match(regex)?.[0] ?? '';
  return section.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim());
}

function parseMarkdownParagraph(markdown, header) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const section = markdown.match(regex)?.[0] ?? '';
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('## ') && !line.startsWith('- ') && !line.startsWith('```'))
    .slice(0, 2)
    .join(' ');
}

function resolveTargetName(windowTitle, targets) {
  return targets.find((target) => target.target?.window_title === windowTitle)?.name || windowTitle || 'default';
}

function deriveScenarioTargets(scenario, targets) {
  const names = new Set();
  if (scenario.target?.window_title) names.add(resolveTargetName(scenario.target.window_title, targets));
  Object.values(scenario.targets || {}).forEach((entry) => {
    names.add(resolveTargetName(entry?.target?.window_title || entry?.window_title, targets));
  });
  return [...names];
}

function deriveScenarioProfiles(scenario) {
  const names = new Set();
  if (scenario.ocr_profile) names.add(scenario.ocr_profile);
  Object.keys(scenario.ocr_profiles || {}).forEach((name) => names.add(name));
  (scenario.rules || []).forEach((rule) => {
    if (rule.ocr_profile) names.add(rule.ocr_profile);
  });
  return [...names];
}

function deriveScenarioRuleDetails(scenario, targets) {
  const defaultTarget = resolveTargetName(scenario.target?.window_title, targets);
  const defaultProfile = scenario.ocr_profile || (scenario.ocr ? 'inline-default' : 'default');
  return (scenario.rules || []).map((rule) => ({
    name: rule.name,
    actionType: rule.action?.type ?? 'unknown',
    resolvedTarget:
      typeof rule.target === 'string'
        ? resolveTargetName(scenario.targets?.[rule.target]?.target?.window_title, targets) || rule.target
        : resolveTargetName(rule.target?.target?.window_title, targets) || defaultTarget,
    resolvedProfile: rule.ocr_profile || defaultProfile,
  }));
}

function buildRuleScenarioMap(scenarios) {
  const map = new Map();
  scenarios.forEach((scenario) => {
    (scenario.rules || []).forEach((rule) => {
      const existing = map.get(rule.name) || [];
      existing.push(scenario.name);
      map.set(rule.name, existing);
    });
  });
  return map;
}

function deriveRulesFromConfigs(configs, scenarios, targets) {
  const configRules = configs.flatMap((config) =>
    (config.rules || []).map((rule) => ({
      name: rule.name,
      match: rule.match,
      actionType: rule.action?.type ?? 'unknown',
      targetRef: typeof rule.target === 'string' ? rule.target : resolveTargetName(rule.target?.target?.window_title, targets),
      resolvedTargetName: typeof rule.target === 'string' ? rule.target : resolveTargetName(rule.target?.target?.window_title, targets),
      ocrProfileRef: rule.ocr_profile || config.ocr_profile || (config.ocr ? 'inline-default' : null),
      sourceFile: config.sourceFile,
      scenarioNames: [],
    }))
  );

  const scenarioRules = scenarios.flatMap((scenario) =>
    (scenario.rules || []).map((rule) => ({
      name: rule.name,
      match: rule.match,
      actionType: rule.action?.type ?? 'unknown',
      targetRef: typeof rule.target === 'string' ? rule.target : resolveTargetName(rule.target?.target?.window_title, targets),
      resolvedTargetName:
        typeof rule.target === 'string'
          ? resolveTargetName(scenario.targets?.[rule.target]?.target?.window_title, targets)
          : resolveTargetName(rule.target?.target?.window_title || scenario.target?.window_title, targets),
      ocrProfileRef: rule.ocr_profile || scenario.ocr_profile || (scenario.ocr ? 'inline-default' : null),
      sourceFile: scenario.sourceFile,
      scenarioNames: [scenario.name],
    }))
  );

  return [...configRules, ...scenarioRules];
}

function deriveRecentRuns(logs, textEvidenceFiles, ruleScenarioMap, targets) {
  return logs
    .filter((log) => typeof log.timestamp === 'string')
    .map((log) => {
      const id = log.sourceName.replace('.json', '');
      const runPrefix = id.split('-')[0];
      const ruleName = log.matched_rule || log.rule_runs?.find((run) => run.matched_rule)?.matched_rule || null;
      const targetWindow = log.target_window || log.rule_runs?.[0]?.resolved_target?.window_title || null;
      return {
        id,
        timestamp: log.timestamp,
        status: log.dry_run ? 'dry-run' : log.validation_result?.action_applied ? 'matched' : log.ocr_skipped_no_change ? 'skipped' : 'observed',
        targetWindow,
        targetName: resolveTargetName(targetWindow, targets),
        ocrProfileUsed: log.ocr_profile_used || log.rule_runs?.[0]?.ocr_profile_used || null,
        ruleName,
        scenarioNames: ruleName ? ruleScenarioMap.get(ruleName) || [] : [],
        actionType: log.action_type || log.rule_runs?.find((run) => run.action_type)?.action_type || null,
        screenshotPath: log.screenshot_path || null,
        rawOcrOutput: log.raw_ocr_output || null,
        normalizedOcrOutput: log.normalized_ocr_output || log.ocr_text || null,
        validationResult: log.validation_result || null,
        sourceFile: log.sourceFile,
        relatedEvidence: textEvidenceFiles.filter((file) => file.name.startsWith(runPrefix)),
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12);
}

function deriveEvidenceItems(runs) {
  return runs.flatMap((run) => {
    const base = {
      runId: run.id,
      runStatus: run.status,
      ruleName: run.ruleName,
      scenarioNames: run.scenarioNames || [],
    };
    return [
      run.sourceFile ? { ...base, label: `Run log ${run.id}`, path: run.sourceFile, type: 'log' } : null,
      run.screenshotPath ? { ...base, label: `Screenshot ${run.id}`, path: run.screenshotPath, type: 'screenshot' } : null,
      ...(run.relatedEvidence || []).map((item) => ({ ...base, label: item.name, path: item.sourceFile, type: 'readback' })),
    ].filter(Boolean);
  });
}

async function deriveRepoHealth({ docsFiles, notesFiles, targets, profiles, scenarios, logs, textEvidenceFiles, screenshots, derivedRuns, evidenceItems, loadErrors }) {
  const buildTargets = [join(repoRoot, 'frontend', 'dist', 'index.html')];
  const existingBuild = [];
  for (const target of buildTargets) {
    if (await pathExists(target)) existingBuild.push(repoPath(target));
  }
  return {
    docsCount: docsFiles.length,
    notesCount: notesFiles.length,
    exampleConfigsCount: targets.length + profiles.length + scenarios.length,
    evidenceLogsCount: logs.length + textEvidenceFiles.length,
    screenshotCount: screenshots.length,
    evidenceItemsCount: evidenceItems.length,
    targetsCount: targets.length,
    profilesCount: profiles.length,
    scenariosCount: scenarios.length,
    runsCount: derivedRuns.length,
    latestEvidenceTimestamp: derivedRuns[0]?.timestamp || null,
    loadErrorsCount: loadErrors.length,
    frontendBuildStatus: existingBuild.length ? 'present' : 'missing',
    frontendBuildHint: existingBuild.length ? existingBuild.join(' | ') : 'No built frontend artifact detected yet.',
  };
}

export async function buildDashboardData() {
  const loadErrors = [];
  const targetsRaw = await readDirJson(join(repoRoot, 'examples', 'targets'), loadErrors);
  const targets = targetsRaw.map((target) => ({ ...target, name: target.name || safeSlug(target.sourceName.replace('.json', '')) }));
  const ocrProfiles = (await readDirJson(join(repoRoot, 'examples', 'profiles'), loadErrors)).map((profile) => ({ ...profile, name: profile.name || safeSlug(profile.sourceName.replace('.json', '')) }));
  const scenarioRaw = (await readDirJson(join(repoRoot, 'examples', 'scenarios'), loadErrors)).map((scenario) => ({
    ...scenario,
    name: safeSlug(scenario.sourceName.replace('.json', '')),
  }));
  const configs = await readDirJson(join(repoRoot, 'config'), loadErrors);
  const logs = await readDirJson(join(repoRoot, 'examples', 'logs'), loadErrors);
  const textEvidenceFiles = await readDirFiles(join(repoRoot, 'examples', 'logs'), loadErrors, ['.txt']);
  const docsFiles = await readDirFiles(join(repoRoot, 'docs'), loadErrors, ['.md']);
  const notesFiles = await readDirFiles(join(repoRoot, 'notes'), loadErrors, ['.md']);
  const screenshots = await readDirFiles(join(repoRoot, 'screenshots', 'examples'), loadErrors, ['.png']);
  const releaseReadiness = await readTextFile(join(repoRoot, 'notes', 'release-readiness-v0.1.0.md'), loadErrors);
  const overviewDoc = await readTextFile(join(repoRoot, 'docs', 'overview.md'), loadErrors);

  const scenarios = scenarioRaw.map((scenario) => ({
    name: scenario.name,
    description: scenario.description || null,
    sourceFile: scenario.sourceFile,
    ruleCount: (scenario.rules || []).length,
    targetNames: deriveScenarioTargets(scenario, targets),
    profileNames: deriveScenarioProfiles(scenario),
    rules: deriveScenarioRuleDetails(scenario, targets),
  }));

  const rules = deriveRulesFromConfigs(configs, scenarioRaw, targets);
  const ruleScenarioMap = buildRuleScenarioMap(scenarios);
  const recentRuns = deriveRecentRuns(logs, textEvidenceFiles, ruleScenarioMap, targets);
  const evidenceItems = deriveEvidenceItems(recentRuns);
  const repoHealth = await deriveRepoHealth({ docsFiles, notesFiles, targets, profiles: ocrProfiles, scenarios, logs, textEvidenceFiles, screenshots, derivedRuns: recentRuns, evidenceItems, loadErrors });

  return {
    targets,
    ocrProfiles,
    rules: rules.map((rule) => ({ ...rule, scenarioNames: rule.scenarioNames?.length ? rule.scenarioNames : ruleScenarioMap.get(rule.name) || [] })),
    scenarios,
    recentRuns,
    evidenceItems,
    validatedActionTypes: [...new Set(logs.map((log) => log.action_type).filter(Boolean))].sort(),
    repoHealth,
    boundarySummary: {
      overviewExcerpt: parseMarkdownParagraph(overviewDoc, 'Validated Boundary'),
      validatedBoundary: parseMarkdownBullets(releaseReadiness, 'What Is Validated'),
      outOfScope: parseMarkdownBullets(releaseReadiness, 'What Is Intentionally Out of Scope'),
      source: 'notes/release-readiness-v0.1.0.md + docs/overview.md',
    },
    releaseCandidate: {
      label: '2.0 Release Candidate',
      packageVersion: '2.0.0-rc.1',
      summary: 'Cleaner repository structure, polished read-only frontend, consolidated evidence paths, and safer validation tooling without widening the execution boundary.',
      source: 'notes/v2-release-readiness.md',
    },
    entrypoints: [
      { label: 'Start here', description: 'Top-level landing and navigation path.', path: 'README.md' },
      { label: 'Repo map', description: 'Structure, terminology, and entrypoints.', path: 'docs/repo-map.md' },
      { label: 'Morning workflow', description: 'Tomorrow-morning read-only checking flow.', path: 'docs/morning-workflow.md' },
      { label: 'Evidence index', description: 'Generated evidence list and cross references.', path: 'docs/evidence-index.md' },
      { label: '2.0 summary', description: 'Release-candidate summary for the current repository state.', path: 'notes/v2-upgrade-summary.md' },
    ],
    morningWorkflow: [
      { label: '1. Re-open the map', description: 'Use the repo map to re-enter the project quickly.', path: 'docs/repo-map.md' },
      { label: '2. Read the release summary', description: 'Use the 2.0 RC summary as the latest handoff note.', path: 'notes/v2-upgrade-summary.md' },
      { label: '3. Check repo health', description: 'Confirm docs, evidence, build, and load signals are still coherent.', path: 'scripts/dev/repo_health.ps1' },
      { label: '4. Review evidence', description: 'Inspect evidence index and evidence hub together.', path: 'docs/evidence-index.md' },
      { label: '5. Run full safe validation', description: 'Use the single release-candidate validation command when needed.', path: 'package.json' },
    ],
    loadErrors,
  };
}

export async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/dashboard', async (_req, res) => {
    try {
      res.json(await buildDashboardData());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      configFile: join(repoRoot, 'vite.config.js'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(join(frontendRoot, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(join(frontendRoot, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  createApp();
}
