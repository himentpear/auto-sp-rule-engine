import React, { useEffect, useMemo, useState } from 'react';

const explorerTabs = [
  { id: 'rules', label: 'Rules' },
  { id: 'targets', label: 'Targets' },
  { id: 'profiles', label: 'OCR Profiles' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'runs', label: 'Runs' },
];

const defaultFilters = {
  objectType: 'all',
  target: 'all',
  profile: 'all',
  scenario: 'all',
  runStatus: 'all',
  sourceFile: 'all',
  actionType: 'all',
  linkage: 'all',
};

const defaultEvidenceFilters = {
  scenario: 'all',
  rule: 'all',
  runStatus: 'all',
  sourceFile: 'all',
  groupBy: 'scenario',
};

const savedViews = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Default repository guide across docs, explorer, evidence, and health.',
    activeTab: 'rules',
    filters: { ...defaultFilters },
    evidenceFilters: { ...defaultEvidenceFilters, groupBy: 'scenario' },
  },
  {
    id: 'release-ready',
    label: 'Release Ready',
    description: 'Validated actions, successful runs, and readiness-focused health signals.',
    activeTab: 'runs',
    filters: { ...defaultFilters, objectType: 'runs', runStatus: 'matched', linkage: 'validated-safe' },
    evidenceFilters: { ...defaultEvidenceFilters, runStatus: 'matched', groupBy: 'runStatus' },
  },
  {
    id: 'recent-evidence',
    label: 'Recent Evidence',
    description: 'Jump directly into the newest read-only evidence and related runs.',
    activeTab: 'runs',
    filters: { ...defaultFilters, objectType: 'runs' },
    evidenceFilters: { ...defaultEvidenceFilters, groupBy: 'sourceFile' },
  },
  {
    id: 'multi-target',
    label: 'Multi-target',
    description: 'Focus on the validated multi-target scenario and linked objects.',
    activeTab: 'scenarios',
    filters: { ...defaultFilters, objectType: 'scenarios', linkage: 'multi-target' },
    evidenceFilters: { ...defaultEvidenceFilters, scenario: 'single-config-multi-target', groupBy: 'rule' },
  },
  {
    id: 'ocr-profiles',
    label: 'OCR Profiles',
    description: 'Inspect OCR profile coverage, confirmation settings, and linked evidence.',
    activeTab: 'profiles',
    filters: { ...defaultFilters, objectType: 'profiles' },
    evidenceFilters: { ...defaultEvidenceFilters, groupBy: 'rule' },
  },
  {
    id: 'docs-linked',
    label: 'Docs-linked',
    description: 'Keep the explorer anchored to objects that already map back into docs and notes.',
    activeTab: 'rules',
    filters: { ...defaultFilters, linkage: 'docs-linked' },
    evidenceFilters: { ...defaultEvidenceFilters, groupBy: 'scenario' },
  },
  {
    id: 'validated-safe-actions',
    label: 'Validated Safe Actions',
    description: 'Limit the view to the action types already represented in validated evidence.',
    activeTab: 'rules',
    filters: { ...defaultFilters, linkage: 'validated-safe' },
    evidenceFilters: { ...defaultEvidenceFilters, groupBy: 'rule' },
  },
];

function readUrlState() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    activeTab: params.get('tab') || null,
    savedViewId: params.get('view') || null,
    search: params.get('q') || '',
    selectedRuleName: params.get('rule') || null,
    selectedTargetName: params.get('targetName') || null,
    selectedProfileName: params.get('profileName') || null,
    selectedScenarioName: params.get('scenarioName') || null,
    selectedRunId: params.get('run') || null,
    filters: {
      objectType: params.get('objectType') || defaultFilters.objectType,
      target: params.get('target') || defaultFilters.target,
      profile: params.get('profile') || defaultFilters.profile,
      scenario: params.get('scenario') || defaultFilters.scenario,
      runStatus: params.get('runStatus') || defaultFilters.runStatus,
      sourceFile: params.get('sourceFile') || defaultFilters.sourceFile,
      actionType: params.get('actionType') || defaultFilters.actionType,
      linkage: params.get('linkage') || defaultFilters.linkage,
    },
    evidenceFilters: {
      scenario: params.get('eScenario') || defaultEvidenceFilters.scenario,
      rule: params.get('eRule') || defaultEvidenceFilters.rule,
      runStatus: params.get('eStatus') || defaultEvidenceFilters.runStatus,
      sourceFile: params.get('eSource') || defaultEvidenceFilters.sourceFile,
      groupBy: params.get('groupBy') || defaultEvidenceFilters.groupBy,
    },
  };
}

const initialUrlState = readUrlState();

const toneFor = (status) =>
  status === 'matched' || status === 'matched-no-write'
    ? 'success'
    : status === 'dry-run'
      ? 'muted'
      : status === 'skipped'
        ? 'warning'
        : 'default';

const timeLabel = (timestamp) =>
  !timestamp || timestamp.length < 15 ? 'unknown' : `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}`;

const truncate = (text, max = 240) => (!text ? 'n/a' : text.length > max ? `${text.slice(0, max)}...` : text);

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function evidenceType(item) {
  const path = item?.path || '';
  const lower = path.toLowerCase();
  if (lower.endsWith('.png') || lower.includes('screenshot')) return 'screenshots';
  if (lower.endsWith('.json') && lower.includes('/logs/')) return 'logs';
  if (lower.endsWith('.txt') && lower.includes('readback')) return 'readback';
  if (lower.endsWith('.json') && (lower.includes('/config/') || lower.includes('/examples/'))) return 'source config';
  if (lower.endsWith('.md') || lower.includes('/notes/')) return 'related notes';
  return 'other evidence';
}

function groupEvidence(items) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const key = evidenceType(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([label, entries]) => ({ label, entries }));
}

function groupByKey(items, key) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const values =
      key === 'scenario'
        ? item.scenarioNames?.length
          ? item.scenarioNames
          : ['No scenario']
        : key === 'rule'
          ? [item.ruleName || 'No rule']
          : key === 'runStatus'
            ? [item.runStatus || 'unknown']
            : [item.path || 'No source file'];
    values.forEach((value) => {
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(item);
    });
  });
  return [...groups.entries()].map(([label, entries]) => ({ label, entries }));
}

