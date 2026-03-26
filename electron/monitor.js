import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executeWorkspaceChatScan, executeWorkspaceRule } from './execution.js';
import { getSettings } from './settings.js';
import { getWorkspace, getWorkspacesRoot } from './workspaces.js';
import { listWindows } from './windows.js';
import { sanitizeMonitorOptions, sanitizeRulePayload } from './security.js';

function isWechatWindow(matchedWindow) {
  const processName = String(matchedWindow?.ProcessName || '').toLowerCase();
  const title = String(matchedWindow?.WindowTitle || '');
  return processName.includes('weixin') || /微信|wechat/i.test(title);
}

function buildWechatScanOcrOverride(settings, matchedWindow) {
  if (!isWechatWindow(matchedWindow)) {
    return null;
  }
  const region = settings?.wechatScanRegion;
  const maskRegions = Array.isArray(settings?.wechatMaskRegions)
    ? settings.wechatMaskRegions
        .filter((item) => item?.enabled)
        .map((item) => ({
          x: Math.max(0, Number(item.x) || 0),
          y: Math.max(0, Number(item.y) || 0),
          width: Math.max(1, Number(item.width) || 1),
          height: Math.max(1, Number(item.height) || 1),
        }))
    : [];

  const validRegion =
    region?.enabled && Number(region.width) >= 120 && Number(region.height) >= 120
      ? {
          x: Math.max(0, Number(region.x) || 0),
          y: Math.max(0, Number(region.y) || 0),
          width: Math.max(1, Number(region.width) || 1),
          height: Math.max(1, Number(region.height) || 1),
        }
      : null;

  if (!validRegion && !maskRegions.length) {
    return null;
  }

  return {
    ...(validRegion
      ? {
          roi: validRegion,
        }
      : {}),
    preprocessing: {
      mask_regions: maskRegions,
    },
  };
}

