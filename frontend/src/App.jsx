import React, { useEffect, useMemo, useState } from 'react';

const tabs = [{ id: 'rules' }, { id: 'profiles' }, { id: 'targets' }];

const messages = {
  zh: {
    tabs: { rules: '规则', profiles: 'OCR 配置', targets: '目标' },
    heroBadge: '已验证的控件定向路径',
    heroTitle: 'auto-sp rule engine',
    heroDesc:
      '用于展示已验证仓库路径的本地只读仪表盘。它直接从当前仓库读取真实的目标、OCR 配置、规则、场景、最近运行记录和安全边界说明。',
    stats: {
      validatedActions: '已验证动作',
      targets: '目标',
      profiles: 'OCR 配置',
      recentRuns: '最近运行',
      derivedFromLogs: '来自证据日志',
      targetBundles: '目标包',
      readonlyProfiles: '只读 OCR 配置视图',
      noRunLogs: '暂无运行日志',
      latest: '最新',
    },
    actions: { startPipeline: '启动流程', editConfigs: '编辑配置' },
    searchPlaceholder: '搜索规则、目标、配置、场景',
    loadingTitle: '正在加载仪表盘',
    loadingDesc: '正在通过本地只读 API 读取仓库文件。',
    unavailableTitle: '仪表盘不可用',
    partialRepo: '检测到部分仓库状态异常',
    shellFilters: {
      object: '对象',
      target: '目标',
      profile: 'OCR 配置',
      scenario: '场景',
      runStatus: '运行状态',
      sourceFile: '源文件',
      all: '全部',
      rules: '规则',
      profiles: '配置',
      targets: '目标',
      scenarios: '场景',
      runs: '运行',
    },
    sections: {
      pipelineOverview: '流程概览',
      pipelineDesc: '这是已验证路径的只读前端。本阶段不会触发脚本，也不会修改文件。',
      repositoryData: '仓库数据',
      repositoryDataDesc: '从真实仓库文件渲染规则、OCR 配置和目标包。',
      scenarios: '场景',
      scenariosDesc: '展示一个配置驱动多个已验证目标的仓库级场景示例。',
      health: '仓库与数据健康度',
      healthDesc: '已接入仓库数据的只读健康快照。',
      recentRuns: '最近运行',
      recentRunsDesc: '从仓库中的真实示例日志渲染最近证据。',
      runDetail: '运行详情',
      runDetailDesc: '当前选中运行记录的只读详情视图。',
      boundary: '边界与状态',
      boundaryDesc: '已验证范围、安全动作，以及哪些内容仍明确保持只读。',
    },
    pipeline: ['截图', 'OCR', '归一化', '规则', 'AHK 控件写入'],
    detail: {
      summary: '摘要',
      related: '关联',
      source: '来源',
      evidence: '证据',
      sourceFiles: '源文件',
      objectGraph: '对象关系图',
      current: '当前对象',
      upstream: '上游',
      downstream: '下游',
      noUpstream: '没有上游关联。',
      noDownstream: '没有下游关联。',
      noEvidence: '没有关联证据。',
      relatedObjects: '关联对象',
      relatedRuns: '关联运行',
      recentRuns: '最近关联运行',
      evidenceFromRuns: '来自运行的证据',
      groupedEvidenceEmpty: '没有可分组的证据。',
      noRelatedObjects: '没有关联对象。',
      noRelatedRunsRule: '没有命中该规则的最近运行。',
      noRelatedRunsProfile: '没有引用该 OCR 配置的最近运行。',
      noRelatedRunsTarget: '没有解析到该目标的最近运行。',
      noRelatedRunsScenario: '当前示例日志中没有相关最近运行。',
      noEvidenceRuns: '关联运行中没有证据文件。',
      noEvidenceRunDetail: '没有找到相关示例证据文件。',
      scenarioRules: '场景规则',
      boundarySource: '边界说明',
      inScope: '范围内',
      outOfScope: '范围外',
      copied: '已复制',
      copy: '复制',
      na: '无',
      none: '无',
      unknown: '未知',
      noMatchConfig: '无匹配配置',
      detailWillAppearRule: '规则详情会显示在这里。',
      detailWillAppearProfile: 'OCR 配置详情会显示在这里。',
      detailWillAppearTarget: '目标详情会显示在这里。',
      detailWillAppearScenario: '场景详情会显示在这里。',
      detailWillAppearRun: '请选择一条最近运行以查看其 OCR 和验证详情。',
      noRules: '没有可用规则',
      noRulesDesc: '当前仓库状态下没有找到规则定义。',
      noProfiles: '没有可用 OCR 配置',
      noProfilesDesc: '当前筛选条件下没有匹配的 OCR 配置示例。',
      noTargets: '没有可用目标',
      noTargetsDesc: '当前筛选条件下没有匹配的目标包示例。',
      noScenarios: '没有可用场景',
      noScenariosDesc: '当前筛选条件下没有匹配的场景示例。',
      noRuns: '没有最近运行',
      noRunsDesc: '当前筛选条件下没有匹配的最近运行。',
      noScenarioDesc: '没有提供场景描述。',
    },
    fields: {
      resolvedTarget: '解析目标',
      resolvedProfile: '解析 OCR 配置',
      roi: 'ROI',
      confirm: '确认帧数',
      preprocess: '预处理',
      normalize: '归一化',
      window: '窗口',
      control: '控件',
      process: '进程',
      targetFile: '目标文件',
      matchedRule: '命中规则',
      target: '目标',
      profile: 'OCR 配置',
      screenshotPath: '截图路径',
      rawOcr: '原始 OCR',
      normalizedOcr: '归一化 OCR',
      validationResult: '验证结果',
      targets: '目标',
      profiles: '配置',
      time: '时间',
      rule: '规则',
      sourceLog: '源日志',
      screenshot: '截图',
      ruleSource: '规则来源',
      profileSource: '配置来源',
      targetSource: '目标来源',
      scenarioSource: '场景来源',
      runLog: '运行日志',
    },
    status: {
      matched: '已命中',
      dryRun: '演练',
      skipped: '已跳过',
      observed: '已观察',
      matchedNoWrite: '已命中未写入',
    },
    evidenceGroups: {
      screenshots: '截图',
      logs: '日志',
      readback: '回读',
      sourceConfig: '源配置',
      relatedNotes: '相关说明',
      otherEvidence: '其他证据',
    },
  },
  en: {
    tabs: { rules: 'Rules', profiles: 'OCR profiles', targets: 'Targets' },
    heroBadge: 'Validated control-targeted path',
    heroTitle: 'auto-sp rule engine',
    heroDesc:
      'Minimal local dashboard for the validated repository path. It reads real targets, OCR profiles, rules, scenarios, recent runs, and safety notes directly from this repository.',
    stats: {
      validatedActions: 'Validated actions',
      targets: 'Targets',
      profiles: 'OCR profiles',
      recentRuns: 'Recent runs',
      derivedFromLogs: 'derived from evidence logs',
      targetBundles: 'target bundles',
      readonlyProfiles: 'read-only OCR config views',
      noRunLogs: 'no run logs',
      latest: 'latest',
    },
    actions: { startPipeline: 'Start pipeline', editConfigs: 'Edit configs' },
    searchPlaceholder: 'Search rules, targets, profiles, scenarios',
    loadingTitle: 'Loading dashboard',
    loadingDesc: 'Reading repository files through the local read-only API.',
    unavailableTitle: 'Dashboard unavailable',
    partialRepo: 'Partial repo state detected',
    shellFilters: {
      object: 'Object',
      target: 'Target',
      profile: 'OCR profile',
      scenario: 'Scenario',
      runStatus: 'Run status',
      sourceFile: 'Source file',
      all: 'All',
      rules: 'Rules',
      profiles: 'Profiles',
      targets: 'Targets',
      scenarios: 'Scenarios',
      runs: 'Runs',
    },
    sections: {
      pipelineOverview: 'Pipeline overview',
      pipelineDesc: 'Read-only frontend for the verified path. This phase does not trigger scripts or mutate files.',
      repositoryData: 'Repository data',
      repositoryDataDesc: 'Rules, OCR profiles, and target bundles rendered from real repository files.',
      scenarios: 'Scenarios',
      scenariosDesc: 'Repository-level scenario examples showing one config driving validated targets.',
      health: 'Repo and data health',
      healthDesc: 'Read-only health snapshot of connected repository data.',
      recentRuns: 'Recent runs',
      recentRunsDesc: 'Recent evidence rendered from real example logs in this repository.',
      runDetail: 'Run detail',
      runDetailDesc: 'Read-only detail view for the selected recent run.',
      boundary: 'Boundary and status',
      boundaryDesc: 'Validated scope, safe actions, and what stays intentionally read-only.',
    },
    pipeline: ['Capture', 'OCR', 'Normalize', 'Rules', 'AHK control write'],
    detail: {
      summary: 'Summary',
      related: 'Related',
      source: 'Source',
      evidence: 'Evidence',
      sourceFiles: 'Source files',
      objectGraph: 'Object graph',
      current: 'Current',
      upstream: 'Upstream',
      downstream: 'Downstream',
      noUpstream: 'No upstream links.',
      noDownstream: 'No downstream links.',
      noEvidence: 'No linked evidence.',
      relatedObjects: 'Related objects',
      relatedRuns: 'Related runs',
      recentRuns: 'Related recent runs',
      evidenceFromRuns: 'Evidence from runs',
      groupedEvidenceEmpty: 'No grouped evidence available.',
      noRelatedObjects: 'No related objects.',
      noRelatedRunsRule: 'No recent runs matched this rule.',
      noRelatedRunsProfile: 'No recent runs reference this OCR profile.',
      noRelatedRunsTarget: 'No recent runs resolve to this target.',
      noRelatedRunsScenario: 'No related recent runs were found in the current example logs.',
      noEvidenceRuns: 'No evidence files linked from related runs.',
      noEvidenceRunDetail: 'No related example evidence files were found.',
      scenarioRules: 'Scenario rules',
      boundarySource: 'Boundary summary',
      inScope: 'In scope',
      outOfScope: 'Out of scope',
      copied: 'Copied',
      copy: 'Copy',
      na: 'n/a',
      none: 'none',
      unknown: 'unknown',
      noMatchConfig: 'No match config',
      detailWillAppearRule: 'Rule details will appear here.',
      detailWillAppearProfile: 'OCR profile details will appear here.',
      detailWillAppearTarget: 'Target details will appear here.',
      detailWillAppearScenario: 'Scenario details will appear here.',
      detailWillAppearRun: 'Select a recent run to inspect its OCR and validation details.',
      noRules: 'No rules available',
      noRulesDesc: 'No rule definitions were found in the current repository state.',
      noProfiles: 'No OCR profiles available',
      noProfilesDesc: 'No OCR profile examples matched the current filters.',
      noTargets: 'No targets available',
      noTargetsDesc: 'No target bundle examples matched the current filters.',
      noScenarios: 'No scenarios available',
      noScenariosDesc: 'No scenario examples matched the current filters.',
      noRuns: 'No recent runs',
      noRunsDesc: 'No recent runs matched the current filters.',
      noScenarioDesc: 'No scenario description provided.',
    },
    fields: {
      resolvedTarget: 'Resolved target',
      resolvedProfile: 'Resolved OCR profile',
      roi: 'ROI',
      confirm: 'Confirm',
      preprocess: 'Preprocess',
      normalize: 'Normalize',
      window: 'Window',
      control: 'Control',
      process: 'Process',
      targetFile: 'Target file',
      matchedRule: 'Matched rule',
      target: 'Target',
      profile: 'OCR profile',
      screenshotPath: 'Screenshot path',
      rawOcr: 'Raw OCR',
      normalizedOcr: 'Normalized OCR',
      validationResult: 'Validation result',
      targets: 'Targets',
      profiles: 'Profiles',
      time: 'Time',
      rule: 'Rule',
      sourceLog: 'Source log',
      screenshot: 'Screenshot',
      ruleSource: 'Rule source',
      profileSource: 'Profile source',
      targetSource: 'Target source',
      scenarioSource: 'Scenario source',
      runLog: 'Run log',
    },
    status: {
      matched: 'matched',
      dryRun: 'dry-run',
      skipped: 'skipped',
      observed: 'observed',
      matchedNoWrite: 'matched-no-write',
    },
    evidenceGroups: {
      screenshots: 'screenshots',
      logs: 'logs',
      readback: 'readback',
      sourceConfig: 'source config',
      relatedNotes: 'related notes',
      otherEvidence: 'other evidence',
    },
  },
};

