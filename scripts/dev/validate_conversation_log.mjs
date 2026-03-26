import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import { monitorManager } from '../../electron/monitor.js';

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const logPath = path.join(repoRoot, 'logs', 'namchieh-scan-validate-20260320-073052.json');
  const raw = await fs.readFile(logPath, 'utf8');
  const result = JSON.parse(raw);
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'openclose-log-validate-'));
  if (process.env.OPEN_CLOSE_VALIDATE_LOG_ROOT) {
    await fs.writeFile(
      path.join(userDataPath, 'settings.json'),
      `${JSON.stringify({ conversationLogRoot: process.env.OPEN_CLOSE_VALIDATE_LOG_ROOT }, null, 2)}\n`,
      'utf8',
    );
  }
  const session = { persistedConversationKeys: new Set() };
  const matchedWindow = { WindowTitle: 'NamChieh', ProcessName: 'Weixin' };
  const payload = {
    ...monitorManager.analyzeWechatContent(result, matchedWindow),
    ocrPreview: monitorManager.getOcrPreview(result),
  };
  const persisted = await monitorManager.persistConversationLog(userDataPath, session, matchedWindow, result, payload);
  console.log(JSON.stringify({ userDataPath, persisted }, null, 2));
  await app.quit();
}

app.whenReady().then(() => {
  void main().catch((error) => {
    console.error(error);
    app.exit(1);
  });
});
