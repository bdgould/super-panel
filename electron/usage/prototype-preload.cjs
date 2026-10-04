const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('usagePrototype', {
  action: (provider, action, organizationId) => ipcRenderer.invoke('usage-prototype:action', provider, action, organizationId),
  onNotice: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('usage-prototype:notice', listener);
    return () => ipcRenderer.removeListener('usage-prototype:notice', listener);
  },
});
