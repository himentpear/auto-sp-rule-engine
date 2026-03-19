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

function safeSlug(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

async function readJsonFile(path, loadErrors) {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    loadErrors.push({ path: path.replace(`${repoRoot}\\`, '').replace(/\\/g, '/'), message: error.message });
    return null;
  }
}

async function readTextFile(path, loadErrors) {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (error) {
    loadErrors.push({ path: path.replace(`${repoRoot}\\`, '').replace(/\\/g, '/'), message: error.message });
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
      if (parsed) {
        items.push({
          ...parsed,
          sourceFile: fullPath.replace(`${repoRoot}\\`, '').replace(/\\/g, '/'),
          sourceName: entry.name,
        });
      }
    }
    return items;
  } catch (error) {
    loadErrors.push({ path: dir.replace(`${repoRoot}\\`, '').replace(/\\/g, '/'), message: error.message });
    return [];
  }
}

async function readDirFiles(dir, loadErrors, extension) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => ({
        name: entry.name,
        sourceFile: join(dir, entry.name).replace(`${repoRoot}\\`, '').replace(/\\/g, '/'),
      }));
  } catch (error) {
    loadErrors.push({ path: dir.replace(`${repoRoot}\\`, '').replace(/\\/g, '/'), message: error.message });
    return [];
  }
}

function parseMarkdownBullets(markdown, header) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const section = markdown.match(regex)?.[0] ?? '';
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
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

function deriveScenarioTargets(scenario) {
  const names = new Set();
  if (scenario.target?.window_title) names.add(scenario.target.window_title);
  Object.values(scenario.targets || {}).forEach((entry) => {
    const title = entry?.target?.window_title || entry?.window_title;
    if (title) names.add(title);
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

function deriveScenarioRuleDetails(scenario) {
  const defaultTarget = scenario.target?.window_title || 'default';
  const defaultProfile = scenario.ocr_profile || (scenario.ocr ? 'inline-default' : 'default');
  return (scenario.rules || []).map((rule) => ({
    name: rule.name,
    actionType: rule.action?.type ?? 'unknown',
    matchSummary: JSON.stringify(rule.match || {}),
    resolvedTarget:
      typeof rule.target === 'string'
        ? scenario.targets?.[rule.target]?.target?.window_title || rule.target
        : rule.target?.target?.window_title || defaultTarget,
    resolvedProfile: rule.ocr_profile || defaultProfile,
  }));
}

function deriveRulesFromConfigs(configs, scenarios) {
  const sources = [...configs, ...scenarios];
  return sources.flatMap((config) =>
    (config.rules || []).map((rule) => ({
      name: rule.name,
      match: rule.match,
      actionType: rule.action?.type ?? 'unknown',
      targetRef: typeof rule.target === 'string' ? rule.target : rule.target?.target?.window_title || 'default',
      ocrProfileRef: rule.ocr_profile || config.ocr_profile || (config.ocr ? 'inline-default' : null),
      sourceFile: config.sourceFile,
    }))
  );
}

function buildRuleScenarioMap(scenarios) {
  const map = new Map();
  scenarios.forEach((scenario) => {
    (scenario.rules || []).forEach((rule) => {
      const existing = map.get(rule.name) || [];
      existing.push(scenario.name || safeSlug(scenario.sourceName.replace('.json', '')));
      map.set(rule.name, existing);
    });
  });
  return map;
}

function deriveRecentRuns(logs, textEvidenceFiles, ruleScenarioMap) {
  return logs
    .filter((log) => typeof log.timestamp === 'string')
    .map((log) => {
      const id = log.sourceName.replace('.json', '');
      const runPrefix = id.split('-')[0];
      const ruleName = log.matched_rule || log.rule_runs?.find((run) => run.matched_rule)?.matched_rule || null;
      return {
        id,
        timestamp: log.timestamp,
        status:
          log.dry_run ? 'dry-run' : log.validation_result?.action_applied ? 'matched' : log.ocr_skipped_no_change ? 'skipped' : 'observed',
        targetWindow: log.target_window || log.rule_runs?.[0]?.resolved_target?.window_title || null,
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
    .slice(0, 8);
}

function deriveValidatedActionTypes(logs) {
  return [...new Set(logs.map((log) => log.action_type).filter(Boolean))].sort();
}

export async function buildDashboardData() {
  const loadErrors = [];
  const targets = await readDirJson(join(repoRoot, 'examples', 'targets'), loadErrors);
  const ocrProfiles = await readDirJson(join(repoRoot, 'examples', 'profiles'), loadErrors);
  const scenarios = await readDirJson(join(repoRoot, 'examples', 'scenarios'), loadErrors);
  const logs = await readDirJson(join(repoRoot, 'examples', 'logs'), loadErrors);
  const logTextFiles = await readDirFiles(join(repoRoot, 'examples', 'logs'), loadErrors, '.txt');
  const configs = await readDirJson(join(repoRoot, 'config'), loadErrors);
  const releaseReadiness = await readTextFile(join(repoRoot, 'notes', 'release-readiness-v0.1.0.md'), loadErrors);
  const overviewDoc = await readTextFile(join(repoRoot, 'docs', 'overview.md'), loadErrors);

  const derivedRules = deriveRulesFromConfigs(configs, scenarios);
  const ruleScenarioMap = buildRuleScenarioMap(scenarios);
  const derivedRuns = deriveRecentRuns(logs, logTextFiles, ruleScenarioMap);

  const rulesWithScenarios = derivedRules.map((rule) => ({
    ...rule,
    scenarioNames: ruleScenarioMap.get(rule.name) || [],
  }));

  return {
    targets: targets.map((target) => ({ ...target, name: target.name || safeSlug(target.sourceName.replace('.json', '')) })),
    ocrProfiles: ocrProfiles.map((profile) => ({ ...profile, name: profile.name || safeSlug(profile.sourceName.replace('.json', '')) })),
    rules: rulesWithScenarios,
    scenarios: scenarios.map((scenario) => ({
      name: safeSlug(scenario.sourceName.replace('.json', '')),
      description: scenario.description || null,
      sourceFile: scenario.sourceFile,
      ruleCount: (scenario.rules || []).length,
      targetNames: deriveScenarioTargets(scenario),
      profileNames: deriveScenarioProfiles(scenario),
      rules: deriveScenarioRuleDetails(scenario),
    })),
    recentRuns: derivedRuns,
    validatedActionTypes: deriveValidatedActionTypes(logs),
    repoHealth: {
      targetsCount: targets.length,
      profilesCount: ocrProfiles.length,
      rulesCount: rulesWithScenarios.length,
      scenariosCount: scenarios.length,
      recentRunsCount: derivedRuns.length,
      loadErrorsCount: loadErrors.length,
    },
    boundarySummary: {
      overviewExcerpt: parseMarkdownParagraph(overviewDoc, 'Validated Boundary'),
      validatedBoundary: parseMarkdownBullets(releaseReadiness, 'What Is Validated'),
      outOfScope: parseMarkdownBullets(releaseReadiness, 'What Is Intentionally Out of Scope'),
      source: 'notes/release-readiness-v0.1.0.md + docs/overview.md',
    },
    loadErrors,
  };
}

export async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/dashboard', async (_req, res) => {
    try {
      const data = await buildDashboardData();
      res.json(data);
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

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  createApp();
}
