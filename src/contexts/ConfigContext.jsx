import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_BUTTON_CONFIG } from '../utils/constants';

const ConfigContext = createContext();

// Helper function to migrate old icon format (string) to new format (object)
const migrateIconFormat = (icon) => {
  // If icon is already an object with type property, it's already migrated
  if (icon && typeof icon === 'object' && icon.type) {
    return icon;
  }

  // If icon is a string, convert to new format (assume emoji)
  if (typeof icon === 'string') {
    return {
      type: 'emoji',
      value: icon,
    };
  }

  // Default fallback
  return {
    type: 'emoji',
    value: '⚡',
  };
};

export function ConfigProvider({ children }) {
  const [buttons, setButtons] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [buttonsData, settingsData] = await Promise.all([
          window.electron.config.getButtons(),
          window.electron.config.getSettings(),
        ]);

        // Migrate icon format for all buttons
        const migratedButtons = {};
        let needsMigration = false;

        Object.entries(buttonsData).forEach(([buttonId, config]) => {
          const originalIcon = config.icon;
          const migratedIcon = migrateIconFormat(originalIcon);

          // Check if migration was needed
          if (originalIcon !== migratedIcon) {
            needsMigration = true;
          }

          migratedButtons[buttonId] = {
            ...config,
            icon: migratedIcon,
          };
        });

        // If migration occurred, save the migrated data back to storage
        if (needsMigration) {
          console.log('Migrating icon format for buttons...');
          // Save each migrated button
          for (const [buttonId, config] of Object.entries(migratedButtons)) {
            await window.electron.config.saveButton(buttonId, config);
          }
        }

        setButtons(migratedButtons);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading configuration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save a button configuration
  const saveButton = useCallback(async (buttonId, config) => {
    try {
      const mergedConfig = {
        ...DEFAULT_BUTTON_CONFIG,
        ...config,
      };

      const result = await window.electron.config.saveButton(buttonId, mergedConfig);

      if (result.success) {
        setButtons(prev => ({
          ...prev,
          [buttonId]: result.button,
        }));
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving button:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Delete a button configuration
  const deleteButton = useCallback(async (buttonId) => {
    try {
      const result = await window.electron.config.deleteButton(buttonId);

      if (result.success) {
        setButtons(prev => {
          const newButtons = { ...prev };
          delete newButtons[buttonId];
          return newButtons;
        });
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting button:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Save application settings
  const saveSettings = useCallback(async (newSettings) => {
    try {
      const result = await window.electron.config.saveSettings(newSettings);

      if (result.success) {
        setSettings(result.settings);
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Execute a button action
  const executeAction = useCallback(async (config) => {
    try {
      const { actionType, actionData } = config;

      let result;
      switch (actionType) {
        case 'launch-app':
          result = await window.electron.actions.launchApp(
            actionData.path,
            actionData.args || []
          );
          break;
        case 'run-command':
          result = await window.electron.actions.runCommand(actionData.command);
          break;
        case 'open-url':
          result = await window.electron.actions.openUrl(actionData.url);
          break;
        case 'system-control':
          result = await window.electron.actions.systemControl(actionData.action);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      return result;
    } catch (error) {
      console.error('Error executing action:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    buttons,
    settings,
    loading,
    saveButton,
    deleteButton,
    saveSettings,
    executeAction,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
