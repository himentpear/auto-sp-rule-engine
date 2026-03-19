import { buildDashboardData } from '../../frontend/server.mjs';

const data = await buildDashboardData();

function countSavedView(id) {
  if (id === 'overview') return data.rules.length + data.targets.length + data.ocrProfiles.length + data.scenarios.length + data.recentRuns.length;
  if (id === 'release-ready') return data.recentRuns.filter((run) => run.status === 'matched' && data.validatedActionTypes.includes(run.actionType)).length;
  if (id === 'recent-evidence') return data.evidenceItems.length;
  if (id === 'multi-target') return data.scenarios.filter((scenario) => scenario.targetNames.length > 1).length;
  if (id === 'ocr-profiles') return data.ocrProfiles.length;
  if (id === 'docs-linked') return data.rules.length + data.targets.length + data.ocrProfiles.length + data.scenarios.length + data.recentRuns.length;
  if (id === 'validated-safe-actions') return data.rules.filter((rule) => data.validatedActionTypes.includes(rule.actionType)).length;
  return 0;
}

const groupedEvidence = {
  scenario: new Set(data.evidenceItems.flatMap((item) => item.scenarioNames || ['No scenario'])).size,
  rule: new Set(data.evidenceItems.map((item) => item.ruleName || 'No rule')).size,
  runStatus: new Set(data.evidenceItems.map((item) => item.runStatus || 'unknown')).size,
  sourceFile: new Set(data.evidenceItems.map((item) => item.path)).size,
};

const savedViews = [
  'overview',
  'release-ready',
  'recent-evidence',
  'multi-target',
  'ocr-profiles',
  'docs-linked',
  'validated-safe-actions',
].map((id) => ({ id, count: countSavedView(id) }));

const failures = [];
if ((data.templates || []).length < 1) failures.push('template library resolved to zero templates');
for (const view of savedViews) {
  if (view.count < 1) failures.push(`saved view ${view.id} resolved to zero items`);
}
for (const [group, count] of Object.entries(groupedEvidence)) {
  if (count < 1) failures.push(`evidence grouping ${group} resolved to zero groups`);
}

const result = {
  ok: failures.length === 0,
  savedViews,
  groupedEvidence,
  templateCount: (data.templates || []).length,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length) process.exit(1);
