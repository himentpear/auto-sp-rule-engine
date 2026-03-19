import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { getExternalRoot, getExternalScriptPath, getExternalVendorPath } from './runtimePaths.js';

function getPowerShellCandidates() {
  const systemRoot = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
  const comspec = process.env.ComSpec || path.join(systemRoot, 'System32', 'cmd.exe');
  const scriptPath = getExternalScriptPath('list_windows.ps1');

  return [
    {
      command: path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      label: 'system32-powershell',
    },
    {
      command: path.join(systemRoot, 'Sysnative', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      label: 'sysnative-powershell',
    },
    {
      command: path.join(systemRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      label: 'syswow64-powershell',
    },
    {
      command: 'powershell.exe',
      args: ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      label: 'path-powershell',
    },
    {
      command: comspec,
      args: ['/d', '/s', '/c', `"${path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')}" -ExecutionPolicy Bypass -File "${scriptPath}"`],
      label: 'cmd-system32-powershell',
    },
  ];
}

function candidateExists(candidate) {
  if (!candidate.command.includes('\\') && !candidate.command.includes('/')) {
    return true;
  }
  return fs.existsSync(candidate.command);
}

function runCandidate(candidate, titleRegex) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      candidate.command,
      [...candidate.args, '-TitleRegex', titleRegex],
      {
        cwd: getExternalRoot(),
        windowsHide: true,
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new Error(`${candidate.label}: ${error.message}`));
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${candidate.label}: ${stderr || `Exit code ${code}`}`));
        return;
      }
      if (!stdout.trim()) {
        resolve([]);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (error) {
        reject(new Error(`${candidate.label}: Unable to parse windows list: ${error.message}`));
      }
    });
  });
}

export function listWindows(titleRegex = '.*') {
  const candidates = getPowerShellCandidates().filter(candidateExists);
  const attempted = [];

  const attempt = async (index) => {
    if (index >= candidates.length) {
      throw new Error(`Unable to enumerate windows. No usable PowerShell launcher succeeded. Tried: ${attempted.join(', ') || 'none'}`);
    }
    const candidate = candidates[index];
    attempted.push(candidate.label);
    try {
      return await runCandidate(candidate, titleRegex);
    } catch (error) {
      if (index === candidates.length - 1) {
        throw new Error(`Unable to enumerate windows. Tried: ${attempted.join(', ')}. Last error: ${error.message}`);
      }
      return attempt(index + 1);
    }
  };

  return attempt(0);
}

export function inspectWindowControls(windowTitle) {
  return new Promise((resolve, reject) => {
    const ahkExe = getExternalVendorPath('autohotkey', '2.0.19', 'AutoHotkey64.exe');
    const scriptPath = getExternalScriptPath('ahk', 'list_window_controls.ahk');
    const outFile = path.join(os.tmpdir(), `auto-sp-controls-${Date.now()}.txt`);
    const child = spawn(
      ahkExe,
      [scriptPath, windowTitle, outFile],
      {
        cwd: getExternalRoot(),
        windowsHide: true,
      },
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new Error(`Unable to inspect window controls: ${error.message}`));
    });
    child.on('close', () => {
      try {
        const content = fs.readFileSync(outFile, 'utf8');
        const lines = content.split(/\r?\n/).filter(Boolean);
        const titleLine = lines.find((line) => line.startsWith('TITLE=')) || '';
        const focusedLine = lines.find((line) => line.startsWith('FOCUSED=')) || '';
        const controls = lines
          .filter((line) => !line.startsWith('TITLE=') && !line.startsWith('FOCUSED='))
          .map((line) => {
            const [control = '', textSample = ''] = line.split(' | ');
            return {
              control,
              textSample,
            };
          });
        fs.unlinkSync(outFile);
        resolve({
          title: titleLine.replace(/^TITLE=/, ''),
          focused: focusedLine.replace(/^FOCUSED=/, ''),
          controls,
          stderr,
        });
      } catch (error) {
        reject(new Error(stderr || `Unable to inspect window controls: ${error.message}`));
      }
    });
  });
}
