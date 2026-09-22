import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerGitHandlers } from './git-handlers';
import { registerGiteaHandlers } from './gitea-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerWslHandlers } from './wsl-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Gitea Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadHome();

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadHome() {
  if (!mainWindow) return;
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerGitHandlers();
  registerGiteaHandlers();
  registerFileHandlers();
  registerWslHandlers();

  ipcMain.handle('app:reload-home', () => {
    loadHome();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
