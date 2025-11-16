import Store from 'electron-store';

const store = new Store({
  name: 'super-panel-config',
  defaults: {
    buttons: {},
    settings: {
      theme: 'rgb-dark',
      metricsRefreshInterval: 2000,
    },
  },
});

export function setupConfigHandlers(ipcMain) {
  // Get all button configurations
  ipcMain.handle('config:get-buttons', () => {
    try {
      return store.get('buttons', {});
    } catch (error) {
      console.error('Error getting buttons config:', error);
      return {};
    }
  });

  // Save a button configuration
  ipcMain.handle('config:save-button', (event, buttonId, config) => {
    try {
      if (!buttonId || typeof buttonId !== 'string') {
        throw new Error('Invalid button ID');
      }

      const buttons = store.get('buttons', {});
      buttons[buttonId] = {
        ...config,
        updatedAt: Date.now(),
      };

      store.set('buttons', buttons);

      return { success: true, button: buttons[buttonId] };
    } catch (error) {
      console.error('Error saving button config:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete a button configuration
  ipcMain.handle('config:delete-button', (event, buttonId) => {
    try {
      if (!buttonId || typeof buttonId !== 'string') {
        throw new Error('Invalid button ID');
      }

      const buttons = store.get('buttons', {});
      delete buttons[buttonId];

      store.set('buttons', buttons);

      return { success: true };
    } catch (error) {
      console.error('Error deleting button config:', error);
      return { success: false, error: error.message };
    }
  });

  // Get application settings
  ipcMain.handle('config:get-settings', () => {
    try {
      return store.get('settings', {});
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  });

  // Save application settings
  ipcMain.handle('config:save-settings', (event, settings) => {
    try {
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings object');
      }

      const currentSettings = store.get('settings', {});
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: Date.now(),
      };

      store.set('settings', updatedSettings);

      return { success: true, settings: updatedSettings };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  });
}
