// Isolated Electron regression fixture. Never loads a real account or provider.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(root, 'logs', 'usage-ui-'));
app.setPath('userData', directory);
app.whenReady().then(async () => {
  const config = await import(pathToFileURL(path.join(root, 'electron/ipc/config.js')));
  const { setupUsageHandlers } = await import(pathToFileURL(path.join(root, 'electron/ipc/usage.js')));
  const { normalizeClaude, normalizeCodex } = await import(pathToFileURL(path.join(root, 'electron/usage/normalize.js')));
  const reading = id => {
    const now = Date.now();
    return id === 'claude' ? normalizeClaude({ five_hour: { utilization: 35, resets_at: new Date(now + 7200000).toISOString() },
      seven_day: { utilization: 65, resets_at: new Date(now + 172800000).toISOString() } }, { uuid: 'fixture', name: 'Test Claude' }, now)
      : normalizeCodex({ rateLimits: { primary: { usedPercent: 45, windowDurationMins: 300, resetsAt: (now + 3600000) / 1000 },
        secondary: { usedPercent: 12, windowDurationMins: 10080, resetsAt: (now + 432000000) / 1000 } } }, { type: 'chatgpt', email: 'test@example.invalid' }, now);
  };
  const providers = Object.fromEntries(['claude', 'codex'].map(id => [id, { connect: async () => {}, read: async () => reading(id), disconnect: async () => {}, dispose: () => {} }]));
  config.setupConfigHandlers(ipcMain);
  const metrics = { cpu: { usage: 20, cores: [] }, memory: { usagePercent: 40, total: 100, used: 40, free: 60 },
    network: { rx: 1024, tx: 0, interfaces: [] }, disk: [{ usagePercent: 25 }], temperature: { main: 42, cores: [] },
    gpu: { available: true, gpus: [{ utilization: 10, temperature: 43 }] } };
  for (const [id, value] of Object.entries(metrics)) ipcMain.handle(`metrics:${id}`, () => value);
  ipcMain.handle('updater:get-status', () => ({ status: 'disabled' }));
  ipcMain.handle('window:get-state', () => ({ isMaximized: false, isFullscreen: false }));
  const window = new BrowserWindow({ width: 1024, height: 600, frame: false, show: false,
    webPreferences: { preload: path.join(root, 'electron/preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  const service = setupUsageHandlers(ipcMain, window, { providers });
  global.__usageTest = { service, window, directory, config, reading };
  await window.loadFile(path.join(root, 'dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
