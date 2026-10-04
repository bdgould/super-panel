import { BrowserWindow, ipcMain, session, safeStorage, shell, dialog, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClaudeProvider } from './providers/claude.js';
import { CodexProvider } from './providers/codex.js';
import { publicError } from './errors.js';

const directory = path.dirname(fileURLToPath(import.meta.url));

// Explicit diagnostic entry point used to prove phase 1 in the packaged app.
// It is never enabled during an ordinary dashboard launch.
export async function openUsagePrototype() {
  const root = path.join(app.getPath('userData'), 'ai-usage');
  const providers = {
    claude: new ClaudeProvider({ session: session.fromPartition('superpanel-claude-usage'), BrowserWindow, safeStorage,
      directory: root }),
    codex: new CodexProvider({ directory: path.join(root, 'codex'), openExternal: url => shell.openExternal(url) }),
  };
  const window = new BrowserWindow({ width: 900, height: 720, title: 'SuperPanel — Usage connection test',
    autoHideMenuBar: true, backgroundColor: '#0a0a0f',
    webPreferences: { preload: path.join(directory, 'prototype-preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  const snapshots = {};
  providers.codex.onUpdate = () => {
    if (!window.isDestroyed()) window.webContents.send('usage-prototype:notice', 'Codex account update received. Read usage to verify it.');
  };
  ipcMain.handle('usage-prototype:action', async (event, provider, action, organizationId) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !providers[provider]) {
      return { success: false, error: { message: 'Invalid usage request.' } };
    }
    try {
      if (action === 'connect') await providers[provider].connect(window);
      else if (action === 'read') {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try { snapshots[provider] = await providers[provider].read({ signal: controller.signal, organizationId }); }
        finally { clearTimeout(timeout); }
      } else if (action === 'disconnect') {
        await providers[provider].disconnect(); delete snapshots[provider];
      } else if (action === 'choose-runtime' && provider === 'codex') {
        const result = await dialog.showOpenDialog(window, { title: 'Choose Codex executable', properties: ['openFile'], filters: [{ name: 'Executable', extensions: ['exe'] }] });
        if (!result.canceled) { providers.codex.dispose(); providers.codex.executable = result.filePaths[0]; }
      } else return { success: false, error: { message: 'Invalid usage action.' } };
      return { success: true, snapshot: snapshots[provider] || null };
    } catch (error) { return { success: false, error: publicError(error) }; }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('closed', () => { ipcMain.removeHandler('usage-prototype:action'); Object.values(providers).forEach(provider => provider.dispose()); });
  app.on('before-quit', () => Object.values(providers).forEach(provider => provider.dispose()));
  await window.loadFile(path.join(directory, 'prototype.html'));
  return window;
}