function relatedDocsFor(objectType, object) {
  if (!object) return [];
  const common = [
    { label: 'Project overview', path: 'docs/overview.md' },
    { label: 'Morning workflow', path: 'docs/morning-workflow.md' },
    { label: 'Validation path', path: 'docs/validation-path.md' },
  ];
  if (objectType === 'rule') {
    return [...common, { label: 'Rule engine notes', path: 'notes/phase3-rule-engine.md' }, { label: 'Phase 3 validation', path: 'notes/phase3-validation-results.md' }];
  }
  if (objectType === 'profile') {
    return [...common, { label: 'OCR architecture', path: 'notes/ocr-phase-architecture.md' }, { label: 'OCR validation', path: 'notes/ocr-phase-validation-results.md' }];
  }
  if (objectType === 'target') {
    return [...common, { label: 'Target override notes', path: 'notes/phase4-target-override.md' }, { label: 'Phase 4 validation', path: 'notes/phase4-validation-results.md' }];
  }
  if (objectType === 'scenario') {
    return [...common, { label: 'Public examples', path: 'notes/phase4-public-examples.md' }, { label: 'Phase 4 validation', path: 'notes/phase4-validation-results.md' }];
  }
  if (objectType === 'run') {
    const prefix = object.id || '';
    if (prefix.startsWith('phase2')) return [...common, { label: 'Phase 2 validation', path: 'notes/phase2-validation-results.md' }];
    if (prefix.startsWith('phase3')) return [...common, { label: 'Phase 3 validation', path: 'notes/phase3-validation-results.md' }];
    if (prefix.startsWith('phase4')) return [...common, { label: 'Phase 4 validation', path: 'notes/phase4-validation-results.md' }];
    if (prefix.startsWith('ocr-phase')) return [...common, { label: 'OCR validation', path: 'notes/ocr-phase-validation-results.md' }];
    return common;
  }
  return common;
}

function relatedExamplesFor(objectType, object) {
  if (!object) return [];
  if (objectType === 'rule') {
    return object.actionType ? [{ label: `Action example: ${object.actionType}`, path: `examples/${object.actionType}.notepad.json` }] : [];
  }
  if (['profile', 'target', 'scenario', 'run'].includes(objectType)) {
    return object.sourceFile ? [{ label: 'Repository source', path: object.sourceFile }] : [];
  }
  return [];
}

function matchLabel(match) {
  if (!match) return 'No match config';
  if (match.type === 'contains') return `contains ${match.value}`;
  if (match.type === 'contains_any') return `contains_any ${match.values?.join(', ')}`;
  if (match.type === 'contains_all') return `contains_all ${match.values?.join(', ')}`;
  if (match.type === 'not_contains') return `not_contains ${match.value}`;
  if (match.type === 'regex') return `regex ${match.pattern}`;
  return JSON.stringify(match);
}

function profileSummary(profile) {
  if (!profile) return null;
  const roi = profile.roi ? `[${profile.roi.x}, ${profile.roi.y}, ${profile.roi.width}, ${profile.roi.height}]` : 'full window';
  const preprocess = [];
  if (profile.preprocessing?.grayscale) preprocess.push('grayscale');
  if (profile.preprocessing?.scale) preprocess.push(`scale ${profile.preprocessing.scale}`);
  if (profile.preprocessing?.threshold?.enabled) preprocess.push(`threshold ${profile.preprocessing.threshold.value}`);
  if (profile.preprocessing?.trim_border?.enabled) preprocess.push(`trim ${profile.preprocessing.trim_border.margin}`);
  const normalize = [
    profile.normalization?.collapse_whitespace ? 'collapse whitespace' : null,
    profile.normalization?.preserve_line_breaks ? 'preserve lines' : null,
    profile.normalization?.case && profile.normalization.case !== 'none' ? `case ${profile.normalization.case}` : null,
    profile.normalization?.simple_noise_cleanup ? 'noise cleanup' : null,
  ].filter(Boolean).join(', ') || 'none';
  return {
    roi,
    preprocess: preprocess.join(', ') || 'none',
    normalize,
    confirm: `${profile.watch?.consecutive_match_count ?? 1} frame(s)`,
  };
}

function hasDocsLink(objectType, object) {
  return relatedDocsFor(objectType, object).length > 0;
}

function buildShareUrl(state) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams();
  params.set('view', state.savedViewId || 'custom');
  params.set('tab', state.activeTab);
  if (state.search) params.set('q', state.search);
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value && value !== 'all') params.set(key, value);
  });
  Object.entries(state.evidenceFilters).forEach(([key, value]) => {
    if (!value || value === defaultEvidenceFilters[key]) return;
    if (key === 'scenario') params.set('eScenario', value);
    if (key === 'rule') params.set('eRule', value);
    if (key === 'runStatus') params.set('eStatus', value);
    if (key === 'sourceFile') params.set('eSource', value);
    if (key === 'groupBy') params.set('groupBy', value);
  });
  if (state.selectedRuleName) params.set('rule', state.selectedRuleName);
  if (state.selectedTargetName) params.set('targetName', state.selectedTargetName);
  if (state.selectedProfileName) params.set('profileName', state.selectedProfileName);
  if (state.selectedScenarioName) params.set('scenarioName', state.selectedScenarioName);
  if (state.selectedRunId) params.set('run', state.selectedRunId);
  return `${window.location.pathname}?${params.toString()}`;
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

function SectionHeader({ title, description, actions = null }) {
  return (
    <div className="section-header-row">
      <div className="section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions}
    </div>
  );
}

function Pill({ children, tone = 'default' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      <div className="empty-description">{description}</div>
    </div>
  );
}

