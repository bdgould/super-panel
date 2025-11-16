import { useState, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { ACTION_TYPES, SYSTEM_CONTROLS, DEFAULT_BUTTON_CONFIG } from '../../utils/constants';
import styles from './ButtonConfigModal.module.css';

export function ButtonConfigModal({ isOpen, onClose, buttonId, initialConfig }) {
  const { saveButton, deleteButton } = useConfig();

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [actionType, setActionType] = useState(ACTION_TYPES.LAUNCH_APP);
  const [actionData, setActionData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with existing config or defaults
  useEffect(() => {
    if (isOpen) {
      const config = initialConfig || DEFAULT_BUTTON_CONFIG;
      setLabel(config.label || DEFAULT_BUTTON_CONFIG.label);
      setIcon(config.icon || DEFAULT_BUTTON_CONFIG.icon);
      setColor(config.color || DEFAULT_BUTTON_CONFIG.color);
      setActionType(config.actionType || DEFAULT_BUTTON_CONFIG.actionType);
      setActionData(config.actionData || {});
    }
  }, [isOpen, initialConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const config = {
        label,
        icon,
        color,
        actionType,
        actionData,
      };

      const result = await saveButton(buttonId, config);
      if (result.success) {
        onClose();
      } else {
        alert('Failed to save button: ' + result.error);
      }
    } catch (error) {
      alert('Error saving button: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this button?')) {
      const result = await deleteButton(buttonId);
      if (result.success) {
        onClose();
      } else {
        alert('Failed to delete button: ' + result.error);
      }
    }
  };

  const updateActionData = (key, value) => {
    setActionData(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Configure Button</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Basic Settings */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Appearance</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Label</label>
              <input
                type="text"
                className={styles.input}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Button Label"
                maxLength={20}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Icon (emoji or character)</label>
              <input
                type="text"
                className={styles.input}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="⚡"
                maxLength={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Color</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#00d9ff"
                />
              </div>
            </div>
          </div>

          {/* Action Settings */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Action</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Action Type</label>
              <select
                className={styles.select}
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                <option value={ACTION_TYPES.LAUNCH_APP}>Launch Application</option>
                <option value={ACTION_TYPES.RUN_COMMAND}>Run Command</option>
                <option value={ACTION_TYPES.OPEN_URL}>Open URL</option>
                <option value={ACTION_TYPES.SYSTEM_CONTROL}>System Control</option>
              </select>
            </div>

            {/* Action-specific fields */}
            {actionType === ACTION_TYPES.LAUNCH_APP && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Application Path</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={actionData.path || ''}
                    onChange={(e) => updateActionData('path', e.target.value)}
                    placeholder="C:\Program Files\App\app.exe"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Arguments (optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={actionData.args?.join(' ') || ''}
                    onChange={(e) => updateActionData('args', e.target.value.split(' ').filter(Boolean))}
                    placeholder="--flag value"
                  />
                </div>
              </>
            )}

            {actionType === ACTION_TYPES.RUN_COMMAND && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Command</label>
                <textarea
                  className={styles.textarea}
                  value={actionData.command || ''}
                  onChange={(e) => updateActionData('command', e.target.value)}
                  placeholder="Get-Process | Select-Object -First 5"
                  rows={3}
                />
              </div>
            )}

            {actionType === ACTION_TYPES.OPEN_URL && (
              <div className={styles.formGroup}>
                <label className={styles.label}>URL</label>
                <input
                  type="text"
                  className={styles.input}
                  value={actionData.url || ''}
                  onChange={(e) => updateActionData('url', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}

            {actionType === ACTION_TYPES.SYSTEM_CONTROL && (
              <div className={styles.formGroup}>
                <label className={styles.label}>System Action</label>
                <select
                  className={styles.select}
                  value={actionData.action || SYSTEM_CONTROLS.LOCK}
                  onChange={(e) => updateActionData('action', e.target.value)}
                >
                  <option value={SYSTEM_CONTROLS.LOCK}>Lock Screen</option>
                  <option value={SYSTEM_CONTROLS.SLEEP}>Sleep</option>
                  <option value={SYSTEM_CONTROLS.RESTART}>Restart</option>
                  <option value={SYSTEM_CONTROLS.SHUTDOWN}>Shutdown</option>
                  <option value={SYSTEM_CONTROLS.VOLUME_UP}>Volume Up</option>
                  <option value={SYSTEM_CONTROLS.VOLUME_DOWN}>Volume Down</option>
                  <option value={SYSTEM_CONTROLS.VOLUME_MUTE}>Volume Mute</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {initialConfig && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete
            </button>
          )}
          <div className={styles.footerRight}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
