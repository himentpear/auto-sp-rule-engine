const SAFE_ACTION_TYPES = new Set([
  'append_text',
  'prepend_text',
  'replace_text',
  'write_if_missing',
  'append_timestamped_note',
]);

const SAFE_MATCH_TYPES = new Set(['contains', 'contains_any', 'contains_all', 'not_contains', 'regex']);

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

export function sanitizeRulePayload(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule payload must be an object.');
  }

  const name = assertString(rule.name, 'rule.name');
  const targetRef = assertString(rule.targetRef || rule.target, 'rule.targetRef');
  const ocrProfileRef = assertString(rule.ocrProfileRef || rule.ocr_profile, 'rule.ocrProfileRef');
  const action = sanitizeAction(rule.action);
  const match = sanitizeMatch(rule.match || rule.condition);
  const targetOverride = sanitizeTargetOverride(rule.targetOverride);

  return {
    name,
    targetRef,
    ocrProfileRef,
    match,
    action,
    targetOverride,
    dryRun: Boolean(rule.dryRun || rule.logOnly),
  };
}

export function sanitizeAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('rule.action must be an object.');
  }
  const type = assertString(action.type, 'rule.action.type');
  if (!SAFE_ACTION_TYPES.has(type)) {
    throw new Error(`Unsupported action type: ${type}`);
  }
  return {
    type,
    text: typeof action.text === 'string' ? action.text : '',
  };
}

export function sanitizeMatch(match) {
  if (!match || typeof match !== 'object') {
    throw new Error('rule.match must be an object.');
  }
  const type = assertString(match.type, 'rule.match.type');
  if (!SAFE_MATCH_TYPES.has(type)) {
    throw new Error(`Unsupported match type: ${type}`);
  }
  if (type === 'contains' || type === 'not_contains') {
    return { type, value: assertString(match.value, 'rule.match.value') };
  }
  if (type === 'regex') {
    return { type, pattern: assertString(match.pattern, 'rule.match.pattern') };
  }
  const values = Array.isArray(match.values) ? match.values.filter((value) => typeof value === 'string' && value.trim()) : [];
  if (!values.length) {
    throw new Error(`rule.match.values must contain at least one non-empty string for ${type}`);
  }
  return { type, values };
}

export function sanitizeTargetOverride(override) {
  if (!override) return {};
  if (typeof override !== 'object') {
    throw new Error('rule.targetOverride must be an object.');
  }
  const allowedKeys = ['window_title', 'window_title_substring', 'process_name'];
  const sanitized = {};
  for (const key of allowedKeys) {
    if (typeof override[key] === 'string' && override[key].trim()) {
      sanitized[key] = override[key].trim();
    }
  }
  return sanitized;
}

export function sanitizeMonitorOptions(options, workspace) {
  if (!options || typeof options !== 'object') {
    throw new Error('Monitor options must be an object.');
  }
  const scenarioId = assertString(options.scenarioId || workspace.scenarios[0]?.id, 'monitor.scenarioId');
  const titleRegex = typeof options.titleRegex === 'string' && options.titleRegex.trim() ? options.titleRegex.trim() : '.*';
  const intervalSeconds = Math.max(3, Math.min(8, Number(options.intervalSeconds) || 5));
  const historyScanEnabled = Boolean(options.historyScanEnabled);
  return { scenarioId, titleRegex, intervalSeconds, historyScanEnabled };
}

export { SAFE_ACTION_TYPES, SAFE_MATCH_TYPES };