function parseWorkspaceTimestamp(value) {
  if (!value || !/^\d{8}-\d{6}$/.test(String(value))) {
    return value ? new Date(value).toISOString() : null;
  }
  const text = String(value);
  const isoLike = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(9, 11)}:${text.slice(11, 13)}:${text.slice(13, 15)}`;
  return new Date(isoLike).toISOString();
}

function sanitizeFileName(value, fallback = 'chat') {
  const normalized = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function toDateFolderName(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function normalizeConversationLine(value) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function isIgnorableConversationLine(value) {
  const line = normalizeConversationLine(value);
  if (!line) return true;
  if (/^(微信|Weixin|MMUIRenderSubWindowHW)$/i.test(line)) return true;
  if (/^共\s*\d+\s*条$/.test(line)) return true;
  if (/^(昨晚|今天|昨天|星期[一二三四五六日天]|周[一二三四五六日天])$/.test(line)) return true;
  if (/^(上午|下午|晚上|凌晨)\s*\d{1,2}[:：]\d{2}$/.test(line)) return true;
  return false;
}

function isProbableTimestamp(value) {
  return /(?<!\d)(?:[01]?\d|2[0-3])[:：][0-5]\d(?!\d)/.test(value);
}

function extractTimestamp(value) {
  const match = String(value || '').match(/(?<!\d)((?:[01]?\d|2[0-3])[:：][0-5]\d)(?!\d)/);
  return match ? match[1].replace('：', ':') : null;
}

function splitConversationText(text, windowTitle) {
  let working = String(text || '').replace(/\r/g, '\n');
  const escapedWindowTitle = windowTitle ? windowTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
  if (escapedWindowTitle) {
    working = working.replace(new RegExp(`(${escapedWindowTitle})`, 'g'), '\n$1\n');
  }
  working = working
    .replace(/(共\s*\d+\s*条)/g, '\n$1\n')
    .replace(/((?:上午|下午|晚上|凌晨)?\s*(?:[01]?\d|2[0-3])[:：][0-5]\d)/g, '\n$1\n')
    .replace(/((?:\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)|(?:\d{1,2}\s*月\s*\d{1,2}\s*日)|(?:星期[一二三四五六日天])|(?:周[一二三四五六日天]))/g, '\n$1\n')
    .replace(/([\u4e00-\u9fffA-Za-z0-9@._\- ]{2,24}\s*[：:])/g, '\n$1')
    .replace(/\n{3,}/g, '\n\n');
  return working
    .split('\n')
    .map((line) => normalizeConversationLine(line))
    .filter(Boolean);
}

function buildConversationEntriesFromLines(lines, fallbackTimestamp, windowTitle) {
  const normalizedLines = (lines || [])
    .map((line) => ({
      text: normalizeConversationLine(line?.text || line?.raw_text || ''),
      rect: line?.bounding_rect || null,
    }))
    .filter((line) => line.text && !isIgnorableConversationLine(line.text) && line.text !== windowTitle);

  if (!normalizedLines.length) {
    return [];
  }

  const maxRight = Math.max(...normalizedLines.map((line) => (line.rect ? Number(line.rect.X || 0) + Number(line.rect.Width || 0) : 0)), 1);
  const centerX = maxRight / 2;
  const entries = [];
  let currentTime = fallbackTimestamp;
  let pendingEntry = null;
  let currentSpeaker = '';

  const isStrictAvatarRightNickname = (candidate, nextLine) => {
    if (!candidate?.rect || !nextLine?.rect) return false;
    const text = normalizeConversationLine(candidate.text);
    if (!text || isIgnorableConversationLine(text) || isProbableTimestamp(text)) return false;
    if (/[，。！？,.!?：:]/.test(text)) return false;
    if (text.length < 2 || text.length > 16) return false;

    const candidateLeft = Number(candidate.rect.X || 0);
    const candidateTop = Number(candidate.rect.Y || 0);
    const candidateWidth = Number(candidate.rect.Width || 0);
    const candidateHeight = Number(candidate.rect.Height || 0);
    const nextLeft = Number(nextLine.rect.X || 0);
    const nextTop = Number(nextLine.rect.Y || 0);
    const nextWidth = Number(nextLine.rect.Width || 0);

    if (candidateLeft > maxRight * 0.24) return false;
    if (candidateWidth <= 0 || candidateWidth > maxRight * 0.22) return false;
    if (candidateHeight <= 0 || candidateHeight > 48) return false;
    if (nextTop <= candidateTop) return false;
    if (nextTop - candidateTop > Math.max(56, candidateHeight * 3.2)) return false;
    if (nextLeft < candidateLeft - 8) return false;
    if (nextLeft > maxRight * 0.34) return false;
    if (nextWidth < candidateWidth * 0.9) return false;
    return true;
  };

  const flushPending = () => {
    if (!pendingEntry || !pendingEntry.messageText) return;
    entries.push({
      speakerName: pendingEntry.speakerName || '',
      conversationTime: pendingEntry.conversationTime || fallbackTimestamp,
      messageText: pendingEntry.messageText.trim(),
    });
    pendingEntry = null;
  };

  for (const [index, line] of normalizedLines.entries()) {
    const rect = line.rect || {};
    const left = Number(rect.X || 0);
    const width = Number(rect.Width || 0);
    const lineCenter = left + width / 2;
    const text = line.text;

    if (isProbableTimestamp(text) || (width > 0 && Math.abs(lineCenter - centerX) < maxRight * 0.12 && text.length <= 16)) {
      currentTime = extractTimestamp(text) || currentTime || fallbackTimestamp;
      flushPending();
      continue;
    }

    const nextLine = normalizedLines[index + 1];
    if (isStrictAvatarRightNickname(line, nextLine)) {
      flushPending();
      currentSpeaker = text;
      continue;
    }

    const isContinuation =
      pendingEntry &&
      Math.abs(left - Number(pendingEntry.left || 0)) < Math.max(24, maxRight * 0.05);

    if (isContinuation) {
      pendingEntry.messageText += `\n${text}`;
      continue;
    }

    flushPending();
    pendingEntry = {
      speakerName: currentSpeaker || '',
      conversationTime: extractTimestamp(text) || currentTime || fallbackTimestamp,
      messageText: text,
      left,
    };
  }

  flushPending();
  return entries;
}

function buildConversationEntries(text, fallbackTimestamp, windowTitle) {
  const lines = splitConversationText(text, windowTitle);

  const entries = [];
  let currentTime = null;

  for (const line of lines) {
    if (!line || line === windowTitle || isIgnorableConversationLine(line)) {
      continue;
    }

    const inlineSpeaker = line.match(/^([\u4e00-\u9fffA-Za-z0-9@._\- ]{2,24})\s*[：:]\s*(.+)$/);
    if (inlineSpeaker) {
      const content = normalizeConversationLine(inlineSpeaker[2]);
      const contentTime = extractTimestamp(content) || currentTime || fallbackTimestamp;
      entries.push({
        speakerName: '',
        conversationTime: contentTime,
        messageText: content,
      });
      continue;
    }

    if (isProbableTimestamp(line)) {
      currentTime = extractTimestamp(line) || fallbackTimestamp;
      continue;
    }

    entries.push({
      speakerName: '',
      conversationTime: extractTimestamp(line) || currentTime || fallbackTimestamp,
      messageText: line,
    });
  }

  return entries.filter((entry) => entry.messageText);
}

class MonitorManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  getOcrPreview(result) {
    const text =
      result?.final_ocr_output ||
      result?.rule_runs?.[0]?.final_ocr_output ||
      result?.postprocessed_ocr_output ||
      result?.ocr_text ||
      result?.normalized_ocr_output ||
      result?.rule_runs?.[0]?.postprocessed_ocr_output ||
      result?.rule_runs?.[0]?.normalized_ocr_output ||
      '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  getPostprocessedPreview(result) {
    const text =
      result?.postprocessed_ocr_output ||
      result?.rule_runs?.[0]?.postprocessed_ocr_output ||
      '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  getPostprocessedLineStats(result) {
    const lines = result?.postprocessed_lines || result?.rule_runs?.[0]?.postprocessed_lines || [];
    return {
      postprocessedLineCount: Array.isArray(lines) ? lines.length : 0,
      firstPostprocessedLinePreview: Array.isArray(lines) && lines.length
        ? String(lines[0]?.text || lines[0]?.raw_text || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        : '',
    };
  }

  analyzeWechatContent(result, matchedWindow) {
    const rawText = String(
      result?.raw_ocr_output || result?.normalized_ocr_output || result?.ocr_text || result?.rule_runs?.[0]?.raw_ocr_output || '',
    ).trim();
    const normalizedText = String(
      result?.postprocessed_ocr_output ||
      result?.ocr_text ||
      result?.normalized_ocr_output ||
      result?.rule_runs?.[0]?.postprocessed_ocr_output ||
      result?.rule_runs?.[0]?.normalized_ocr_output ||
      '',
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

  async persistConversationLog(userDataPath, session, matchedWindow, result, payload) {
    const settings = await getSettings(userDataPath);
    const rootDir = settings.conversationLogRoot;
    const captureTimestamp = parseWorkspaceTimestamp(result?.timestamp) || new Date().toISOString();
    const dateFolder = path.join(rootDir, toDateFolderName(captureTimestamp));
    const windowTitle = String(matchedWindow?.WindowTitle || result?.target_window || 'WeChat').trim() || 'WeChat';
    const baseName = sanitizeFileName(windowTitle, 'WeChat');
    const jsonlPath = path.join(dateFolder, `${baseName}.jsonl`);
    const txtPath = path.join(dateFolder, `${baseName}.txt`);
    const fallbackTime = captureTimestamp.slice(11, 16);
    const sourceLines =
      result?.postprocessed_lines ||
      result?.rule_runs?.[0]?.postprocessed_lines ||
      result?.normalized_lines ||
      result?.rule_runs?.[0]?.normalized_lines ||
      [];
    const sourceText =
      result?.final_ocr_output ||
      result?.postprocessed_ocr_output ||
      result?.normalized_ocr_output ||
      result?.ocr_text ||
      result?.rule_runs?.[0]?.final_ocr_output ||
      result?.rule_runs?.[0]?.postprocessed_ocr_output ||
      result?.rule_runs?.[0]?.normalized_ocr_output ||
      payload?.contentSummary ||
      '';
    const lineEntries = buildConversationEntriesFromLines(sourceLines, fallbackTime, windowTitle);
    const entries = lineEntries.length
      ? lineEntries
      : buildConversationEntries(sourceText, fallbackTime, windowTitle);

    if (!entries.length) {
      return { rootDir, dateFolder, jsonlPath, txtPath, appendedCount: 0 };
    }

    await fs.mkdir(dateFolder, { recursive: true });
    const appendable = [];
    for (const entry of entries) {
      const key = [
        toDateFolderName(captureTimestamp),
        windowTitle,
        entry.conversationTime || fallbackTime,
        entry.speakerName || '',
        entry.messageText,
      ].join('::');
      if (session.persistedConversationKeys.has(key)) {
        continue;
      }
      session.persistedConversationKeys.add(key);
      appendable.push({
        capturedAt: captureTimestamp,
        date: toDateFolderName(captureTimestamp),
        windowTitle,
        conversationTime: entry.conversationTime || fallbackTime,
        speakerName: entry.speakerName || '',
        messageText: entry.messageText,
        contentType: payload?.contentType || null,
        matchedRule: result?.matched_rule || null,
      });
    }

    if (!appendable.length) {
      return { rootDir, dateFolder, jsonlPath, txtPath, appendedCount: 0 };
    }

    const jsonlContent = appendable.map((entry) => JSON.stringify(entry, null, 0)).join('\n') + '\n';
    const txtContent =
      appendable
        .map((entry) => `[${entry.conversationTime}]${entry.speakerName ? ` ${entry.speakerName}` : ''}\n${entry.messageText}\n`)
        .join('\n') + '\n';
    await fs.appendFile(jsonlPath, jsonlContent, 'utf8');
    await fs.appendFile(txtPath, txtContent, 'utf8');
    return { rootDir, dateFolder, jsonlPath, txtPath, appendedCount: appendable.length };
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
      historyScanEnabled: false,
      historyScanCompleted: false,
      emergencyStopHotkey: null,
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
    const settings = await getSettings(userDataPath);
    const session = {
      workspaceId,
      timer: null,
      busy: false,
      stopRequested: false,
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
        historyScanEnabled: Boolean(sanitizedOptions.historyScanEnabled),
        historyScanCompleted: false,
        emergencyStopHotkey: settings.emergencyStopHotkey,
      },
      persistedConversationKeys: new Set(),
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

        if (session.stopRequested) {
          session.status.lastError = 'Emergency stop requested.';
          this.pushLog(session, {
            level: 'warning',
            message: 'Emergency stop requested.',
          });
          await this.stop(workspaceId);
          return;
        }

        if (session.status.historyScanEnabled && !session.status.historyScanCompleted) {
          this.pushLog(session, {
            level: 'info',
            message: `Starting history chat scan on ${matchedWindow.WindowTitle}`,
          });
          const wechatOcrOverride = buildWechatScanOcrOverride(settings, matchedWindow);
          const result = await executeWorkspaceChatScan(userDataPath, workspaceId, {
            scenarioId,
            windowTitle: matchedWindow.WindowTitle,
            summaryName: `${matchedWindow.WindowTitle}-chat-scan`,
            ocrOverride: wechatOcrOverride || {},
          });
          const ocrPreview = this.getOcrPreview(result);
          const postprocessedOcrPreview = this.getPostprocessedPreview(result);
          const postprocessedLineStats = this.getPostprocessedLineStats(result);
          const contentAnalysis = this.analyzeWechatContent(result, matchedWindow);
          const persistence = await this.persistConversationLog(userDataPath, session, matchedWindow, result, {
            ...contentAnalysis,
            ocrPreview,
          });
          session.status.historyScanCompleted = true;
          this.pushLog(session, {
            level: 'success',
            message: `History chat scan completed on ${matchedWindow.WindowTitle}`,
            payload: {
              ...result,
              ocrPreview,
              postprocessedOcrPreview,
              ...postprocessedLineStats,
              ...contentAnalysis,
              conversationLog: persistence,
            },
          });
        } else if (!session.status.historyScanEnabled) {
          this.pushLog(session, {
            level: 'info',
            message: `History chat scan disabled for ${matchedWindow.WindowTitle}`,
          });
        }

        for (const rule of scenario.rules || []) {
          const wechatOcrOverride = buildWechatScanOcrOverride(settings, matchedWindow);
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
          const executionInput = {
            ...executionRule,
            ocrOverride: wechatOcrOverride || {},
          };

          const result = await executeWorkspaceRule(userDataPath, workspaceId, executionInput);
          const ocrPreview = this.getOcrPreview(result);
          const postprocessedOcrPreview = this.getPostprocessedPreview(result);
          const postprocessedLineStats = this.getPostprocessedLineStats(result);
          const contentAnalysis = this.analyzeWechatContent(result, matchedWindow);
          const persistence = await this.persistConversationLog(userDataPath, session, matchedWindow, result, {
            ...contentAnalysis,
            ocrPreview,
          });
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
              postprocessedOcrPreview,
              ...postprocessedLineStats,
              ...contentAnalysis,
              conversationLog: persistence,
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

  async stopAll(reason = 'Emergency stop requested.') {
    const workspaceIds = [...this.sessions.keys()];
    for (const workspaceId of workspaceIds) {
      const session = this.sessions.get(workspaceId);
      if (!session) continue;
      session.stopRequested = true;
      this.pushLog(session, {
        level: 'warning',
        message: reason,
      });
      await this.stop(workspaceId);
    }
    return { stoppedWorkspaceIds: workspaceIds };
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
