import fs from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDashboardData } from '../../frontend/server.mjs';

const ALLOWED_ACTION_TYPES = [
  'append_text',
  'prepend_text',
  'replace_text',
  'write_if_missing',
  'append_timestamped_note',
];

const ALLOWED_MATCH_TYPES = ['contains', 'contains_any', 'contains_all', 'not_contains', 'regex'];
const SCHEMA_VERSION = 'designer-draft/v1';
const SAFE_BOUNDARY = 'capture -> OCR -> rule match -> control-targeted write';

function profileSummary(profile) {
  if (!profile) return null;
  return {
    roi: profile.roi || null,
    scale: profile.preprocessing?.scale ?? 1.0,
    threshold: profile.preprocessing?.threshold?.enabled ? profile.preprocessing.threshold.value : null,
    confirm_frames: profile.watch?.consecutive_match_count ?? 1,
  };
}

function targetSummary(target) {
  return {
    name: target?.name || null,
    window_title: target?.target?.window_title || target?.target_bundle?.window_matcher?.window_title || null,
    process_name: target?.target?.process_name || target?.target_bundle?.window_matcher?.process_name || null,
    focus_strategy: target?.target_bundle?.focus_strategy?.type || null,
    readback_strategy: target?.target_bundle?.readback_strategy?.type || null,
    default_ocr_profile: target?.target_bundle?.default_ocr_profile || null,
  };
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function validateTargetBundle(bundle, errors, prefix = 'target_bundle') {
  if (!isObject(bundle)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!isObject(bundle.window_matcher)) errors.push(`${prefix}.window_matcher is required`);
  if (!isObject(bundle.focus_strategy)) errors.push(`${prefix}.focus_strategy is required`);
  if (!isObject(bundle.control_strategy)) errors.push(`${prefix}.control_strategy is required`);
  if (!isObject(bundle.readback_strategy)) errors.push(`${prefix}.readback_strategy is required`);
  if (!bundle.window_matcher?.window_title) errors.push(`${prefix}.window_matcher.window_title is required`);
  if (!bundle.window_matcher?.process_name) errors.push(`${prefix}.window_matcher.process_name is required`);
  if (!bundle.control_strategy?.control_name) errors.push(`${prefix}.control_strategy.control_name is required`);
}

function validateOcrProfile(profile, errors, prefix = 'resolved_ocr_profile') {
  if (!isObject(profile)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!isObject(profile.preprocessing)) errors.push(`${prefix}.preprocessing is required`);
  if (!isObject(profile.normalization)) errors.push(`${prefix}.normalization is required`);
  if (!isObject(profile.watch)) errors.push(`${prefix}.watch is required`);
}

function validateRuleDraft(rule, errors, warnings) {
  if (!isObject(rule)) {
    errors.push('rule_draft must be an object');
    return;
  }
  if (!rule.name) errors.push('rule_draft.name is required');
  if (!rule.target) errors.push('rule_draft.target is required');
  if (!rule.ocr_profile) errors.push('rule_draft.ocr_profile is required');
  if (!isObject(rule.match)) errors.push('rule_draft.match is required');
  if (!isObject(rule.action)) errors.push('rule_draft.action is required');

  const matchType = rule.match?.type;
  if (!ALLOWED_MATCH_TYPES.includes(matchType)) {
    errors.push(`rule_draft.match.type must be one of: ${ALLOWED_MATCH_TYPES.join(', ')}`);
  }
  if (matchType === 'contains' || matchType === 'not_contains') {
    if (!rule.match?.value) errors.push(`rule_draft.match.value is required for ${matchType}`);
  }
  if (matchType === 'regex') {
    if (!rule.match?.pattern) errors.push('rule_draft.match.pattern is required for regex');
  }
  if (matchType === 'contains_any' || matchType === 'contains_all') {
    if (!Array.isArray(rule.match?.values) || rule.match.values.length < 1) {
      errors.push(`rule_draft.match.values must contain at least one entry for ${matchType}`);
    }
  }

  const actionType = rule.action?.type;
  if (!ALLOWED_ACTION_TYPES.includes(actionType)) {
    errors.push(`rule_draft.action.type must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}`);
  }
  if (!rule.action?.text) {
    warnings.push('rule_draft.action.text is empty');
  }
}

export async function loadDraft(filePath) {
  const resolved = resolve(filePath);
  const raw = await fs.readFile(resolved, 'utf8');
  return {
    path: resolved,
    raw,
    parsed: JSON.parse(raw),
  };
}

export async function validateDraftDocument(documentPath) {
  const repoData = await buildDashboardData();
  const draft = await loadDraft(documentPath);
  const payload = draft.parsed;
  const errors = [];
  const warnings = [];

  if (payload.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }
  if (payload.safe_boundary !== SAFE_BOUNDARY) {
    errors.push(`safe_boundary must be ${SAFE_BOUNDARY}`);
  }
  if (payload.draft_only !== true) errors.push('draft_only must be true');
  if (payload.export_only !== true) errors.push('export_only must be true');
  if (payload.non_executing !== true) errors.push('non_executing must be true');
  if (!payload.exported_at) errors.push('exported_at is required');
  if (!payload.generated_from) errors.push('generated_from is required');
  if (!payload.target_bundle_ref) errors.push('target_bundle_ref is required');
  if (!payload.selected_ocr_profile_ref) errors.push('selected_ocr_profile_ref is required');

  const repoTarget = repoData.targets.find((target) => target.name === payload.target_bundle_ref);
  const repoProfile = repoData.ocrProfiles.find((profile) => profile.name === payload.selected_ocr_profile_ref);

  if (!repoTarget) {
    errors.push(`target_bundle_ref does not resolve to an existing target: ${payload.target_bundle_ref}`);
  }
  if (!repoProfile) {
    errors.push(`selected_ocr_profile_ref does not resolve to an existing OCR profile: ${payload.selected_ocr_profile_ref}`);
  }

  validateTargetBundle(payload.target_bundle, errors);
  validateOcrProfile(payload.resolved_ocr_profile, errors);
  validateRuleDraft(payload.rule_draft, errors, warnings);

  if (payload.rule_draft?.target && payload.rule_draft.target !== payload.target_bundle_ref) {
    warnings.push('rule_draft.target does not match target_bundle_ref');
  }
  if (payload.rule_draft?.ocr_profile && payload.rule_draft.ocr_profile !== payload.selected_ocr_profile_ref) {
    warnings.push('rule_draft.ocr_profile does not match selected_ocr_profile_ref');
  }

  const normalizedPreview = {
    description: `Designer draft preview from ${basename(draft.path)}`,
    target_bundle: payload.target_bundle,
    target: payload.target,
    control: payload.control,
    automation: {
      ahk_exe: 'vendor/autohotkey/2.0.19/AutoHotkey64.exe',
    },
    ocr_profile: payload.selected_ocr_profile_ref,
    ocr_profiles: {
      [payload.selected_ocr_profile_ref || 'draft_profile']: payload.resolved_ocr_profile,
    },
    engine: {
      stop_after_first_match: true,
      recent_rule_hit_cooldown_seconds: 0,
      log_prefix: 'designer-draft-preview',
    },
    rules: payload.rule_draft ? [payload.rule_draft] : [],
    designer_metadata: {
      schema_version: payload.schema_version,
      exported_at: payload.exported_at,
      generated_from: payload.generated_from,
      source_target_bundle_ref: payload.target_bundle_ref,
      source_ocr_profile_ref: payload.selected_ocr_profile_ref,
      safe_boundary: payload.safe_boundary,
      draft_only: true,
      export_only: true,
      non_executing: true,
    },
  };

  const summary = {
    schema: {
      version: payload.schema_version || null,
      expected_version: SCHEMA_VERSION,
      generated_from: payload.generated_from || null,
      exported_at: payload.exported_at || null,
      safe_boundary: payload.safe_boundary || null,
    },
    target: targetSummary(repoTarget || payload),
    ocr_profile: {
      name: payload.selected_ocr_profile_ref || null,
      summary: profileSummary(payload.resolved_ocr_profile),
    },
    rule: {
      name: payload.rule_draft?.name || null,
      match_type: payload.rule_draft?.match?.type || null,
      action_type: payload.rule_draft?.action?.type || null,
    },
    counts: {
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
    normalizedPreview,
  };

  return {
    ok: errors.length === 0,
    draftPath: draft.path,
    summary,
  };
}

async function main() {
  const mode = process.argv[2];
  const filePath = process.argv[3];
  if (!mode || !filePath || !['check', 'preview'].includes(mode)) {
    console.error('Usage: node scripts/dev/designer_draft_tools.mjs <check|preview> <draft-json-path>');
    process.exit(64);
  }

  const result = await validateDraftDocument(filePath);
  if (mode === 'check') {
    const output = {
      ok: result.ok,
      draftPath: result.draftPath,
      schema: result.summary.schema,
      target: result.summary.target,
      ocr_profile: result.summary.ocr_profile,
      rule: result.summary.rule,
      counts: result.summary.counts,
      errors: result.summary.errors,
      warnings: result.summary.warnings,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    const output = {
      ok: result.ok,
      draftPath: result.draftPath,
      normalizedPreview: result.summary.normalizedPreview,
      errors: result.summary.errors,
      warnings: result.summary.warnings,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  if (!result.ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
