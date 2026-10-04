const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  usage: {
    getStatus: () => ipcRenderer.invoke('usage:get-status'),
    connect: provider => ipcRenderer.invoke('usage:connect', provider),
    refresh: (provider, organizationId) => ipcRenderer.invoke('usage:refresh', provider, organizationId),
    disconnect: provider => ipcRenderer.invoke('usage:disconnect', provider),
    chooseRuntime: () => ipcRenderer.invoke('usage:choose-runtime'),
    onStatus: callback => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('usage:status', listener);
      return () => ipcRenderer.removeListener('usage:status', listener);
    },
  },
  // System metrics
  metrics: {
    getCPU: () => ipcRenderer.invoke('metrics:cpu'),
    getMemory: () => ipcRenderer.invoke('metrics:memory'),
    getNetwork: () => ipcRenderer.invoke('metrics:network'),
    getDisk: () => ipcRenderer.invoke('metrics:disk'),
    getTemperature: () => ipcRenderer.invoke('metrics:temperature'),
    getGPU: () => ipcRenderer.invoke('metrics:gpu'),
  },

  // Button actions
  actions: {
    launchApp: (appPath, args) => ipcRenderer.invoke('actions:launch-app', appPath, args),
    runCommand: (command) => ipcRenderer.invoke('actions:run-command', command),
    openUrl: (url) => ipcRenderer.invoke('actions:open-url', url),
    systemControl: (action) => ipcRenderer.invoke('actions:system-control', action),
  },

  // Configuration management
  config: {
    onSettings: callback => {
      const listener = (_event, settings) => callback(settings);
      ipcRenderer.on('config:settings', listener);
      return () => ipcRenderer.removeListener('config:settings', listener);
    },
    getButtons: () => ipcRenderer.invoke('config:get-buttons'),
    saveButton: (buttonId, config) => ipcRenderer.invoke('config:save-button', buttonId, config),
    deleteButton: (buttonId) => ipcRenderer.invoke('config:delete-button', buttonId),
    getSettings: () => ipcRenderer.invoke('config:get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('config:save-settings', settings),
    uploadIcon: (buttonId, base64Data, filename) => ipcRenderer.invoke('config:upload-icon', buttonId, base64Data, filename),
    getIconPath: (filename) => ipcRenderer.invoke('config:get-icon-path', filename),
  },

  // Auto-update (no-op in dev builds, where status is 'disabled')
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.send('updater:install'),
    onStatus: (callback) => {
      const listener = (event, status) => callback(status);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },

  // App controls
  app: {
    quit: () => ipcRenderer.send('app:quit'),
    toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
    getState: () => ipcRenderer.invoke('window:get-state'),
  },
});