const toneFor = (status) =>
  status === 'matched' || status === 'matched-no-write'
    ? 'success'
    : status === 'dry-run'
      ? 'muted'
      : status === 'skipped'
        ? 'warning'
        : 'default';

const timeLabel = (timestamp) =>
  !timestamp || timestamp.length < 15 ? 'unknown' : `${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}`;

const truncate = (text, max = 220) => (!text ? 'n/a' : text.length > max ? `${text.slice(0, max)}...` : text);

function evidenceType(item) {
  const path = item?.path || item?.id || item?.label || '';
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

function relatedDocsFor(objectType, object) {
  if (!object) return [];
  const common = [
    { label: 'docs/overview.md', path: 'docs/overview.md' },
    { label: 'docs/quickstart-notepad.md', path: 'docs/quickstart-notepad.md' },
  ];
  if (objectType === 'rule') {
    return [
      ...common,
      { label: 'notes/phase3-rule-engine.md', path: 'notes/phase3-rule-engine.md' },
      { label: 'notes/phase3-validation-results.md', path: 'notes/phase3-validation-results.md' },
    ];
  }
  if (objectType === 'profile') {
    return [
      ...common,
      { label: 'notes/ocr-phase-architecture.md', path: 'notes/ocr-phase-architecture.md' },
      { label: 'notes/ocr-phase-validation-results.md', path: 'notes/ocr-phase-validation-results.md' },
    ];
  }
  if (objectType === 'target') {
    return [
      ...common,
      { label: 'notes/phase4-target-override.md', path: 'notes/phase4-target-override.md' },
      { label: 'notes/phase4-validation-results.md', path: 'notes/phase4-validation-results.md' },
    ];
  }
  if (objectType === 'scenario') {
    return [
      { label: 'docs/validation-path.md', path: 'docs/validation-path.md' },
      { label: 'notes/phase4-public-examples.md', path: 'notes/phase4-public-examples.md' },
      { label: 'notes/phase4-validation-results.md', path: 'notes/phase4-validation-results.md' },
    ];
  }
  if (objectType === 'run') {
    const prefix = object.id || '';
    if (prefix.startsWith('phase2')) return [{ label: 'notes/phase2-validation-results.md', path: 'notes/phase2-validation-results.md' }];
    if (prefix.startsWith('phase3')) return [{ label: 'notes/phase3-validation-results.md', path: 'notes/phase3-validation-results.md' }];
    if (prefix.startsWith('phase4')) return [{ label: 'notes/phase4-validation-results.md', path: 'notes/phase4-validation-results.md' }];
    if (prefix.startsWith('ocr-phase')) return [{ label: 'notes/ocr-phase-validation-results.md', path: 'notes/ocr-phase-validation-results.md' }];
    return common;
  }
  return common;
}

function relatedExamplesFor(objectType, object) {
  if (!object) return [];
  if (objectType === 'rule') {
    return object.actionType ? [{ label: `examples/${object.actionType}.notepad.json`, path: `examples/${object.actionType}.notepad.json` }] : [];
  }
  if (objectType === 'profile' || objectType === 'target' || objectType === 'scenario') {
    return object.sourceFile ? [{ label: object.sourceFile, path: object.sourceFile }] : [];
  }
  if (objectType === 'run') {
    return object.sourceFile ? [{ label: object.sourceFile, path: object.sourceFile }] : [];
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

function localizedStatus(status, m) {
  if (status === 'matched') return m.status.matched;
  if (status === 'dry-run') return m.status.dryRun;
  if (status === 'skipped') return m.status.skipped;
  if (status === 'matched-no-write') return m.status.matchedNoWrite;
  return m.status.observed;
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

function StatCard({ label, value, hint }) {
  return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{hint ? <div className="stat-hint">{hint}</div> : null}</div>;
}

function SectionHeader({ title, description }) {
  return <div className="section-header"><h2>{title}</h2><p>{description}</p></div>;
}

function Pill({ children, tone = 'default' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function EmptyState({ title, description }) {
  return <div className="empty-state"><div className="empty-title">{title}</div><div className="empty-description">{description}</div></div>;
}

function JsonErrorList({ errors, title }) {
  if (!errors?.length) return null;
  return <div className="error-box"><div className="error-title">{title}</div><ul>{errors.map((error) => <li key={`${error.path}:${error.message}`}><strong>{error.path}</strong>: {error.message}</li>)}</ul></div>;
}

function SourcePath({ path, copyLabel, copiedLabel, naLabel }) {
  const [copied, setCopied] = useState(false);
  async function copyPath() {
    if (!path || !navigator.clipboard) return;
    await navigator.clipboard.writeText(path);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return <div className="source-row"><code className="source-path">{path || naLabel}</code>{path ? <button type="button" className="copy-button" onClick={copyPath}>{copied ? copiedLabel : copyLabel}</button> : null}</div>;
}

function SourceMeta({ items, title, copyLabel, copiedLabel, naLabel }) {
  const normalized = (items || []).filter((item) => item?.path);
  if (!normalized.length) return null;
  return <div className="detail-block"><strong>{title}</strong><div className="detail-list">{normalized.map((item) => <div key={`${item.label}:${item.path}`} className="source-meta"><div className="source-label">{item.label}</div><SourcePath path={item.path} copyLabel={copyLabel} copiedLabel={copiedLabel} naLabel={naLabel} /></div>)}</div></div>;
}

function RelatedLinks({ title, items, onSelect, emptyText }) {
  return <div className="detail-block"><strong>{title}</strong>{items?.length ? <div className="detail-list">{items.map((item) => <button key={item.id || item.label} type="button" className="linked-run" onClick={() => onSelect?.(item)}><span>{item.label}</span>{item.meta ? <span>{item.meta}</span> : null}</button>)}</div> : <div className="detail-empty">{emptyText}</div>}</div>;
}

function DetailField({ label, children }) {
  return <div className="detail-row"><div className="detail-row-title">{label}</div><div className="detail-row-body">{children}</div></div>;
}

function DetailSection({ title, children }) {
  return <div className="detail-section"><div className="detail-section-title">{title}</div>{children}</div>;
}

function Breadcrumbs({ items, onSelect }) {
  const visible = (items || []).filter(Boolean);
  if (!visible.length) return null;
  return <div className="breadcrumbs">{visible.map((item, index) => <React.Fragment key={`${item.id || item.label}-${index}`}><button type="button" className={item.onClick || onSelect ? 'breadcrumb-link' : 'breadcrumb-static'} onClick={() => (item.onClick ? item.onClick() : onSelect?.(item))} disabled={!item.onClick && !onSelect}>{item.label}</button>{index < visible.length - 1 ? <span className="breadcrumb-sep">/</span> : null}</React.Fragment>)}</div>;
}

function RelationshipPanel({ current, upstream = [], downstream = [], evidence = [], onSelect, labels }) {
  return (
    <div className="detail-block">
      <strong>{labels.objectGraph}</strong>
      <div className="graph-grid">
        <div className="graph-card">
          <div className="graph-title">{labels.current}</div>
          <div className="graph-item graph-current">{current?.label || labels.na}</div>
        </div>
        <div className="graph-card">
          <div className="graph-title">{labels.upstream}</div>
          {(upstream || []).length ? (upstream || []).map((item) => <button key={item.id || item.label} type="button" className="graph-item graph-link" onClick={() => onSelect?.(item)}>{item.label}</button>) : <div className="graph-empty">{labels.noUpstream}</div>}
        </div>
        <div className="graph-card">
          <div className="graph-title">{labels.downstream}</div>
          {(downstream || []).length ? (downstream || []).map((item) => <button key={item.id || item.label} type="button" className="graph-item graph-link" onClick={() => onSelect?.(item)}>{item.label}</button>) : <div className="graph-empty">{labels.noDownstream}</div>}
        </div>
        <div className="graph-card">
          <div className="graph-title">{labels.evidence}</div>
          {(evidence || []).length ? (evidence || []).map((item) => <div key={item.id || item.label} className="graph-item">{item.label}</div>) : <div className="graph-empty">{labels.noEvidence}</div>}
        </div>
      </div>
    </div>
  );
}

function EvidenceGroups({ items, labels, copyLabel, copiedLabel, naLabel }) {
  const groups = groupEvidence(items);
  if (!groups.length) return <div className="detail-empty">{labels.groupedEvidenceEmpty}</div>;
  return <div className="evidence-groups">{groups.map((group) => <div key={group.label} className="evidence-group"><div className="evidence-title">{labels[group.label] || group.label}</div><div className="detail-list">{group.entries.map((item) => <div key={`${group.label}:${item.path || item.id || item.label}`} className="source-meta"><div className="source-label">{item.label}</div><SourcePath path={item.path || item.id} copyLabel={copyLabel} copiedLabel={copiedLabel} naLabel={naLabel} /></div>)}</div></div>)}</div>;
}

export default function App() {
  const [lang, setLang] = useState('zh');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [search, setSearch] = useState('');
  const [selectedRuleName, setSelectedRuleName] = useState(null);
  const [selectedProfileName, setSelectedProfileName] = useState(null);
  const [selectedTargetName, setSelectedTargetName] = useState(null);
  const [selectedScenarioName, setSelectedScenarioName] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [filters, setFilters] = useState({
    objectType: 'all',
    target: 'all',
    profile: 'all',
    scenario: 'all',
    runStatus: 'all',
    sourceFile: 'all',
  });
  const [preset, setPreset] = useState('custom');
  const m = messages[lang];

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
  const sourceFiles = useMemo(
    () =>
      [...new Set([...targets, ...profiles, ...rules, ...scenarios, ...recentRuns].map((item) => item.sourceFile).filter(Boolean))].sort(),
    [targets, profiles, rules, scenarios, recentRuns]
  );
  const runStatuses = useMemo(() => [...new Set(recentRuns.map((run) => run.status).filter(Boolean))].sort(), [recentRuns]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesSearch = !q || [rule.name, rule.actionType, rule.targetRef, rule.ocrProfileRef, rule.sourceFile, matchLabel(rule.match), ...(rule.scenarioNames || [])].join(' ').toLowerCase().includes(q);
      const matchesType = filters.objectType === 'all' || filters.objectType === 'rules';
      const matchesTarget = filters.target === 'all' || (rule.targetRef || targets[0]?.name) === filters.target;
      const matchesProfile = filters.profile === 'all' || (rule.ocrProfileRef || profiles[0]?.name) === filters.profile;
      const matchesScenario = filters.scenario === 'all' || (rule.scenarioNames || []).includes(filters.scenario);
      const matchesSource = filters.sourceFile === 'all' || rule.sourceFile === filters.sourceFile;
      return matchesSearch && matchesType && matchesTarget && matchesProfile && matchesScenario && matchesSource;
    });
  }, [rules, search, filters, targets, profiles]);

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'profiles';
        const matchesProfile = filters.profile === 'all' || profile.name === filters.profile;
        const matchesSource = filters.sourceFile === 'all' || profile.sourceFile === filters.sourceFile;
        return matchesType && matchesProfile && matchesSource;
      }),
    [profiles, filters]
  );

  const filteredTargets = useMemo(
    () =>
      targets.filter((target) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'targets';
        const matchesTarget = filters.target === 'all' || target.name === filters.target;
        const matchesSource = filters.sourceFile === 'all' || target.sourceFile === filters.sourceFile;
        return matchesType && matchesTarget && matchesSource;
      }),
    [targets, filters]
  );

  const filteredScenarios = useMemo(
    () =>
      scenarios.filter((scenario) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'scenarios';
        const matchesScenario = filters.scenario === 'all' || scenario.name === filters.scenario;
        const matchesTarget = filters.target === 'all' || scenario.targetNames.includes(filters.target);
        const matchesProfile = filters.profile === 'all' || scenario.profileNames.includes(filters.profile);
        const matchesSource = filters.sourceFile === 'all' || scenario.sourceFile === filters.sourceFile;
        return matchesType && matchesScenario && matchesTarget && matchesProfile && matchesSource;
      }),
    [scenarios, filters]
  );

  const filteredRuns = useMemo(
    () =>
      recentRuns.filter((run) => {
        const matchesType = filters.objectType === 'all' || filters.objectType === 'runs';
        const matchesStatus = filters.runStatus === 'all' || run.status === filters.runStatus;
        const matchesTarget = filters.target === 'all' || targets.find((target) => target.target?.window_title === run.targetWindow)?.name === filters.target;
        const matchesProfile = filters.profile === 'all' || run.ocrProfileUsed === filters.profile;
        const matchesScenario = filters.scenario === 'all' || (run.scenarioNames || []).includes(filters.scenario);
        const matchesSource = filters.sourceFile === 'all' || run.sourceFile === filters.sourceFile;
        return matchesType && matchesStatus && matchesTarget && matchesProfile && matchesScenario && matchesSource;
      }),
    [recentRuns, filters, targets]
  );

  const filterCounts = {
    rules: filteredRules.length,
    targets: filteredTargets.length,
    profiles: filteredProfiles.length,
    scenarios: filteredScenarios.length,
    runs: filteredRuns.length,
  };
  const activeFilterEntries = Object.entries(filters).filter(([, value]) => value !== 'all');

  const selectedRule = filteredRules.find((rule) => rule.name === selectedRuleName) || rules.find((rule) => rule.name === selectedRuleName) || filteredRules[0] || rules[0] || null;
  const selectedProfile = filteredProfiles.find((profile) => profile.name === selectedProfileName) || profiles.find((profile) => profile.name === selectedProfileName) || filteredProfiles[0] || profiles[0] || null;
  const selectedTarget = filteredTargets.find((target) => target.name === selectedTargetName) || targets.find((target) => target.name === selectedTargetName) || filteredTargets[0] || targets[0] || null;
  const selectedScenario = filteredScenarios.find((scenario) => scenario.name === selectedScenarioName) || scenarios.find((scenario) => scenario.name === selectedScenarioName) || filteredScenarios[0] || scenarios[0] || null;
  const selectedRun = filteredRuns.find((run) => run.id === selectedRunId) || recentRuns.find((run) => run.id === selectedRunId) || filteredRuns[0] || recentRuns[0] || null;

  const selectedRuleTarget = targets.find((target) => target.name === selectedRule?.targetRef) || targets[0] || null;
  const selectedRuleProfile = profiles.find((profile) => profile.name === selectedRule?.ocrProfileRef) || profiles[0] || null;
  const selectedRuleScenarios = scenarios.filter((scenario) => scenario.rules?.some((rule) => rule.name === selectedRule?.name));
  const selectedRuleRuns = recentRuns.filter((run) => run.ruleName === selectedRule?.name);

  const selectedTargetRules = rules.filter((rule) => (targets.find((target) => target.name === rule.targetRef)?.name || targets[0]?.name) === selectedTarget?.name);
  const selectedTargetRuns = recentRuns.filter((run) => run.targetWindow === selectedTarget?.target?.window_title);

  const selectedProfileRules = rules.filter((rule) => (profiles.find((profile) => profile.name === rule.ocrProfileRef)?.name || profiles[0]?.name) === selectedProfile?.name);
  const selectedProfileRuns = recentRuns.filter((run) => run.ocrProfileUsed === selectedProfile?.name);

  const selectedScenarioRuns = recentRuns.filter((run) => (run.scenarioNames || []).includes(selectedScenario?.name));

  const selectedRunRule = rules.find((rule) => rule.name === selectedRun?.ruleName) || null;
  const selectedRunTarget = targets.find((target) => target.target?.window_title === selectedRun?.targetWindow) || targets.find((target) => target.name === selectedRunRule?.targetRef) || null;
  const selectedRunProfile = profiles.find((profile) => profile.name === selectedRun?.ocrProfileUsed) || profiles.find((profile) => profile.name === selectedRunRule?.ocrProfileRef) || null;
  const selectedRunScenarios = scenarios.filter((scenario) => (selectedRun?.scenarioNames || []).includes(scenario.name));

  const openRule = (name) => {
    setActiveTab('rules');
    setSelectedRuleName(name);
  };
  const openProfile = (name) => {
    setActiveTab('profiles');
    setSelectedProfileName(name);
  };
  const openTarget = (name) => {
    setActiveTab('targets');
    setSelectedTargetName(name);
  };
  const openScenario = (name) => setSelectedScenarioName(name);
  const openRun = (id) => setSelectedRunId(id);

  function applyPreset(nextPreset) {
    setPreset(nextPreset);
    if (nextPreset === 'all-rules') {
      setActiveTab('rules');
      setFilters((current) => ({ ...current, objectType: 'rules', target: 'all', profile: 'all', scenario: 'all', runStatus: 'all', sourceFile: 'all' }));
      return;
    }
    if (nextPreset === 'matched-runs') {
      setFilters((current) => ({ ...current, objectType: 'runs', runStatus: 'matched', target: 'all', profile: 'all', scenario: 'all', sourceFile: 'all' }));
      return;
    }
    if (nextPreset === 'multi-target-scenarios') {
      setFilters((current) => ({ ...current, objectType: 'scenarios', target: 'all', profile: 'all', scenario: 'single-config-multi-target', runStatus: 'all', sourceFile: 'all' }));
      return;
    }
    if (nextPreset === 'roi-profiles') {
      setActiveTab('profiles');
      setFilters((current) => ({ ...current, objectType: 'profiles', target: 'all', profile: 'roi-profile', scenario: 'all', runStatus: 'all', sourceFile: 'all' }));
      return;
    }
    if (nextPreset === 'recent-evidence') {
      setFilters((current) => ({ ...current, objectType: 'runs', runStatus: 'all', target: 'all', profile: 'all', scenario: 'all', sourceFile: 'examples/logs/phase4-multi-target.json' }));
      return;
    }
    if (nextPreset === 'docs-linked') {
      setFilters((current) => ({ ...current, objectType: 'all', target: 'all', profile: 'all', scenario: 'all', runStatus: 'all', sourceFile: 'all' }));
      return;
    }
    setFilters({ objectType: 'all', target: 'all', profile: 'all', scenario: 'all', runStatus: 'all', sourceFile: 'all' });
  }

  function handleObjectLink(item) {
    if (!item?.id) return;
    if (item.id.startsWith('rule:')) openRule(item.id.replace('rule:', ''));
    if (item.id.startsWith('target:')) openTarget(item.id.replace('target:', ''));
    if (item.id.startsWith('profile:')) openProfile(item.id.replace('profile:', ''));
    if (item.id.startsWith('scenario:')) openScenario(item.id.replace('scenario:', ''));
    if (item.id.startsWith('run:')) openRun(item.id.replace('run:', ''));
  }

  const globalBreadcrumbs = [
    { label: 'dashboard', onClick: () => {} },
    activeTab ? { label: activeTab } : null,
    activeTab === 'rules' && selectedRule ? { label: selectedRule.name, id: `rule:${selectedRule.name}` } : null,
    activeTab === 'profiles' && selectedProfile ? { label: selectedProfile.name, id: `profile:${selectedProfile.name}` } : null,
    activeTab === 'targets' && selectedTarget ? { label: selectedTarget.name, id: `target:${selectedTarget.name}` } : null,
    selectedScenario ? { label: `scenario:${selectedScenario.name}`, id: `scenario:${selectedScenario.name}` } : null,
    selectedRun ? { label: `run:${selectedRun.id}`, id: `run:${selectedRun.id}` } : null,
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <div className="page">
        <header className="hero">
          <div className="hero-copy">
            <div className="hero-badge">{m.heroBadge}</div>
            <h1>{m.heroTitle}</h1>
            <p>{m.heroDesc}</p>
          </div>
          <div className="lang-switch" role="group" aria-label="language switch">
            <button type="button" className={lang === 'zh' ? 'lang-button active' : 'lang-button'} onClick={() => setLang('zh')}>中文</button>
            <button type="button" className={lang === 'en' ? 'lang-button active' : 'lang-button'} onClick={() => setLang('en')}>EN</button>
          </div>
          <div className="hero-grid">
            <StatCard label={m.stats.validatedActions} value={data?.validatedActionTypes?.length ?? 0} hint={m.stats.derivedFromLogs} />
            <StatCard label={m.stats.targets} value={targets.length} hint={m.stats.targetBundles} />
            <StatCard label={m.stats.profiles} value={profiles.length} hint={m.stats.readonlyProfiles} />
            <StatCard label={m.stats.recentRuns} value={recentRuns.length} hint={recentRuns[0] ? `${m.stats.latest} ${timeLabel(recentRuns[0].timestamp)}` : m.stats.noRunLogs} />
          </div>
        </header>

        <div className="info-strip">
          <div className="search-panel">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={m.searchPlaceholder} />
          </div>
          <div className="placeholder-actions">
            <button type="button" disabled>{m.actions.startPipeline}</button>
            <button type="button" disabled>{m.actions.editConfigs}</button>
          </div>
        </div>

        <section className="shell-panel">
          <Breadcrumbs items={globalBreadcrumbs} onSelect={handleObjectLink} />
          <div className="preset-row">
            {[
              ['all-rules', 'All rules'],
              ['matched-runs', 'Matched runs'],
              ['multi-target-scenarios', 'Multi-target scenarios'],
              ['roi-profiles', 'ROI OCR profiles'],
              ['recent-evidence', 'Recent evidence'],
              ['docs-linked', 'Docs-linked objects'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={preset === id ? 'preset-button active' : 'preset-button'} onClick={() => applyPreset(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="filter-grid">
            <label><span>{m.shellFilters.object}</span><select value={filters.objectType} onChange={(event) => setFilters((current) => ({ ...current, objectType: event.target.value }))}><option value="all">{m.shellFilters.all}</option><option value="rules">{m.shellFilters.rules}</option><option value="profiles">{m.shellFilters.profiles}</option><option value="targets">{m.shellFilters.targets}</option><option value="scenarios">{m.shellFilters.scenarios}</option><option value="runs">{m.shellFilters.runs}</option></select></label>
            <label><span>{m.shellFilters.target}</span><select value={filters.target} onChange={(event) => setFilters((current) => ({ ...current, target: event.target.value }))}><option value="all">{m.shellFilters.all}</option>{targets.map((target) => <option key={target.name} value={target.name}>{target.name}</option>)}</select></label>
            <label><span>{m.shellFilters.profile}</span><select value={filters.profile} onChange={(event) => setFilters((current) => ({ ...current, profile: event.target.value }))}><option value="all">{m.shellFilters.all}</option>{profiles.map((profile) => <option key={profile.name} value={profile.name}>{profile.name}</option>)}</select></label>
            <label><span>{m.shellFilters.scenario}</span><select value={filters.scenario} onChange={(event) => setFilters((current) => ({ ...current, scenario: event.target.value }))}><option value="all">{m.shellFilters.all}</option>{scenarios.map((scenario) => <option key={scenario.name} value={scenario.name}>{scenario.name}</option>)}</select></label>
            <label><span>{m.shellFilters.runStatus}</span><select value={filters.runStatus} onChange={(event) => setFilters((current) => ({ ...current, runStatus: event.target.value }))}><option value="all">{m.shellFilters.all}</option>{runStatuses.map((status) => <option key={status} value={status}>{localizedStatus(status, m)}</option>)}</select></label>
            <label><span>{m.shellFilters.sourceFile}</span><select value={filters.sourceFile} onChange={(event) => setFilters((current) => ({ ...current, sourceFile: event.target.value }))}><option value="all">{m.shellFilters.all}</option>{sourceFiles.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
          </div>
          <div className="count-row">
            <div className="count-chip">Rules {filterCounts.rules}</div>
            <div className="count-chip">Targets {filterCounts.targets}</div>
            <div className="count-chip">Profiles {filterCounts.profiles}</div>
            <div className="count-chip">Scenarios {filterCounts.scenarios}</div>
            <div className="count-chip">Runs {filterCounts.runs}</div>
          </div>
          <div className="count-row">
            <div className="count-chip">Preset {preset}</div>
            {activeFilterEntries.length ? activeFilterEntries.map(([key, value]) => <div key={key} className="count-chip">{key}: {value}</div>) : <div className="count-chip">No active filters</div>}
          </div>
        </section>

        {loading ? <EmptyState title={m.loadingTitle} description={m.loadingDesc} /> : null}
        {error ? <EmptyState title={m.unavailableTitle} description={error} /> : null}

        {!loading && !error && data ? <>
          <JsonErrorList errors={data.loadErrors} title={m.partialRepo} />
          <div className="layout">
            <div className="main-column">
              <section className="panel">
                <SectionHeader title={m.sections.pipelineOverview} description={m.sections.pipelineDesc} />
                <div className="pipeline-diagram">{m.pipeline.map((step) => <div key={step}>{step}</div>)}</div>
              </section>

              <section className="panel">
                <SectionHeader title={m.sections.repositoryData} description={m.sections.repositoryDataDesc} />
                <div className="tabs">{tabs.map((tab) => <button key={tab.id} type="button" className={tab.id === activeTab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab.id)}>{m.tabs[tab.id]}</button>)}</div>

                {activeTab === 'rules' && (filteredRules.length ? <div className="split-view">
                  <div className="selector-list">{filteredRules.map((rule) => <button key={`${rule.sourceFile}:${rule.name}`} type="button" className={rule.name === selectedRule?.name ? 'selector-card active' : 'selector-card'} onClick={() => setSelectedRuleName(rule.name)}><div className="selector-title">{rule.name}</div><div className="selector-subtitle">{rule.actionType}</div></button>)}</div>
                  <div className="detail-panel">
                    {selectedRule ? <>
                      <Breadcrumbs items={[
                        selectedRuleScenarios[0] ? { label: selectedRuleScenarios[0].name, id: `scenario:${selectedRuleScenarios[0].name}` } : null,
                        { label: selectedRule.name, id: `rule:${selectedRule.name}` },
                      ]} onSelect={handleObjectLink} />
                      <DetailSection title={m.detail.summary}>
                        <div className="item-topline"><h3>{selectedRule.name}</h3><Pill>{selectedRule.actionType}</Pill></div>
                        <p className="item-subline">{matchLabel(selectedRule.match)}</p>
                        <div className="item-meta"><span>Resolved target: {selectedRuleTarget?.name || selectedRule.targetRef || 'default'}</span><span>Resolved OCR profile: {selectedRuleProfile?.name || selectedRule.ocrProfileRef || 'default'}</span></div>
                      </DetailSection>
                      <DetailSection title={m.detail.related}>
                        <RelatedLinks title={m.detail.relatedObjects} items={[
                          selectedRuleTarget ? { label: `Target: ${selectedRuleTarget.name}`, meta: selectedRuleTarget.target.window_title, id: `target:${selectedRuleTarget.name}` } : null,
                          selectedRuleProfile ? { label: `OCR profile: ${selectedRuleProfile.name}`, meta: profileSummary(selectedRuleProfile)?.confirm, id: `profile:${selectedRuleProfile.name}` } : null,
                          ...selectedRuleScenarios.map((scenario) => ({ label: `Scenario: ${scenario.name}`, meta: `${scenario.ruleCount} rule(s)`, id: `scenario:${scenario.name}` })),
                        ].filter(Boolean)} onSelect={handleObjectLink} emptyText="No related objects." />
                        <RelatedLinks title={m.detail.recentRuns} items={selectedRuleRuns.map((run) => ({ label: run.id, meta: localizedStatus(run.status, m), id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedRunsRule} />
                        <RelationshipPanel
                          current={{ label: `Rule: ${selectedRule.name}` }}
                          upstream={selectedRuleScenarios.map((scenario) => ({ label: `Scenario: ${scenario.name}`, id: `scenario:${scenario.name}` }))}
                          downstream={[
                            selectedRuleTarget ? { label: `Target: ${selectedRuleTarget.name}`, id: `target:${selectedRuleTarget.name}` } : null,
                            selectedRuleProfile ? { label: `OCR profile: ${selectedRuleProfile.name}`, id: `profile:${selectedRuleProfile.name}` } : null,
                            ...selectedRuleRuns.map((run) => ({ label: `Run: ${run.id}`, id: `run:${run.id}` })),
                          ].filter(Boolean)}
                          evidence={selectedRuleRuns.flatMap((run) => (run.relatedEvidence || []).map((item) => ({ label: item.name, id: item.sourceFile }))).slice(0, 4)}
                          onSelect={handleObjectLink}
                          labels={{ ...m.detail, na: m.detail.na }}
                        />
                      </DetailSection>
                      <DetailSection title={m.detail.source}>
                        <SourceMeta items={[
                          { label: m.fields.ruleSource, path: selectedRule.sourceFile },
                          ...relatedDocsFor('rule', selectedRule),
                          ...relatedExamplesFor('rule', selectedRule),
                        ]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                      <DetailSection title={m.detail.evidence}>
                        <EvidenceGroups items={[
                          { label: m.fields.ruleSource, path: selectedRule.sourceFile },
                          ...selectedRuleRuns.flatMap((run) => [
                            run.sourceFile ? { label: `${m.fields.sourceLog} ${run.id}`, path: run.sourceFile } : null,
                            run.screenshotPath ? { label: `${m.fields.screenshot} ${run.id}`, path: run.screenshotPath } : null,
                            ...(run.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile })),
                          ]).filter(Boolean),
                        ]} labels={m.evidenceGroups} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                    </> : <EmptyState title={m.detail.noRules} description={m.detail.detailWillAppearRule} />}
                  </div>
                </div> : <EmptyState title={m.detail.noRules} description={m.detail.noRulesDesc} />)}

                {activeTab === 'profiles' && (filteredProfiles.length ? <div className="split-view">
                  <div className="selector-list">{filteredProfiles.map((profile) => <button key={profile.name} type="button" className={profile.name === selectedProfile?.name ? 'selector-card active' : 'selector-card'} onClick={() => setSelectedProfileName(profile.name)}><div className="selector-title">{profile.name}</div><div className="selector-subtitle">{profileSummary(profile).confirm}</div></button>)}</div>
                  <div className="detail-panel">
                    {selectedProfile ? <>
                      <Breadcrumbs items={[
                        selectedProfileRules[0] ? { label: selectedProfileRules[0].name, id: `rule:${selectedProfileRules[0].name}` } : null,
                        { label: selectedProfile.name, id: `profile:${selectedProfile.name}` },
                      ]} onSelect={handleObjectLink} />
                      <DetailSection title={m.detail.summary}>
                        <div className="item-topline"><h3>{selectedProfile.name}</h3><Pill tone="muted">profile</Pill></div>
                        <div className="kv-grid">
                          <div><strong>ROI</strong><span>{profileSummary(selectedProfile).roi}</span></div>
                          <div><strong>Confirm</strong><span>{profileSummary(selectedProfile).confirm}</span></div>
                          <div><strong>Preprocess</strong><span>{profileSummary(selectedProfile).preprocess}</span></div>
                          <div><strong>Normalize</strong><span>{profileSummary(selectedProfile).normalize}</span></div>
                        </div>
                      </DetailSection>
                      <DetailSection title={m.detail.related}>
                        <RelatedLinks title={m.detail.relatedObjects} items={selectedProfileRules.map((rule) => ({ label: rule.name, meta: rule.actionType, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedObjects} />
                        <RelatedLinks title={m.detail.relatedRuns} items={selectedProfileRuns.map((run) => ({ label: run.id, meta: run.ruleName || localizedStatus(run.status, m), id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedRunsProfile} />
                        <RelationshipPanel
                          current={{ label: `OCR profile: ${selectedProfile.name}` }}
                          upstream={selectedProfileRules.map((rule) => ({ label: `Rule: ${rule.name}`, id: `rule:${rule.name}` })).slice(0, 6)}
                          downstream={selectedProfileRuns.map((run) => ({ label: `Run: ${run.id}`, id: `run:${run.id}` })).slice(0, 6)}
                          evidence={selectedProfileRuns.flatMap((run) => (run.relatedEvidence || []).map((item) => ({ label: item.name, id: item.sourceFile }))).slice(0, 4)}
                          onSelect={handleObjectLink}
                          labels={{ ...m.detail, na: m.detail.na }}
                        />
                      </DetailSection>
                      <DetailSection title={m.detail.source}>
                        <SourceMeta items={[
                          { label: m.fields.profileSource, path: selectedProfile.sourceFile },
                          ...relatedDocsFor('profile', selectedProfile),
                          ...relatedExamplesFor('profile', selectedProfile),
                        ]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                      <DetailSection title={m.detail.evidence}>
                        <EvidenceGroups items={[
                          { label: m.fields.profileSource, path: selectedProfile.sourceFile },
                          ...selectedProfileRuns.flatMap((run) => [
                            run.sourceFile ? { label: `${m.fields.sourceLog} ${run.id}`, path: run.sourceFile } : null,
                            run.screenshotPath ? { label: `${m.fields.screenshot} ${run.id}`, path: run.screenshotPath } : null,
                            ...(run.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile })),
                          ]).filter(Boolean),
                        ]} labels={m.evidenceGroups} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                    </> : <EmptyState title={m.detail.noProfiles} description={m.detail.detailWillAppearProfile} />}
                  </div>
                </div> : <EmptyState title={m.detail.noProfiles} description={m.detail.noProfilesDesc} />)}

                {activeTab === 'targets' && (filteredTargets.length ? <div className="split-view">
                  <div className="selector-list">{filteredTargets.map((target) => <button key={target.name} type="button" className={target.name === selectedTarget?.name ? 'selector-card active' : 'selector-card'} onClick={() => setSelectedTargetName(target.name)}><div className="selector-title">{target.name}</div><div className="selector-subtitle">{target.target.window_title}</div></button>)}</div>
                  <div className="detail-panel">
                    {selectedTarget ? <>
                      <Breadcrumbs items={[
                        { label: selectedTarget.name, id: `target:${selectedTarget.name}` },
                        selectedTargetRuns[0] ? { label: selectedTargetRuns[0].id, id: `run:${selectedTargetRuns[0].id}` } : null,
                      ]} onSelect={handleObjectLink} />
                      <DetailSection title={m.detail.summary}>
                        <div className="item-topline"><h3>{selectedTarget.name}</h3><Pill tone="muted">target</Pill></div>
                        <div className="kv-grid">
                          <div><strong>Window</strong><span>{selectedTarget.target.window_title}</span></div>
                          <div><strong>Control</strong><span>{selectedTarget.control.name}</span></div>
                          <div><strong>Process</strong><span>{selectedTarget.target.process_name}</span></div>
                          <div><strong>Target file</strong><span>{selectedTarget.notes?.target_file || 'n/a'}</span></div>
                        </div>
                      </DetailSection>
                      <DetailSection title={m.detail.related}>
                        <RelatedLinks title={m.detail.relatedObjects} items={selectedTargetRules.map((rule) => ({ label: rule.name, meta: rule.actionType, id: `rule:${rule.name}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedObjects} />
                        <RelatedLinks title={m.detail.relatedRuns} items={selectedTargetRuns.map((run) => ({ label: run.id, meta: run.ruleName || localizedStatus(run.status, m), id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedRunsTarget} />
                        <RelationshipPanel
                          current={{ label: `Target: ${selectedTarget.name}` }}
                          upstream={selectedTargetRules.map((rule) => ({ label: `Rule: ${rule.name}`, id: `rule:${rule.name}` })).slice(0, 6)}
                          downstream={selectedTargetRuns.map((run) => ({ label: `Run: ${run.id}`, id: `run:${run.id}` })).slice(0, 6)}
                          evidence={selectedTargetRuns.flatMap((run) => (run.relatedEvidence || []).map((item) => ({ label: item.name, id: item.sourceFile }))).slice(0, 4)}
                          onSelect={handleObjectLink}
                          labels={{ ...m.detail, na: m.detail.na }}
                        />
                      </DetailSection>
                      <DetailSection title={m.detail.source}>
                        <SourceMeta items={[
                          { label: m.fields.targetSource, path: selectedTarget.sourceFile },
                          ...relatedDocsFor('target', selectedTarget),
                          ...relatedExamplesFor('target', selectedTarget),
                        ]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                      <DetailSection title={m.detail.evidence}>
                        <EvidenceGroups items={[
                          { label: m.fields.targetSource, path: selectedTarget.sourceFile },
                          ...selectedTargetRuns.flatMap((run) => [
                            run.sourceFile ? { label: `${m.fields.sourceLog} ${run.id}`, path: run.sourceFile } : null,
                            run.screenshotPath ? { label: `${m.fields.screenshot} ${run.id}`, path: run.screenshotPath } : null,
                            ...(run.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile })),
                          ]).filter(Boolean),
                        ]} labels={m.evidenceGroups} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                    </> : <EmptyState title={m.detail.noTargets} description={m.detail.detailWillAppearTarget} />}
                  </div>
                </div> : <EmptyState title={m.detail.noTargets} description={m.detail.noTargetsDesc} />)}
              </section>

              <section className="panel">
                <SectionHeader title={m.sections.scenarios} description={m.sections.scenariosDesc} />
                {filteredScenarios.length ? <div className="split-view">
                  <div className="selector-list">{filteredScenarios.map((scenario) => <button key={scenario.name} type="button" className={scenario.name === selectedScenario?.name ? 'selector-card active' : 'selector-card'} onClick={() => setSelectedScenarioName(scenario.name)}><div className="selector-title">{scenario.name}</div><div className="selector-subtitle">{scenario.ruleCount} rule(s)</div></button>)}</div>
                  <div className="detail-panel">
                    {selectedScenario ? <>
                      <Breadcrumbs items={[{ label: selectedScenario.name, id: `scenario:${selectedScenario.name}` }, selectedScenario.rules?.[0] ? { label: selectedScenario.rules[0].name, id: `rule:${selectedScenario.rules[0].name}` } : null]} onSelect={handleObjectLink} />
                      <DetailSection title={m.detail.summary}>
                        <div className="item-topline"><h3>{selectedScenario.name}</h3><Pill tone="muted">scenario</Pill></div>
                        <p className="item-subline">{selectedScenario.description || 'No scenario description provided.'}</p>
                        <div className="item-meta"><span>Targets: {selectedScenario.targetNames.join(', ') || 'default only'}</span><span>Profiles: {selectedScenario.profileNames.join(', ') || 'default only'}</span></div>
                      </DetailSection>
                      <DetailSection title={m.detail.related}>
                        <div className="detail-block"><strong>{m.detail.scenarioRules}</strong><div className="detail-list">{(selectedScenario.rules || []).map((rule) => <button key={rule.name} type="button" className="linked-run" onClick={() => openRule(rule.name)}><span>{rule.name}</span><span>{rule.resolvedTarget} / {rule.resolvedProfile}</span></button>)}</div></div>
                        <RelatedLinks title={m.detail.recentRuns} items={selectedScenarioRuns.map((run) => ({ label: run.id, meta: run.ruleName || localizedStatus(run.status, m), id: `run:${run.id}` }))} onSelect={handleObjectLink} emptyText={m.detail.noRelatedRunsScenario} />
                        <RelationshipPanel
                          current={{ label: `Scenario: ${selectedScenario.name}` }}
                          upstream={[]}
                          downstream={[
                            ...(selectedScenario.rules || []).map((rule) => ({ label: `Rule: ${rule.name}`, id: `rule:${rule.name}` })).slice(0, 6),
                            ...selectedScenarioRuns.map((run) => ({ label: `Run: ${run.id}`, id: `run:${run.id}` })).slice(0, 4),
                          ]}
                          evidence={selectedScenarioRuns.flatMap((run) => (run.relatedEvidence || []).map((item) => ({ label: item.name, id: item.sourceFile }))).slice(0, 4)}
                          onSelect={handleObjectLink}
                          labels={{ ...m.detail, na: m.detail.na }}
                        />
                      </DetailSection>
                      <DetailSection title={m.detail.source}>
                        <SourceMeta items={[
                          { label: m.fields.scenarioSource, path: selectedScenario.sourceFile },
                          ...relatedDocsFor('scenario', selectedScenario),
                          ...relatedExamplesFor('scenario', selectedScenario),
                        ]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                      <DetailSection title={m.detail.evidence}>
                        <EvidenceGroups items={[
                          { label: m.fields.scenarioSource, path: selectedScenario.sourceFile },
                          ...selectedScenarioRuns.flatMap((run) => [
                            run.sourceFile ? { label: `${m.fields.sourceLog} ${run.id}`, path: run.sourceFile } : null,
                            run.screenshotPath ? { label: `${m.fields.screenshot} ${run.id}`, path: run.screenshotPath } : null,
                            ...(run.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile })),
                          ]).filter(Boolean),
                        ]} labels={m.evidenceGroups} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                      </DetailSection>
                    </> : <EmptyState title={m.detail.noScenarios} description={m.detail.detailWillAppearScenario} />}
                  </div>
                </div> : <EmptyState title={m.detail.noScenarios} description={m.detail.noScenariosDesc} />}
              </section>
            </div>

            <aside className="side-column">
              <section className="panel">
                <SectionHeader title={m.sections.health} description={m.sections.healthDesc} />
                <div className="health-grid">
                  <StatCard label="Targets" value={data.repoHealth?.targetsCount ?? 0} />
                  <StatCard label="Profiles" value={data.repoHealth?.profilesCount ?? 0} />
                  <StatCard label="Rules" value={data.repoHealth?.rulesCount ?? 0} />
                  <StatCard label="Scenarios" value={data.repoHealth?.scenariosCount ?? 0} />
                  <StatCard label="Recent runs" value={data.repoHealth?.recentRunsCount ?? 0} />
                  <StatCard label="Load errors" value={data.repoHealth?.loadErrorsCount ?? 0} />
                </div>
              </section>

              <section className="panel">
                <SectionHeader title={m.sections.recentRuns} description={m.sections.recentRunsDesc} />
                {filteredRuns.length ? <div className="run-list">{filteredRuns.map((run) => <button key={run.id} type="button" className={run.id === selectedRun?.id ? 'run-card selected' : 'run-card'} onClick={() => setSelectedRunId(run.id)}><div className="item-topline"><h3>{run.id}</h3><Pill tone={toneFor(run.status)}>{localizedStatus(run.status, m)}</Pill></div><div className="item-meta"><span>{m.fields.time}: {timeLabel(run.timestamp)}</span><span>{m.fields.rule}: {run.ruleName || m.detail.none}</span><span>{m.fields.target}: {run.targetWindow || m.detail.unknown}</span></div></button>)}</div> : <EmptyState title={m.detail.noRuns} description={m.detail.noRunsDesc} />}
              </section>

              <section className="panel">
                <SectionHeader title={m.sections.runDetail} description={m.sections.runDetailDesc} />
                {selectedRun ? <div className="detail-panel">
                  <Breadcrumbs items={[
                    selectedRunScenarios[0] ? { label: selectedRunScenarios[0].name, id: `scenario:${selectedRunScenarios[0].name}` } : null,
                    selectedRunRule ? { label: selectedRunRule.name, id: `rule:${selectedRunRule.name}` } : null,
                    { label: selectedRun.id, id: `run:${selectedRun.id}` },
                  ]} onSelect={handleObjectLink} />
                  <DetailSection title={m.detail.summary}>
                    <div className="item-topline"><h3>{selectedRun.id}</h3><Pill tone={toneFor(selectedRun.status)}>{selectedRun.status}</Pill></div>
                    <div className="detail-list">
                      <DetailField label={m.fields.matchedRule}>{selectedRun.ruleName || m.detail.none}</DetailField>
                      <DetailField label={m.fields.target}>{selectedRun.targetWindow || m.detail.unknown}</DetailField>
                      <DetailField label={m.fields.profile}>{selectedRun.ocrProfileUsed || m.detail.na}</DetailField>
                      <DetailField label={m.fields.screenshotPath}><SourcePath path={selectedRun.screenshotPath} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} /></DetailField>
                      <DetailField label={m.fields.rawOcr}><div className="detail-text">{truncate(selectedRun.rawOcrOutput, 300)}</div></DetailField>
                      <DetailField label={m.fields.normalizedOcr}><div className="detail-text">{truncate(selectedRun.normalizedOcrOutput, 300)}</div></DetailField>
                      <DetailField label={m.fields.validationResult}><div className="detail-text">{selectedRun.validationResult ? JSON.stringify(selectedRun.validationResult) : m.detail.na}</div></DetailField>
                    </div>
                  </DetailSection>
                  <DetailSection title={m.detail.related}>
                    <RelatedLinks title={m.detail.relatedObjects} items={[
                      selectedRunRule ? { label: `Rule: ${selectedRunRule.name}`, meta: selectedRunRule.actionType, id: `rule:${selectedRunRule.name}` } : null,
                      selectedRunTarget ? { label: `Target: ${selectedRunTarget.name}`, meta: selectedRunTarget.target.window_title, id: `target:${selectedRunTarget.name}` } : null,
                      selectedRunProfile ? { label: `OCR profile: ${selectedRunProfile.name}`, meta: profileSummary(selectedRunProfile)?.confirm, id: `profile:${selectedRunProfile.name}` } : null,
                      ...selectedRunScenarios.map((scenario) => ({ label: `Scenario: ${scenario.name}`, meta: `${scenario.ruleCount} rule(s)`, id: `scenario:${scenario.name}` })),
                    ].filter(Boolean)} onSelect={handleObjectLink} emptyText={m.detail.noRelatedObjects} />
                    <RelationshipPanel
                      current={{ label: `Run: ${selectedRun.id}` }}
                      upstream={[
                        selectedRunRule ? { label: `Rule: ${selectedRunRule.name}`, id: `rule:${selectedRunRule.name}` } : null,
                        ...selectedRunScenarios.map((scenario) => ({ label: `Scenario: ${scenario.name}`, id: `scenario:${scenario.name}` })),
                      ].filter(Boolean)}
                      downstream={[
                        selectedRunTarget ? { label: `Target: ${selectedRunTarget.name}`, id: `target:${selectedRunTarget.name}` } : null,
                        selectedRunProfile ? { label: `OCR profile: ${selectedRunProfile.name}`, id: `profile:${selectedRunProfile.name}` } : null,
                      ].filter(Boolean)}
                      evidence={(selectedRun.relatedEvidence || []).map((item) => ({ label: item.name, id: item.sourceFile }))}
                      onSelect={handleObjectLink}
                      labels={{ ...m.detail, na: m.detail.na }}
                    />
                  </DetailSection>
                  <DetailSection title={m.detail.source}>
                    <SourceMeta items={[
                      { label: m.fields.sourceLog, path: selectedRun.sourceFile },
                      { label: m.fields.screenshot, path: selectedRun.screenshotPath },
                      ...relatedDocsFor('run', selectedRun),
                      ...relatedExamplesFor('run', selectedRun),
                    ]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                  </DetailSection>
                  <DetailSection title={m.detail.evidence}>
                    <EvidenceGroups items={[
                      selectedRun.sourceFile ? { label: m.fields.runLog, path: selectedRun.sourceFile } : null,
                      selectedRun.screenshotPath ? { label: m.fields.screenshot, path: selectedRun.screenshotPath } : null,
                      ...(selectedRun.relatedEvidence || []).map((item) => ({ label: item.name, path: item.sourceFile })),
                    ].filter(Boolean)} labels={m.evidenceGroups} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                  </DetailSection>
                </div> : <EmptyState title={m.sections.runDetail} description={m.detail.detailWillAppearRun} />}
              </section>

              <section className="panel">
                <SectionHeader title={m.sections.boundary} description={m.sections.boundaryDesc} />
                <div className="boundary-card boundary-in"><div className="boundary-title">{m.detail.inScope}</div><ul>{(data.boundarySummary?.validatedBoundary || []).map((item) => <li key={item}>{item}</li>)}</ul><div className="actions-row">{(data.validatedActionTypes || []).map((action) => <Pill key={action}>{action}</Pill>)}</div></div>
                <div className="boundary-card boundary-out"><div className="boundary-title">{m.detail.outOfScope}</div><ul>{(data.boundarySummary?.outOfScope || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <SourceMeta items={[{ label: m.detail.boundarySource, path: data.boundarySummary?.source }]} title={m.detail.sourceFiles} copyLabel={m.detail.copy} copiedLabel={m.detail.copied} naLabel={m.detail.na} />
                <div className="boundary-footnote">{data.boundarySummary?.overviewExcerpt || 'Boundary summary unavailable.'}</div>
              </section>
            </aside>
          </div>
        </> : null}
      </div>
    </div>
  );
}
