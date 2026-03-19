import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executeWorkspaceRule } from './execution.js';
import { getWorkspace, getWorkspacesRoot } from './workspaces.js';
import { listWindows } from './windows.js';
import { sanitizeMonitorOptions, sanitizeRulePayload } from './security.js';

function parseWorkspaceTimestamp(value) {
  if (!value || !/^\d{8}-\d{6}$/.test(String(value))) {
    return value ? new Date(value).toISOString() : null;
  }
  const text = String(value);
  const isoLike = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(9, 11)}:${text.slice(11, 13)}:${text.slice(13, 15)}`;
  return new Date(isoLike).toISOString();
}

class MonitorManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  getOcrPreview(result) {
    const text = result?.normalized_ocr_output || result?.ocr_text || result?.rule_runs?.[0]?.normalized_ocr_output || '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  analyzeWechatContent(result, matchedWindow) {
    const rawText = String(
      result?.raw_ocr_output || result?.normalized_ocr_output || result?.ocr_text || result?.rule_runs?.[0]?.raw_ocr_output || '',
    ).trim();
    const normalizedText = String(
      result?.normalized_ocr_output || result?.ocr_text || result?.rule_runs?.[0]?.normalized_ocr_output || '',
    ).trim();
    const title = String(matchedWindow?.WindowTitle || '').trim();
    const cleaned = normalizedText
      .replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ')
      .replace(/\(\d+\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const chineseMatches = cleaned.match(/[\u4e00-\u9fff]/g) || [];
    const latinDigitMatches = cleaned.match(/[a-z0-9]/gi) || [];
    const punctuationMatches = cleaned.match(/[^a-z0-9\u4e00-\u9fff\s]/gi) || [];
    const promoCodeLike = /[A-Z0-9]{6,}/.test(rawText);
    const cardKeywords = /(小程序|公众号|文章|名片|请查收|优惠券|链接|卡片|阅读|查看全文|外卖券|优惠)/i.test(rawText);
    const stickerLike = chineseMatches.length < 2 && latinDigitMatches.length < 8;
    const noiseLike =
      chineseMatches.length === 0 &&
      latinDigitMatches.length > 0 &&
      punctuationMatches.length >= 2;

    if (cardKeywords || promoCodeLike) {
      return {
        contentType: 'card_or_article',
        contentSummary: cleaned || rawText || 'card-like content',
      };
    }
    if (chineseMatches.length >= 2) {
      return {
        contentType: 'chat_text',
        contentSummary: cleaned || rawText,
      };
    }
    if (stickerLike) {
      return {
        contentType: 'sticker_or_image',
        contentSummary: cleaned || rawText || 'likely non-text content',
      };
    }
    if (noiseLike) {
      return {
        contentType: 'noise_or_avatar',
        contentSummary: cleaned || rawText,
      };
    }
    return {
      contentType: 'uncertain',
      contentSummary: cleaned || rawText,
    };
  }

  toExportRecord(parsed) {
    const firstRuleRun = parsed?.rule_runs?.[0] || {};
    const matchedWindow = {
      WindowTitle:
        parsed?.target_window ||
        firstRuleRun?.resolved_target?.window_title ||
        firstRuleRun?.resolved_target?.window_title_substring ||
        '',
      ProcessName: firstRuleRun?.resolved_target?.process_name || '',
    };
    const ocrPreview = this.getOcrPreview(parsed);
    const contentAnalysis = this.analyzeWechatContent(parsed, matchedWindow);
    const contentText = (contentAnalysis.contentSummary || ocrPreview || '').replace(/\s+/g, ' ').trim();

    return {
      timestamp: parseWorkspaceTimestamp(parsed?.timestamp),
      sourceTimestamp: parsed?.timestamp || null,
      windowTitle: matchedWindow.WindowTitle || null,
      processName: matchedWindow.ProcessName || null,
      matchedRule: parsed?.matched_rule || null,
      actionType: parsed?.action_type || null,
      dryRun: Boolean(parsed?.dry_run),
      contentType: contentAnalysis.contentType,
      contentSummary: contentAnalysis.contentSummary || '',
      ocrPreview,
      exportKey: `${contentAnalysis.contentType}::${contentText.toLowerCase()}`,
    };
  }

  getStatus(workspaceId) {
    return this.sessions.get(workspaceId)?.status ?? {
      workspaceId,
      running: false,
      intervalSeconds: null,
      titleRegex: null,
      scenarioId: null,
      matchedWindow: null,
      lastTickAt: null,
      lastError: null,
      logs: [],
    };
  }

  async start(userDataPath, workspaceId, options = {}) {
    await this.stop(workspaceId);

    const workspace = await getWorkspace(userDataPath, workspaceId);
    const sanitizedOptions = sanitizeMonitorOptions(options, workspace);
    const scenarioId = sanitizedOptions.scenarioId;
    const scenario = workspace.scenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const intervalSeconds = sanitizedOptions.intervalSeconds;
    const titleRegex = sanitizedOptions.titleRegex;
    const session = {
      workspaceId,
      timer: null,
      busy: false,
      status: {
        workspaceId,
        running: true,
        intervalSeconds,
        titleRegex,
        scenarioId,
        matchedWindow: null,
        lastTickAt: null,
        lastError: null,
        logs: [],
      },
    };

    const tick = async () => {
      if (session.busy) return;
      session.busy = true;
      try {
        const windows = await listWindows(titleRegex);
        const matchedWindow = windows[0] || null;
        session.status.matchedWindow = matchedWindow;
        session.status.lastTickAt = new Date().toISOString();
        session.status.lastError = matchedWindow ? null : `No window matched regex: ${titleRegex}`;

        if (!matchedWindow) {
          this.pushLog(session, {
            level: 'warning',
            message: `No window matched regex "${titleRegex}"`,
          });
          this.emitStatus(session.status);
          return;
        }

        for (const rule of scenario.rules || []) {
          const executionRule = sanitizeRulePayload({
            ...rule,
            targetRef: rule.targetRef || scenario.targetRef,
            ocrProfileRef: rule.ocrProfileRef || scenario.ocrProfileRef,
            dryRun: Boolean(rule.logOnly || scenario.logOnly),
            targetOverride: {
              window_title: matchedWindow.WindowTitle,
              window_title_substring: matchedWindow.WindowTitle,
              process_name: matchedWindow.ProcessName,
            },
          });

          const result = await executeWorkspaceRule(userDataPath, workspaceId, executionRule);
          const ocrPreview = this.getOcrPreview(result);
          const contentAnalysis = this.analyzeWechatContent(result, matchedWindow);
          const detectionMessage = !result.matched_rule && ['chat_text', 'card_or_article', 'sticker_or_image'].includes(contentAnalysis.contentType)
            ? `Detected ${contentAnalysis.contentType} on ${matchedWindow.WindowTitle}`
            : null;
          this.pushLog(session, {
            level: result.matched_rule || detectionMessage ? 'success' : 'info',
            message: result.matched_rule
              ? `${executionRule.dryRun ? 'Matched (log-only)' : 'Matched'} ${result.matched_rule} on ${matchedWindow.WindowTitle}`
              : detectionMessage || `No rule matched on ${matchedWindow.WindowTitle}`,
            payload: {
              ...result,
              ocrPreview,
              ...contentAnalysis,
              detectedByClassifier: Boolean(detectionMessage),
            },
          });
        }

        this.emitStatus(session.status);
      } catch (error) {
        session.status.lastError = error.message;
        this.pushLog(session, {
          level: 'error',
          message: error.message,
        });
        this.emitStatus(session.status);
      } finally {
        session.busy = false;
      }
    };

    session.timer = setInterval(() => {
      void tick();
    }, intervalSeconds * 1000);
    this.sessions.set(workspaceId, session);
    await tick();
    this.emitStatus(session.status);
    return session.status;
  }

  async stop(workspaceId) {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      return this.getStatus(workspaceId);
    }
    clearInterval(session.timer);
    session.status.running = false;
    session.status.lastTickAt = new Date().toISOString();
    this.sessions.delete(workspaceId);
    this.emitStatus(session.status);
    return session.status;
  }

  emitStatus(status) {
    this.emit('status', JSON.parse(JSON.stringify(status)));
  }

  pushLog(session, entry) {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    session.status.logs = [logEntry, ...session.status.logs].slice(0, 50);
    this.emit('log', {
      workspaceId: session.status.workspaceId,
      entry: logEntry,
    });
  }

  async loadWorkspaceLogs(userDataPath, workspaceId) {
    const logsDir = path.join(getWorkspacesRoot(userDataPath), workspaceId, 'logs');
    try {
      const entries = await fs.readdir(logsDir, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name)
        .sort()
        .reverse()
        .slice(0, 20);
      const records = [];
      for (const file of files) {
        const fullPath = path.join(logsDir, file);
        const parsed = JSON.parse(await fs.readFile(fullPath, 'utf8'));
        records.push({
          id: file.replace('.json', ''),
          timestamp: parsed.timestamp,
          matchedRule: parsed.matched_rule,
          actionType: parsed.action_type,
          path: fullPath,
        });
      }
      return records;
    } catch {
      return [];
    }
  }

  async exportCapturedContent(userDataPath, workspaceId) {
    const workspaceRoot = path.join(getWorkspacesRoot(userDataPath), workspaceId);
    const logsDir = path.join(workspaceRoot, 'logs');
    const exportsDir = path.join(workspaceRoot, 'exports');
    await fs.mkdir(exportsDir, { recursive: true });

    const entries = await fs.readdir(logsDir, { withFileTypes: true }).catch(() => []);
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('security-'))
      .map((entry) => entry.name)
      .sort();

    const rawRecords = [];
    for (const file of files) {
      const fullPath = path.join(logsDir, file);
      try {
        const parsed = JSON.parse(await fs.readFile(fullPath, 'utf8'));
        const record = this.toExportRecord(parsed);
        if (!record.contentSummary && !record.ocrPreview) {
          continue;
        }
        rawRecords.push({
          ...record,
          sourcePath: fullPath,
        });
      } catch {
        // Ignore malformed log files and continue exporting what is readable.
      }
    }

    rawRecords.sort((left, right) => {
      const leftTime = Date.parse(left.timestamp || '') || 0;
      const rightTime = Date.parse(right.timestamp || '') || 0;
      return leftTime - rightTime;
    });

    const seen = new Set();
    const dedupedRecords = [];
    for (const record of rawRecords) {
      if (!record.exportKey || seen.has(record.exportKey)) {
        continue;
      }
      seen.add(record.exportKey);
      dedupedRecords.push(record);
    }

    const exportedAt = new Date().toISOString();
    const exportStamp = exportedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const jsonPath = path.join(exportsDir, `captures-${exportStamp}.json`);
    const txtPath = path.join(exportsDir, `captures-${exportStamp}.txt`);
    const jsonPayload = {
      workspaceId,
      exportedAt,
      totalLogFiles: files.length,
      rawRecordCount: rawRecords.length,
      uniqueRecordCount: dedupedRecords.length,
      sortOrder: 'timestamp_asc',
      records: dedupedRecords.map(({ exportKey, ...record }) => record),
    };
    const textPayload = dedupedRecords
      .map((record, index) =>
        [
          `#${index + 1}`,
          `Time: ${record.timestamp || 'n/a'}`,
          `Window: ${record.windowTitle || 'n/a'}${record.processName ? ` (${record.processName})` : ''}`,
          `Type: ${record.contentType}`,
          `Rule: ${record.matchedRule || 'classifier-only'}`,
          `Action: ${record.actionType || 'n/a'}`,
          `Summary: ${record.contentSummary || record.ocrPreview || ''}`,
          `OCR: ${record.ocrPreview || ''}`,
          '',
        ].join('\n'),
      )
      .join('\n');

    await fs.writeFile(jsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`, 'utf8');
    await fs.writeFile(txtPath, textPayload, 'utf8');

    return {
      workspaceId,
      exportedAt,
      totalLogFiles: files.length,
      rawRecordCount: rawRecords.length,
      uniqueRecordCount: dedupedRecords.length,
      jsonPath,
      txtPath,
    };
  }
}

export const monitorManager = new MonitorManager();
