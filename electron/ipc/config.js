import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

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

// Get the icons directory path
const getIconsDir = () => {
  const userDataPath = app.getPath('userData');
  const iconsDir = path.join(userDataPath, 'icons');

  // Ensure the directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  return iconsDir;
};

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
      const buttonConfig = buttons[buttonId];

      // Clean up associated icon file if it's an image type
      if (buttonConfig?.icon?.type === 'image' && buttonConfig.icon.value) {
        try {
          const iconsDir = getIconsDir();
          const iconPath = path.join(iconsDir, buttonConfig.icon.value);
          if (fs.existsSync(iconPath)) {
            fs.unlinkSync(iconPath);
          }
        } catch (iconError) {
          console.warn('Failed to delete icon file:', iconError);
          // Continue with button deletion even if icon cleanup fails
        }
      }

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

  // Upload and save icon image
  ipcMain.handle('config:upload-icon', (event, buttonId, base64Data, originalFilename) => {
    try {
      if (!buttonId || typeof buttonId !== 'string') {
        throw new Error('Invalid button ID');
      }

      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid image data');
      }

      // Extract base64 data and mime type
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format');
      }

      const mimeType = matches[1];
      const base64Content = matches[2];

      // Validate mime type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/x-icon'];
      if (!validTypes.includes(mimeType)) {
        throw new Error('Invalid image type. Must be PNG, JPG, SVG, or ICO');
      }

      // Get file extension from mime type
      const ext = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/svg+xml': 'svg',
        'image/x-icon': 'ico',
      }[mimeType];

      // Create filename: buttonId-timestamp.ext
      const timestamp = Date.now();
      const filename = `${buttonId}-${timestamp}.${ext}`;

      // Get icons directory
      const iconsDir = getIconsDir();
      const filepath = path.join(iconsDir, filename);

      // Write file
      const buffer = Buffer.from(base64Content, 'base64');

      // Validate file size (512KB max)
      if (buffer.length > 512 * 1024) {
        throw new Error('Image file too large. Maximum size is 512KB');
      }

      fs.writeFileSync(filepath, buffer);

      return { success: true, filename, filepath };
    } catch (error) {
      console.error('Error uploading icon:', error);
      return { success: false, error: error.message };
    }
  });

  // Get icon file path
  ipcMain.handle('config:get-icon-path', (event, filename) => {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename');
      }

      const iconsDir = getIconsDir();
      const filepath = path.join(iconsDir, filename);

      if (!fs.existsSync(filepath)) {
        throw new Error('Icon file not found');
      }

      return { success: true, filepath };
    } catch (error) {
      console.error('Error getting icon path:', error);
      return { success: false, error: error.message };
    }
  });
}
