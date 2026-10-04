import { app, BrowserWindow, dialog, session, safeStorage, shell } from 'electron';
import path from 'node:path';
import { ClaudeProvider } from '../usage/providers/claude.js';
import { CodexProvider } from '../usage/providers/codex.js';
import { UsageService } from '../usage/service.js';
import { publicError } from '../usage/errors.js';
import { configEvents, getAppSettings, saveAppSettings, getUsageConnections, setUsageConnection } from './config.js';

export function setupUsageHandlers(ipcMain, window) {
  const root = path.join(app.getPath('userData'), 'ai-usage');
  const connections = getUsageConnections();
  const providers = {
    claude: new ClaudeProvider({ session: session.fromPartition('superpanel-claude-usage'), BrowserWindow, safeStorage, directory: root }),
    codex: new CodexProvider({ directory: path.join(root, 'codex'), openExternal: url => shell.openExternal(url),
      executable: connections.codex?.executable || null }),
  };
  const service = new UsageService({ providers, connections, persistConnection: setUsageConnection,
    disableProvider: id => saveAppSettings({ aiUsage: { [id]: { enabled: false } } }) });
  const send = (channel, data) => { if (!window.isDestroyed()) window.webContents.send(channel, data); };
  service.on('status', status => send('usage:status', status));
  const settingsListener = settings => { service.setSettings(settings); send('config:settings', settings); };
  configEvents.on('settings', settingsListener);
  // Login notifications prompt a read only for an explicitly initiated connection.
  providers.codex.onUpdate = method => {
    if (service.states.codex.connection === 'connecting' && method === 'account/login/completed') {
      void service.refresh('codex', { connecting: true });
    } else if (service.enabled.codex && method === 'account/rateLimits/updated') {
      service.nextRefresh.codex = 0;
      void service.tick();
    }
  };
  const handlers = {
    'usage:get-status': () => service.status(),
    'usage:connect': id => service.connect(id, window),
    'usage:refresh': (id, organizationId) => {
      if (organizationId != null && (typeof organizationId !== 'string' || organizationId.length > 160)) throw new Error('Invalid workspace');
      return service.refresh(id, { organizationId });
    },
    'usage:disconnect': id => service.disconnect(id),
    'usage:choose-runtime': async () => {
      const result = await dialog.showOpenDialog(window, { title: 'Choose Codex executable', properties: ['openFile'], filters: [{ name: 'Executable', extensions: ['exe'] }] });
      if (!result.canceled) {
        service.cancel('codex'); providers.codex.executable = result.filePaths[0];
        if (service.connections.codex) {
          service.connections.codex = { ...service.connections.codex, executable: result.filePaths[0] };
          setUsageConnection('codex', service.connections.codex);
        }
      }
      return service.status();
    },
  };
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
        return { success: false, error: { message: 'Invalid usage request.' } };
      }
      try { return { success: true, status: await handler(...args) }; }
      catch (error) { return { success: false, error: publicError(error) }; }
    });
  }
  const hide = () => service.setVisible(false);
  const show = () => service.setVisible(true);
  window.on('minimize', hide); window.on('hide', hide);
  window.on('restore', show); window.on('show', show);
  service.setSettings(getAppSettings()); service.start();
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    service.dispose(); configEvents.removeListener('settings', settingsListener);
    for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel);
    window.removeListener('minimize', hide); window.removeListener('hide', hide);
    window.removeListener('restore', show); window.removeListener('show', show);
    app.removeListener('before-quit', dispose);
  };
  window.once('closed', dispose); app.once('before-quit', dispose);
  return service;
}
