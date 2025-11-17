const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // System metrics
  metrics: {
    getCPU: () => ipcRenderer.invoke('metrics:cpu'),
    getMemory: () => ipcRenderer.invoke('metrics:memory'),
    getNetwork: () => ipcRenderer.invoke('metrics:network'),
    getDisk: () => ipcRenderer.invoke('metrics:disk'),
    getTemperature: () => ipcRenderer.invoke('metrics:temperature'),
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
    getButtons: () => ipcRenderer.invoke('config:get-buttons'),
    saveButton: (buttonId, config) => ipcRenderer.invoke('config:save-button', buttonId, config),
    deleteButton: (buttonId) => ipcRenderer.invoke('config:delete-button', buttonId),
    getSettings: () => ipcRenderer.invoke('config:get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('config:save-settings', settings),
    uploadIcon: (buttonId, base64Data, filename) => ipcRenderer.invoke('config:upload-icon', buttonId, base64Data, filename),
    getIconPath: (filename) => ipcRenderer.invoke('config:get-icon-path', filename),
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
