import { app, BrowserWindow } from 'electron';
import electronUpdater from 'electron-updater';

// electron-updater is CommonJS, so take autoUpdater off the default export
const { autoUpdater } = electronUpdater;

// Releases are published to GitHub by .github/workflows/release.yml. The
// installed app reads latest.yml from the newest release (the feed is baked
// into app-update.yml by electron-builder from the "publish" config).
const FIRST_CHECK_DELAY_MS = 10 * 1000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let state = {
  status: 'idle', // disabled | idle | checking | available | not-available | downloaded | error
  currentVersion: app.getVersion(),
  version: null, // version being offered, once known
  percent: null, // download progress, 0-100
  error: null,
};

function setState(patch) {
  state = { ...state, ...patch };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', state);
  }
}

async function checkForUpdates() {
  // Don't restart a check or download in progress, or one already finished
  if (['disabled', 'checking', 'available', 'downloaded'].includes(state.status)) {
    return state;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    // Also reported through the 'error' event; this keeps the rejection handled
    setState({ status: 'error', error: error.message });
  }
  return state;
}

export function setupUpdater(ipcMain) {
  ipcMain.handle('updater:get-status', () => state);
  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.on('updater:install', () => {
    if (state.status === 'downloaded') {
      // Silent install, then relaunch the app
      autoUpdater.quitAndInstall(true, true);
    }
  });

  // There is no update feed for a dev build
  if (!app.isPackaged) {
    setState({ status: 'disabled' });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', error: null }));
  autoUpdater.on('update-available', info => setState({ status: 'available', version: info.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => setState({ status: 'not-available', percent: null }));
  autoUpdater.on('download-progress', progress => setState({ percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', info => setState({ status: 'downloaded', version: info.version, percent: 100 }));
  autoUpdater.on('error', error => setState({ status: 'error', error: error?.message || String(error) }));

  setTimeout(checkForUpdates, FIRST_CHECK_DELAY_MS);
  setInterval(checkForUpdates, CHECK_INTERVAL_MS);
}
