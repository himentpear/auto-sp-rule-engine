import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAppRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar');
  }
  return path.resolve(__dirname, '..');
}

export function getExternalRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked');
  }
  return path.resolve(__dirname, '..');
}

export function getExternalScriptPath(...segments) {
  return path.join(getExternalRoot(), 'scripts', ...segments);
}

export function getExternalVendorPath(...segments) {
  return path.join(getExternalRoot(), 'vendor', ...segments);
}

