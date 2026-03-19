import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executeWorkspaceRule } from './execution.js';
import { getWorkspace, getWorkspacesRoot } from './workspaces.js';
import { listWindows } from './windows.js';
import { sanitizeMonitorOptions, sanitizeRulePayload } from './security.js';

class MonitorManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
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
            targetOverride: {
              window_title: matchedWindow.WindowTitle,
              window_title_substring: matchedWindow.WindowTitle,
              process_name: matchedWindow.ProcessName,
            },
          });

          const result = await executeWorkspaceRule(userDataPath, workspaceId, executionRule);
          this.pushLog(session, {
            level: result.matched_rule ? 'success' : 'info',
            message: result.matched_rule
              ? `Matched ${result.matched_rule} on ${matchedWindow.WindowTitle}`
              : `No rule matched on ${matchedWindow.WindowTitle}`,
            payload: result,
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
}

export const monitorManager = new MonitorManager();