function JsonErrorList({ errors, title }) {
  if (!errors?.length) return null;
  return (
    <div className="error-box">
      <div className="error-title">{title}</div>
      <ul>
        {errors.map((error) => (
          <li key={`${error.path}:${error.message}`}>
            <strong>{error.path}</strong>: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcePath({ path, copyLabel = 'Copy path', copiedLabel = 'Copied', naLabel = 'n/a' }) {
  const [copied, setCopied] = useState(false);
  async function copyPath() {
    if (!path || !navigator.clipboard) return;
    await navigator.clipboard.writeText(path);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="source-row">
      <code className="source-path">{path || naLabel}</code>
      {path ? (
        <button type="button" className="copy-button" onClick={copyPath}>
          {copied ? copiedLabel : copyLabel}
        </button>
      ) : null}
    </div>
  );
}

function SourceMeta({ items, title, copyLabel, copiedLabel, naLabel }) {
  const normalized = (items || []).filter((item) => item?.path);
  if (!normalized.length) return null;
  return (
    <div className="detail-block">
      <strong>{title}</strong>
      <div className="detail-list">
        {normalized.map((item) => (
          <div key={`${item.label}:${item.path}`} className="source-meta">
            <div className="source-label">{item.label}</div>
            <SourcePath path={item.path} copyLabel={copyLabel} copiedLabel={copiedLabel} naLabel={naLabel} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedLinks({ title, items, onSelect, emptyText }) {
  return (
    <div className="detail-block">
      <strong>{title}</strong>
      {items?.length ? (
        <div className="detail-list">
          {items.map((item) => (
            <button key={item.id || item.label} type="button" className="linked-run" onClick={() => onSelect?.(item)}>
              <span>{item.label}</span>
              {item.meta ? <span>{item.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="detail-empty">{emptyText}</div>
      )}
    </div>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="detail-row">
      <div className="detail-row-title">{label}</div>
      <div className="detail-row-body">{children}</div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="detail-section">
      <div className="detail-section-title">{title}</div>
      {children}
    </div>
  );
}

function Breadcrumbs({ items, onSelect }) {
  const visible = (items || []).filter(Boolean);
  if (!visible.length) return null;
  return (
    <div className="breadcrumbs">
      {visible.map((item, index) => (
        <React.Fragment key={`${item.id || item.label}-${index}`}>
          <button
            type="button"
            className={item.onClick || onSelect ? 'breadcrumb-link' : 'breadcrumb-static'}
            onClick={() => (item.onClick ? item.onClick() : onSelect?.(item))}
            disabled={!item.onClick && !onSelect}
          >
            {item.label}
          </button>
          {index < visible.length - 1 ? <span className="breadcrumb-sep">/</span> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function RelationshipPanel({ current, upstream = [], downstream = [], evidence = [], onSelect }) {
  return (
    <div className="detail-block">
      <strong>Object graph</strong>
      <div className="graph-grid">
        <div className="graph-card">
          <div className="graph-title">Current</div>
          <div className="graph-item graph-current">{current?.label || 'n/a'}</div>
        </div>
        <div className="graph-card">
          <div className="graph-title">Upstream</div>
          {upstream.length ? upstream.map((item) => <button key={item.id || item.label} type="button" className="graph-item graph-link" onClick={() => onSelect?.(item)}>{item.label}</button>) : <div className="graph-empty">No upstream links.</div>}
        </div>
        <div className="graph-card">
          <div className="graph-title">Downstream</div>
          {downstream.length ? downstream.map((item) => <button key={item.id || item.label} type="button" className="graph-item graph-link" onClick={() => onSelect?.(item)}>{item.label}</button>) : <div className="graph-empty">No downstream links.</div>}
        </div>
        <div className="graph-card">
          <div className="graph-title">Evidence</div>
          {evidence.length ? evidence.map((item) => <div key={item.id || item.label} className="graph-item">{item.label}</div>) : <div className="graph-empty">No linked evidence.</div>}
        </div>
      </div>
    </div>
  );
}

function EvidenceGroups({ items, copyLabel = 'Copy path', copiedLabel = 'Copied', naLabel = 'n/a' }) {
  const groups = groupEvidence(items);
  if (!groups.length) return <div className="detail-empty">No grouped evidence available.</div>;
  return (
    <div className="evidence-groups">
      {groups.map((group) => (
        <div key={group.label} className="evidence-group">
          <div className="evidence-title">{titleCase(group.label)}</div>
          <div className="detail-list">
            {group.entries.map((item) => (
              <div key={`${group.label}:${item.path || item.id || item.label}`} className="source-meta">
                <div className="source-label">{item.label}</div>
                <SourcePath path={item.path || item.id} copyLabel={copyLabel} copiedLabel={copiedLabel} naLabel={naLabel} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialUrlState.activeTab || 'rules');
  const [search, setSearch] = useState(initialUrlState.search || '');
  const [selectedRuleName, setSelectedRuleName] = useState(initialUrlState.selectedRuleName || null);
  const [selectedProfileName, setSelectedProfileName] = useState(initialUrlState.selectedProfileName || null);
  const [selectedTargetName, setSelectedTargetName] = useState(initialUrlState.selectedTargetName || null);
  const [selectedScenarioName, setSelectedScenarioName] = useState(initialUrlState.selectedScenarioName || null);
  const [selectedRunId, setSelectedRunId] = useState(initialUrlState.selectedRunId || null);
  const [filters, setFilters] = useState({ ...defaultFilters, ...(initialUrlState.filters || {}) });
  const [savedViewId, setSavedViewId] = useState(initialUrlState.savedViewId || 'overview');
  const [evidenceFilters, setEvidenceFilters] = useState({ ...defaultEvidenceFilters, ...(initialUrlState.evidenceFilters || {}) });
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error(`Dashboard load failed: ${response.status}`);
        const payload = await response.json();
        if (!cancelled) {
          setData(payload);
          setSelectedRuleName((current) => current || payload.rules?.[0]?.name || null);
          setSelectedProfileName((current) => current || payload.ocrProfiles?.[0]?.name || null);
          setSelectedTargetName((current) => current || payload.targets?.[0]?.name || null);
          setSelectedScenarioName((current) => current || payload.scenarios?.[0]?.name || null);
          setSelectedRunId((current) => current || payload.recentRuns?.[0]?.id || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const targets = data?.targets ?? [];
  const profiles = data?.ocrProfiles ?? [];
  const rules = data?.rules ?? [];
  const scenarios = data?.scenarios ?? [];
  const recentRuns = data?.recentRuns ?? [];
  const evidenceItems = data?.evidenceItems ?? [];
  const repoHealth = data?.repoHealth ?? {};
  const entrypoints = data?.entrypoints ?? [];

  const ruleOptions = useMemo(() => [...new Set(rules.map((rule) => rule.name).filter(Boolean))].sort(), [rules]);
  const sourceFiles = useMemo(() => [...new Set([...targets, ...profiles, ...rules, ...scenarios, ...recentRuns].map((item) => item.sourceFile).filter(Boolean))].sort(), [targets, profiles, rules, scenarios, recentRuns]);
  const runStatuses = useMemo(() => [...new Set(recentRuns.map((run) => run.status).filter(Boolean))].sort(), [recentRuns]);
  const actionTypes = useMemo(() => [...new Set([...rules.map((rule) => rule.actionType), ...recentRuns.map((run) => run.actionType)].filter(Boolean))].sort(), [rules, recentRuns]);
  const evidenceSourceFiles = useMemo(() => [...new Set(evidenceItems.map((item) => item.path).filter(Boolean))].sort(), [evidenceItems]);

  const multiTargetScenarioNames = useMemo(() => new Set(scenarios.filter((scenario) => scenario.targetNames?.length > 1).map((scenario) => scenario.name)), [scenarios]);
  const multiTargetTargetNames = useMemo(() => new Set(scenarios.filter((scenario) => scenario.targetNames?.length > 1).flatMap((scenario) => scenario.targetNames || [])), [scenarios]);
  const multiTargetProfileNames = useMemo(() => new Set(scenarios.filter((scenario) => scenario.targetNames?.length > 1).flatMap((scenario) => scenario.profileNames || [])), [scenarios]);

  function matchesLinkage(objectType, object) {
    if (filters.linkage === 'all') return true;
    if (filters.linkage === 'docs-linked') return hasDocsLink(objectType, object);
    if (filters.linkage === 'validated-safe') return data?.validatedActionTypes?.includes(object.actionType);
    if (filters.linkage === 'multi-target') {
      if (objectType === 'scenario') return multiTargetScenarioNames.has(object.name);
      if (objectType === 'rule') return (object.scenarioNames || []).some((name) => multiTargetScenarioNames.has(name));
      if (objectType === 'target') return multiTargetTargetNames.has(object.name);
      if (objectType === 'profile') return multiTargetProfileNames.has(object.name);
      if (objectType === 'run') return (object.scenarioNames || []).some((name) => multiTargetScenarioNames.has(name));
    }
    return true;
  }

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const haystack = [rule.name, rule.actionType, rule.targetRef, rule.ocrProfileRef, rule.sourceFile, rule.resolvedTargetName, matchLabel(rule.match), ...(rule.scenarioNames || [])].join(' ').toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesType = filters.objectType === 'all' || filters.objectType === 'rules';
      const matchesTarget = filters.target === 'all' || rule.resolvedTargetName === filters.target || rule.targetRef === filters.target;
      const matchesProfile = filters.profile === 'all' || rule.ocrProfileRef === filters.profile;
      const matchesScenario = filters.scenario === 'all' || (rule.scenarioNames || []).includes(filters.scenario);
      const matchesSource = filters.sourceFile === 'all' || rule.sourceFile === filters.sourceFile;
      const matchesAction = filters.actionType === 'all' || rule.actionType === filters.actionType;
      return matchesSearch && matchesType && matchesTarget && matchesProfile && matchesScenario && matchesSource && matchesAction && matchesLinkage('rule', rule);
    });
  }, [rules, search, filters, multiTargetScenarioNames, data]);

  const filteredTargets = useMemo(
    () =>
      targets.filter((target) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'targets';
        const matchesTarget = filters.target === 'all' || target.name === filters.target;
        const matchesSource = filters.sourceFile === 'all' || target.sourceFile === filters.sourceFile;
        return matchesType && matchesTarget && matchesSource && matchesLinkage('target', target);
      }),
    [targets, filters, multiTargetTargetNames]
  );

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'profiles';
        const matchesProfile = filters.profile === 'all' || profile.name === filters.profile;
        const matchesSource = filters.sourceFile === 'all' || profile.sourceFile === filters.sourceFile;
        return matchesType && matchesProfile && matchesSource && matchesLinkage('profile', profile);
      }),
    [profiles, filters, multiTargetProfileNames]
  );

  const filteredScenarios = useMemo(
    () =>
      scenarios.filter((scenario) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'scenarios';
        const matchesScenario = filters.scenario === 'all' || scenario.name === filters.scenario;
        const matchesTarget = filters.target === 'all' || scenario.targetNames.includes(filters.target);
        const matchesProfile = filters.profile === 'all' || scenario.profileNames.includes(filters.profile);
        const matchesSource = filters.sourceFile === 'all' || scenario.sourceFile === filters.sourceFile;
        return matchesType && matchesScenario && matchesTarget && matchesProfile && matchesSource && matchesLinkage('scenario', scenario);
      }),
    [scenarios, filters, multiTargetScenarioNames]
  );

  const filteredRuns = useMemo(
    () =>
      recentRuns.filter((run) => {
        const q = search.trim().toLowerCase();
        const haystack = [run.id, run.ruleName, run.targetName, run.targetWindow, run.ocrProfileUsed, run.sourceFile, ...(run.scenarioNames || [])].join(' ').toLowerCase();
        const matchesSearch = !q || haystack.includes(q);
        const matchesType = filters.objectType === 'all' || filters.objectType === 'runs';
        const matchesStatus = filters.runStatus === 'all' || run.status === filters.runStatus;
        const matchesTarget = filters.target === 'all' || run.targetName === filters.target;
        const matchesProfile = filters.profile === 'all' || run.ocrProfileUsed === filters.profile;
        const matchesScenario = filters.scenario === 'all' || (run.scenarioNames || []).includes(filters.scenario);
        const matchesSource = filters.sourceFile === 'all' || run.sourceFile === filters.sourceFile;
        const matchesAction = filters.actionType === 'all' || run.actionType === filters.actionType;
        return matchesSearch && matchesType && matchesStatus && matchesTarget && matchesProfile && matchesScenario && matchesSource && matchesAction && matchesLinkage('run', run);
      }),
    [recentRuns, search, filters, multiTargetScenarioNames, data]
  );

  const selectedRule = filteredRules.find((rule) => rule.name === selectedRuleName) || rules.find((rule) => rule.name === selectedRuleName) || filteredRules[0] || rules[0] || null;
  const selectedTarget = filteredTargets.find((target) => target.name === selectedTargetName) || targets.find((target) => target.name === selectedTargetName) || filteredTargets[0] || targets[0] || null;
  const selectedProfile = filteredProfiles.find((profile) => profile.name === selectedProfileName) || profiles.find((profile) => profile.name === selectedProfileName) || filteredProfiles[0] || profiles[0] || null;
  const selectedScenario = filteredScenarios.find((scenario) => scenario.name === selectedScenarioName) || scenarios.find((scenario) => scenario.name === selectedScenarioName) || filteredScenarios[0] || scenarios[0] || null;
  const selectedRun = filteredRuns.find((run) => run.id === selectedRunId) || recentRuns.find((run) => run.id === selectedRunId) || filteredRuns[0] || recentRuns[0] || null;

  const selectedRuleTarget = targets.find((target) => target.name === selectedRule?.resolvedTargetName || target.name === selectedRule?.targetRef) || null;
  const selectedRuleProfile = profiles.find((profile) => profile.name === selectedRule?.ocrProfileRef) || null;
  const selectedRuleScenarios = scenarios.filter((scenario) => scenario.rules?.some((rule) => rule.name === selectedRule?.name));
  const selectedRuleRuns = recentRuns.filter((run) => run.ruleName === selectedRule?.name);

  const selectedTargetRules = rules.filter((rule) => rule.resolvedTargetName === selectedTarget?.name);
  const selectedTargetRuns = recentRuns.filter((run) => run.targetName === selectedTarget?.name);

  const selectedProfileRules = rules.filter((rule) => rule.ocrProfileRef === selectedProfile?.name);
  const selectedProfileRuns = recentRuns.filter((run) => run.ocrProfileUsed === selectedProfile?.name);

  const selectedScenarioRuns = recentRuns.filter((run) => (run.scenarioNames || []).includes(selectedScenario?.name));

  const selectedRunRule = rules.find((rule) => rule.name === selectedRun?.ruleName) || null;
  const selectedRunTarget = targets.find((target) => target.name === selectedRun?.targetName) || targets.find((target) => target.name === selectedRunRule?.resolvedTargetName) || null;
  const selectedRunProfile = profiles.find((profile) => profile.name === selectedRun?.ocrProfileUsed) || profiles.find((profile) => profile.name === selectedRunRule?.ocrProfileRef) || null;
  const selectedRunScenarios = scenarios.filter((scenario) => (selectedRun?.scenarioNames || []).includes(scenario.name));

  const filteredEvidence = useMemo(
    () =>
      evidenceItems.filter((item) => {
        const matchesScenario = evidenceFilters.scenario === 'all' || (item.scenarioNames || []).includes(evidenceFilters.scenario);
        const matchesRule = evidenceFilters.rule === 'all' || item.ruleName === evidenceFilters.rule;
        const matchesStatus = evidenceFilters.runStatus === 'all' || item.runStatus === evidenceFilters.runStatus;
        const matchesSource = evidenceFilters.sourceFile === 'all' || item.path === evidenceFilters.sourceFile;
        return matchesScenario && matchesRule && matchesStatus && matchesSource;
      }),
    [evidenceItems, evidenceFilters]
  );

  const groupedEvidenceHub = useMemo(() => groupByKey(filteredEvidence, evidenceFilters.groupBy), [filteredEvidence, evidenceFilters.groupBy]);

  const filterCounts = {
    rules: filteredRules.length,
    targets: filteredTargets.length,
    profiles: filteredProfiles.length,
    scenarios: filteredScenarios.length,
    runs: filteredRuns.length,
  };

  const activeFilterEntries = Object.entries(filters).filter(([, value]) => value !== 'all');
  const shareUrl = buildShareUrl({
    savedViewId,
    activeTab,
    search,
    filters,
    evidenceFilters,
    selectedRuleName,
    selectedTargetName,
    selectedProfileName,
    selectedScenarioName,
    selectedRunId,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextUrl = buildShareUrl({
      savedViewId,
      activeTab,
      search,
      filters,
      evidenceFilters,
      selectedRuleName,
      selectedTargetName,
      selectedProfileName,
      selectedScenarioName,
      selectedRunId,
    });
    if (nextUrl) window.history.replaceState({}, '', nextUrl);
  }, [savedViewId, activeTab, search, filters, evidenceFilters, selectedRuleName, selectedTargetName, selectedProfileName, selectedScenarioName, selectedRunId]);

  function markCustom() {
    setSavedViewId('custom');
  }

  function updateFilters(patch) {
    markCustom();
    setFilters((current) => ({ ...current, ...patch }));
  }

  function updateEvidenceFilters(patch) {
    markCustom();
    setEvidenceFilters((current) => ({ ...current, ...patch }));
  }

  function applySavedView(nextViewId) {
    const nextView = savedViews.find((view) => view.id === nextViewId);
    if (!nextView) return;
    setSavedViewId(nextViewId);
    setActiveTab(nextView.activeTab);
    setFilters({ ...nextView.filters });
    setEvidenceFilters({ ...nextView.evidenceFilters });
    setSearch('');
  }

  function handleObjectLink(item) {
    if (!item?.id) return;
    markCustom();
    if (item.id.startsWith('rule:')) {
      setActiveTab('rules');
      setSelectedRuleName(item.id.replace('rule:', ''));
    }
    if (item.id.startsWith('target:')) {
      setActiveTab('targets');
      setSelectedTargetName(item.id.replace('target:', ''));
    }
    if (item.id.startsWith('profile:')) {
      setActiveTab('profiles');
      setSelectedProfileName(item.id.replace('profile:', ''));
    }
    if (item.id.startsWith('scenario:')) {
      setActiveTab('scenarios');
      setSelectedScenarioName(item.id.replace('scenario:', ''));
    }
    if (item.id.startsWith('run:')) {
      setActiveTab('runs');
      setSelectedRunId(item.id.replace('run:', ''));
    }
  }

  async function copyShareLink() {
    if (!shareUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1200);
  }

  const globalBreadcrumbs = [
    { label: 'repository guide', onClick: () => applySavedView('overview') },
    { label: savedViewId === 'custom' ? 'custom view' : savedViews.find((view) => view.id === savedViewId)?.label || 'overview' },
    { label: titleCase(activeTab) },
    activeTab === 'rules' && selectedRule ? { label: selectedRule.name, id: `rule:${selectedRule.name}` } : null,
    activeTab === 'targets' && selectedTarget ? { label: selectedTarget.name, id: `target:${selectedTarget.name}` } : null,
    activeTab === 'profiles' && selectedProfile ? { label: selectedProfile.name, id: `profile:${selectedProfile.name}` } : null,
    activeTab === 'scenarios' && selectedScenario ? { label: selectedScenario.name, id: `scenario:${selectedScenario.name}` } : null,
    activeTab === 'runs' && selectedRun ? { label: selectedRun.id, id: `run:${selectedRun.id}` } : null,
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <div className="page">
        <header className="hero">
          <div className="hero-copy">
            <div className="hero-badge">{data?.releaseCandidate?.label || 'Strictly read-only repository guide'}</div>
            <h1>auto-sp rule engine</h1>
            <p>{data?.releaseCandidate?.summary || 'Start in the docs, continue into the repository explorer, browse evidence in context, and confirm repo health without widening the validated automation boundary.'}</p>
          </div>
          <div className="hero-grid">
            <StatCard label="Validated safe actions" value={data?.validatedActionTypes?.length ?? 0} hint="Observed in repository evidence" />
            <StatCard label="Rules + scenarios" value={`${rules.length} / ${repoHealth.scenariosCount ?? 0}`} hint="Validated rules and scenario coverage" />
            <StatCard label="Docs + notes" value={(repoHealth.docsCount ?? 0) + (repoHealth.notesCount ?? 0)} hint="Readable entrypoints and history" />
            <StatCard label="Evidence items" value={repoHealth.evidenceItemsCount ?? 0} hint="Logs, screenshots, and readback" />
            <StatCard label="Frontend build" value={repoHealth.frontendBuildStatus || 'unknown'} hint={repoHealth.frontendBuildHint || 'Read-only explorer artifact status'} />
          </div>
          <div className="release-strip">
            <div className="release-card">
              <div className="landing-label">Release state</div>
              <div className="landing-copy">{data?.releaseCandidate?.label || 'Release candidate'} / {data?.releaseCandidate?.packageVersion || 'n/a'}</div>
              <SourcePath path={data?.releaseCandidate?.source} />
            </div>
            <div className="release-card">
              <div className="landing-label">Validated boundary</div>
              <div className="landing-copy">Still limited to capture, OCR, normalization, rule match, and control-targeted AutoHotkey write.</div>
            </div>
            <div className="release-card">
              <div className="landing-label">Frontend mode</div>
              <div className="landing-copy">Strictly read-only. No execution controls, config editing, or file write-back.</div>
            </div>
          </div>
          <div className="landing-grid">
            {entrypoints.map((entry) => (
              <div key={entry.path} className="landing-card">
                <div className="landing-label">{entry.label}</div>
                <div className="landing-copy">{entry.description}</div>
                <SourcePath path={entry.path} />
              </div>
            ))}
          </div>
        </header>

        <section className="shell-panel">
          <Breadcrumbs items={globalBreadcrumbs} onSelect={handleObjectLink} />
          <SectionHeader
            title="Saved views"
            description="Formalized read-only views over the same repository data. The current state stays in the URL so it is easier to preserve or share."
            actions={<button type="button" className="utility-button" onClick={copyShareLink}>{shareCopied ? 'Share link copied' : 'Copy share link'}</button>}
          />
          <div className="saved-view-grid">
            {savedViews.map((view) => (
              <button key={view.id} type="button" className={savedViewId === view.id ? 'saved-view-card active' : 'saved-view-card'} onClick={() => applySavedView(view.id)}>
                <strong>{view.label}</strong>
                <span>{view.description}</span>
              </button>
            ))}
            <div className={savedViewId === 'custom' ? 'saved-view-card active saved-view-static' : 'saved-view-card saved-view-static'}>
              <strong>Custom</strong>
              <span>Current URL-preserved state after manual filtering or navigation.</span>
            </div>
          </div>
          <div className="info-strip">
            <div className="search-panel">
              <input type="search" value={search} onChange={(event) => { markCustom(); setSearch(event.target.value); }} placeholder="Search rules, targets, profiles, scenarios, runs" />
            </div>
            <div className="placeholder-actions">
              <SourcePath path={shareUrl ? `${window.location.origin}${shareUrl}` : ''} copyLabel="Copy URL" copiedLabel="Copied URL" naLabel="No shareable state" />
            </div>
          </div>
          <div className="filter-grid">
            <label><span>Object type</span><select value={filters.objectType} onChange={(event) => updateFilters({ objectType: event.target.value })}><option value="all">All</option><option value="rules">Rules</option><option value="targets">Targets</option><option value="profiles">Profiles</option><option value="scenarios">Scenarios</option><option value="runs">Runs</option></select></label>
            <label><span>Target</span><select value={filters.target} onChange={(event) => updateFilters({ target: event.target.value })}><option value="all">All</option>{targets.map((target) => <option key={target.name} value={target.name}>{target.name}</option>)}</select></label>
            <label><span>OCR profile</span><select value={filters.profile} onChange={(event) => updateFilters({ profile: event.target.value })}><option value="all">All</option>{profiles.map((profile) => <option key={profile.name} value={profile.name}>{profile.name}</option>)}</select></label>
            <label><span>Scenario</span><select value={filters.scenario} onChange={(event) => updateFilters({ scenario: event.target.value })}><option value="all">All</option>{scenarios.map((scenario) => <option key={scenario.name} value={scenario.name}>{scenario.name}</option>)}</select></label>
            <label><span>Run status</span><select value={filters.runStatus} onChange={(event) => updateFilters({ runStatus: event.target.value })}><option value="all">All</option>{runStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label><span>Action type</span><select value={filters.actionType} onChange={(event) => updateFilters({ actionType: event.target.value })}><option value="all">All</option>{actionTypes.map((actionType) => <option key={actionType} value={actionType}>{actionType}</option>)}</select></label>
            <label><span>Source file</span><select value={filters.sourceFile} onChange={(event) => updateFilters({ sourceFile: event.target.value })}><option value="all">All</option>{sourceFiles.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
            <label><span>Linked set</span><select value={filters.linkage} onChange={(event) => updateFilters({ linkage: event.target.value })}><option value="all">All</option><option value="docs-linked">Docs-linked</option><option value="validated-safe">Validated safe actions</option><option value="multi-target">Multi-target</option></select></label>
          </div>
          <div className="count-row">
            <div className="count-chip">Rules {filterCounts.rules}</div>
            <div className="count-chip">Targets {filterCounts.targets}</div>
            <div className="count-chip">Profiles {filterCounts.profiles}</div>
            <div className="count-chip">Scenarios {filterCounts.scenarios}</div>
            <div className="count-chip">Runs {filterCounts.runs}</div>
          </div>
          <div className="count-row">
            <div className="count-chip">View {savedViewId}</div>
            {activeFilterEntries.length ? activeFilterEntries.map(([key, value]) => <div key={key} className="count-chip">{key}: {value}</div>) : <div className="count-chip">No active filters</div>}
          </div>
        </section>

        {loading ? <EmptyState title="Loading repository guide" description="Reading repository files through the local read-only API." /> : null}
        {error ? <EmptyState title="Repository guide unavailable" description={error} /> : null}

        {!loading && !error && data ? (
          <>
            <JsonErrorList errors={data.loadErrors} title="Partial repo state detected" />
            <div className="layout">
              <div className="main-column">
                <section className="panel">
                  <SectionHeader title="Unified landing" description="The top-level path is now consistent: start with the repo map, use the morning workflow for the next session, then move into the explorer and evidence hub." />
                  <div className="pipeline-diagram">{['README', 'Repo map', 'Morning workflow', 'Explorer', 'Evidence hub'].map((step) => <div key={step}>{step}</div>)}</div>
                  <div className="coverage-grid">
                    <div className="graph-card"><div className="graph-title">Targets</div><div className="stat-value">{repoHealth.targetsCount ?? 0}</div><div className="graph-empty">Validated target bundles</div></div>
                    <div className="graph-card"><div className="graph-title">OCR Profiles</div><div className="stat-value">{repoHealth.profilesCount ?? 0}</div><div className="graph-empty">Named OCR profiles</div></div>
                    <div className="graph-card"><div className="graph-title">Runs</div><div className="stat-value">{repoHealth.runsCount ?? 0}</div><div className="graph-empty">Recent repository evidence runs</div></div>
                  </div>
                </section>

                <section className="panel">
                  <SectionHeader title="Repository explorer" description="Read-only navigation across repository objects with stronger saved views and clearer detail summaries." />
                  <div className="tabs">
                    {explorerTabs.map((tab) => (
                      <button key={tab.id} type="button" className={tab.id === activeTab ? 'tab active' : 'tab'} onClick={() => { markCustom(); setActiveTab(tab.id); }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {activeTab === 'rules' && selectedRule ? <div className="detail-panel"><DetailSection title="Visible rules"><RelatedLinks title="Choose a rule" items={filteredRules.map((rule) => ({ label: rule.name, meta: rule.actionType, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText="No rules." /></DetailSection><DetailSection title="Summary"><div className="item-topline"><h3>{selectedRule.name}</h3><Pill>{selectedRule.actionType}</Pill></div><p className="item-subline">{matchLabel(selectedRule.match)}</p><div className="item-meta"><span>Resolved target: {selectedRule.resolvedTargetName || selectedRule.targetRef || 'default'}</span><span>Resolved OCR profile: {selectedRuleProfile?.name || selectedRule.ocrProfileRef || 'default'}</span></div></DetailSection><DetailSection title="Source"><SourceMeta items={[{ label: 'Rule source', path: selectedRule.sourceFile }, ...relatedDocsFor('rule', selectedRule), ...relatedExamplesFor('rule', selectedRule)]} title="Source files" /></DetailSection><DetailSection title="Evidence"><EvidenceGroups items={[{ label: 'Rule source', path: selectedRule.sourceFile }, ...selectedRuleRuns.flatMap((run) => [run.sourceFile ? { label: `Run log ${run.id}`, path: run.sourceFile } : null, run.screenshotPath ? { label: `Screenshot ${run.id}`, path: run.screenshotPath } : null, ...(run.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile }))]).filter(Boolean)]} /></DetailSection></div> : null}
                  {activeTab === 'targets' && selectedTarget ? <div className="detail-panel"><DetailSection title="Visible targets"><RelatedLinks title="Choose a target" items={filteredTargets.map((target) => ({ label: target.name, meta: target.target.window_title, id: `target:${target.name}` }))} onSelect={handleObjectLink} emptyText="No targets." /></DetailSection><DetailSection title="Summary"><div className="item-topline"><h3>{selectedTarget.name}</h3><Pill tone="muted">target</Pill></div><div className="kv-grid"><div><strong>Window</strong><span>{selectedTarget.target.window_title}</span></div><div><strong>Control</strong><span>{selectedTarget.control.name}</span></div><div><strong>Process</strong><span>{selectedTarget.target.process_name}</span></div><div><strong>Target file</strong><span>{selectedTarget.notes?.target_file || 'n/a'}</span></div></div></DetailSection><DetailSection title="Related"><RelatedLinks title="Related rules" items={selectedTargetRules.map((rule) => ({ label: rule.name, meta: rule.actionType, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText="No related rules." /><RelatedLinks title="Related runs" items={selectedTargetRuns.map((run) => ({ label: run.id, meta: run.status, id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText="No related runs." /></DetailSection></div> : null}
                  {activeTab === 'profiles' && selectedProfile ? <div className="detail-panel"><DetailSection title="Visible OCR profiles"><RelatedLinks title="Choose a profile" items={filteredProfiles.map((profile) => ({ label: profile.name, meta: profileSummary(profile).confirm, id: `profile:${profile.name}` }))} onSelect={handleObjectLink} emptyText="No profiles." /></DetailSection><DetailSection title="Summary"><div className="item-topline"><h3>{selectedProfile.name}</h3><Pill tone="muted">OCR profile</Pill></div><div className="kv-grid"><div><strong>ROI</strong><span>{profileSummary(selectedProfile).roi}</span></div><div><strong>Confirm</strong><span>{profileSummary(selectedProfile).confirm}</span></div><div><strong>Preprocess</strong><span>{profileSummary(selectedProfile).preprocess}</span></div><div><strong>Normalize</strong><span>{profileSummary(selectedProfile).normalize}</span></div></div></DetailSection><DetailSection title="Related"><RelatedLinks title="Related rules" items={selectedProfileRules.map((rule) => ({ label: rule.name, meta: rule.actionType, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText="No related rules." /><RelatedLinks title="Related runs" items={selectedProfileRuns.map((run) => ({ label: run.id, meta: run.status, id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText="No related runs." /></DetailSection></div> : null}
                  {activeTab === 'scenarios' && selectedScenario ? <div className="detail-panel"><DetailSection title="Visible scenarios"><RelatedLinks title="Choose a scenario" items={filteredScenarios.map((scenario) => ({ label: scenario.name, meta: `${scenario.ruleCount} rule(s)`, id: `scenario:${scenario.name}` }))} onSelect={handleObjectLink} emptyText="No scenarios." /></DetailSection><DetailSection title="Summary"><div className="item-topline"><h3>{selectedScenario.name}</h3><Pill tone="muted">scenario</Pill></div><p className="item-subline">{selectedScenario.description || 'No scenario description provided.'}</p><div className="item-meta"><span>Targets: {selectedScenario.targetNames.join(', ') || 'default only'}</span><span>Profiles: {selectedScenario.profileNames.join(', ') || 'default only'}</span></div></DetailSection><DetailSection title="Related"><RelatedLinks title="Scenario rules" items={(selectedScenario.rules || []).map((rule) => ({ label: rule.name, meta: `${rule.resolvedTarget} / ${rule.resolvedProfile}`, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText="No scenario rules." /><RelatedLinks title="Related runs" items={selectedScenarioRuns.map((run) => ({ label: run.id, meta: run.status, id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText="No related runs." /></DetailSection></div> : null}
                  {activeTab === 'runs' && selectedRun ? <div className="detail-panel"><DetailSection title="Visible runs"><RelatedLinks title="Choose a run" items={filteredRuns.map((run) => ({ label: run.id, meta: `${run.status} / ${run.targetName || 'unknown'}`, id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText="No runs." /></DetailSection><DetailSection title="Summary"><div className="item-topline"><h3>{selectedRun.id}</h3><Pill tone={toneFor(selectedRun.status)}>{selectedRun.status}</Pill></div><div className="detail-list"><DetailField label="Matched rule">{selectedRun.ruleName || 'none'}</DetailField><DetailField label="Target">{selectedRun.targetName || selectedRun.targetWindow || 'unknown'}</DetailField><DetailField label="OCR profile">{selectedRun.ocrProfileUsed || 'n/a'}</DetailField><DetailField label="Time">{timeLabel(selectedRun.timestamp)}</DetailField><DetailField label="Screenshot path"><SourcePath path={selectedRun.screenshotPath} /></DetailField><DetailField label="Normalized OCR"><div className="detail-text">{truncate(selectedRun.normalizedOcrOutput, 320)}</div></DetailField></div></DetailSection><DetailSection title="Related"><RelatedLinks title="Related objects" items={[selectedRunRule ? { label: `Rule: ${selectedRunRule.name}`, meta: selectedRunRule.actionType, id: `rule:${selectedRunRule.name}` } : null, selectedRunTarget ? { label: `Target: ${selectedRunTarget.name}`, meta: selectedRunTarget.target.window_title, id: `target:${selectedRunTarget.name}` } : null, selectedRunProfile ? { label: `OCR profile: ${selectedRunProfile.name}`, meta: profileSummary(selectedRunProfile)?.confirm, id: `profile:${selectedRunProfile.name}` } : null, ...selectedRunScenarios.map((scenario) => ({ label: `Scenario: ${scenario.name}`, meta: `${scenario.ruleCount} rule(s)`, id: `scenario:${scenario.name}` }))].filter(Boolean)} onSelect={handleObjectLink} emptyText="No related objects." /></DetailSection></div> : null}
                </section>

                <section className="panel">
                  <SectionHeader title="Evidence hub" description="Browse read-only evidence by scenario, rule, run status, and source file. Grouping is adjustable without adding any write or execution action." />
                  <div className="filter-grid compact">
                    <label><span>Scenario</span><select value={evidenceFilters.scenario} onChange={(event) => updateEvidenceFilters({ scenario: event.target.value })}><option value="all">All</option>{scenarios.map((scenario) => <option key={scenario.name} value={scenario.name}>{scenario.name}</option>)}</select></label>
                    <label><span>Rule</span><select value={evidenceFilters.rule} onChange={(event) => updateEvidenceFilters({ rule: event.target.value })}><option value="all">All</option>{ruleOptions.map((rule) => <option key={rule} value={rule}>{rule}</option>)}</select></label>
                    <label><span>Run status</span><select value={evidenceFilters.runStatus} onChange={(event) => updateEvidenceFilters({ runStatus: event.target.value })}><option value="all">All</option>{runStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                    <label><span>Source file</span><select value={evidenceFilters.sourceFile} onChange={(event) => updateEvidenceFilters({ sourceFile: event.target.value })}><option value="all">All</option>{evidenceSourceFiles.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
                    <label><span>Group by</span><select value={evidenceFilters.groupBy} onChange={(event) => updateEvidenceFilters({ groupBy: event.target.value })}><option value="scenario">Scenario</option><option value="rule">Rule</option><option value="runStatus">Run status</option><option value="sourceFile">Source file</option></select></label>
                  </div>
                  <div className="count-row"><div className="count-chip">Evidence items {filteredEvidence.length}</div><div className="count-chip">Grouped by {titleCase(evidenceFilters.groupBy)}</div></div>
                  {groupedEvidenceHub.length ? <div className="evidence-hub-grid">{groupedEvidenceHub.map((group) => <div key={group.label} className="evidence-hub-card"><div className="item-topline"><h3>{group.label}</h3><Pill tone="muted">{group.entries.length} item(s)</Pill></div><div className="detail-list">{group.entries.map((item) => <div key={`${group.label}:${item.runId}:${item.path}`} className="detail-row"><div className="detail-row-title">{item.label}</div><div className="detail-row-body"><div className="item-meta"><span>Run: {item.runId}</span><span>Status: {item.runStatus}</span><span>Rule: {item.ruleName || 'none'}</span><span>Scenario: {(item.scenarioNames || []).join(', ') || 'none'}</span></div><SourcePath path={item.path} /><div className="detail-actions"><button type="button" className="inline-link" onClick={() => handleObjectLink({ id: `run:${item.runId}` })}>Open run</button>{item.ruleName ? <button type="button" className="inline-link" onClick={() => handleObjectLink({ id: `rule:${item.ruleName}` })}>Open rule</button> : null}{item.scenarioNames?.[0] ? <button type="button" className="inline-link" onClick={() => handleObjectLink({ id: `scenario:${item.scenarioNames[0]}` })}>Open scenario</button> : null}</div></div></div>)}</div></div>)}</div> : <EmptyState title="No evidence matched" description="Adjust the evidence hub filters to browse a different read-only slice of logs, screenshots, or readback files." />}
                </section>
              </div>

              <aside className="side-column">
                <section className="panel">
                  <SectionHeader title="Repo health" description="Stronger health summary across docs, examples, evidence, the read-only frontend artifact, and repository data load." />
                  <div className="health-grid"><StatCard label="Docs" value={repoHealth.docsCount ?? 0} hint="Markdown docs under docs/" /><StatCard label="Notes" value={repoHealth.notesCount ?? 0} hint="Phase, release, and UX notes" /><StatCard label="Examples" value={repoHealth.exampleConfigsCount ?? 0} hint="Configs, targets, profiles, scenarios" /><StatCard label="Evidence logs" value={repoHealth.evidenceLogsCount ?? 0} hint="JSON logs and readback text" /><StatCard label="Screenshots" value={repoHealth.screenshotCount ?? 0} hint="Representative evidence images" /><StatCard label="Load errors" value={repoHealth.loadErrorsCount ?? 0} hint="Dashboard data load issues" /></div>
                  <div className="detail-list"><div className="detail-row"><div className="detail-row-title">Latest evidence</div><div className="detail-row-body">{repoHealth.latestEvidenceTimestamp ? timeLabel(repoHealth.latestEvidenceTimestamp) : 'n/a'}</div></div><div className="detail-row"><div className="detail-row-title">Frontend build</div><div className="detail-row-body">{repoHealth.frontendBuildStatus || 'unknown'}<span>{repoHealth.frontendBuildHint || 'No build status hint available.'}</span></div></div><div className="detail-row"><div className="detail-row-title">Saved views</div><div className="detail-row-body">{savedViews.length} formalized read-only views</div></div></div>
                </section>

                <section className="panel">
                  <SectionHeader title="Morning workflow" description="Recommended read-only path for the next session. The same entrypoints are also listed in docs/morning-workflow.md and scripts/dev/start-morning.ps1." />
                  <div className="detail-list">{(data.morningWorkflow || []).map((step) => <div key={step.label} className="detail-row"><div className="detail-row-title">{step.label}</div><div className="detail-row-body"><span>{step.description}</span><SourcePath path={step.path} /></div></div>)}</div>
                </section>

                <section className="panel">
                  <SectionHeader title="Boundary summary" description="The project remains intentionally narrow. The frontend stays read-only and does not add execution controls, config editing, or file write-back." />
                  <div className="boundary-card boundary-in"><div className="boundary-title">In scope</div><ul>{(data.boundarySummary?.validatedBoundary || []).map((item) => <li key={item}>{item}</li>)}</ul><div className="actions-row">{(data.validatedActionTypes || []).map((action) => <Pill key={action}>{action}</Pill>)}</div></div>
                  <div className="boundary-card boundary-out"><div className="boundary-title">Out of scope</div><ul>{(data.boundarySummary?.outOfScope || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <SourceMeta items={[{ label: 'Boundary summary', path: data.boundarySummary?.source }]} title="Source files" />
                  <div className="boundary-footnote">{data.boundarySummary?.overviewExcerpt || 'Boundary summary unavailable.'}</div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
