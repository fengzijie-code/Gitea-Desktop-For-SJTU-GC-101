import { ipcMain, dialog, app, shell } from 'electron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

export function readAppConfig(): any {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return { accounts: [], repositories: [] };
}

export function registerFileHandlers() {
  ipcMain.handle('file:select-directory', async (_event, defaultPath?: string) => {
    // defaultPath lets callers open the picker directly inside a WSL (UNC) location,
    // which Windows' folder dialog does not list in its navigation pane.
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: defaultPath || undefined,
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('file:read-config', async () => {
    return readAppConfig();
  });

  ipcMain.handle('file:write-config', async (_event, config: any) => {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return { success: true };
  });

  ipcMain.handle('shell:open-in-vscode', async (_event, repoPath: string) => {
    return new Promise((resolve, reject) => {
      exec(`code "${repoPath}"`, (error) => {
        if (error) {
          reject(new Error('Failed to open VS Code. Make sure "code" is in your PATH.'));
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('shell:open-in-explorer', async (_event, repoPath: string) => {
    const result = await shell.openPath(repoPath);
    if (result) throw new Error(result);
    return { success: true };
  });
}
