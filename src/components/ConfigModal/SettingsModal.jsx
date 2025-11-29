import { useState, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { DEFAULT_GRID_DIMENSIONS } from '../../utils/constants';
import styles from './SettingsModal.module.css';

export function SettingsModal({ isOpen, onClose }) {
  const { settings, saveSettings } = useConfig();
  const [rows, setRows] = useState(DEFAULT_GRID_DIMENSIONS.rows);
  const [columns, setColumns] = useState(DEFAULT_GRID_DIMENSIONS.columns);
  const [isSaving, setIsSaving] = useState(false);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setRows(settings?.gridDimensions?.rows || DEFAULT_GRID_DIMENSIONS.rows);
      setColumns(settings?.gridDimensions?.columns || DEFAULT_GRID_DIMENSIONS.columns);
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveSettings({
        ...settings,
        gridDimensions: {
          rows: parseInt(rows, 10),
          columns: parseInt(columns, 10),
        },
      });

      if (result.success) {
        onClose();
      } else {
        alert(`Failed to save settings: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to current settings
    setRows(settings?.gridDimensions?.rows || DEFAULT_GRID_DIMENSIONS.rows);
    setColumns(settings?.gridDimensions?.columns || DEFAULT_GRID_DIMENSIONS.columns);
    onClose();
  };

  const totalButtons = rows * columns;

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Grid Settings</h2>
          <button
            className={styles.closeButton}
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="rows" className={styles.label}>
              Rows
            </label>
            <input
              id="rows"
              type="number"
              min="1"
              max="10"
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="columns" className={styles.label}>
              Columns
            </label>
            <input
              id="columns"
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              Grid will have <strong>{totalButtons}</strong> buttons ({rows} rows × {columns} columns)
            </p>
            <p className={styles.warningText}>
              Note: Changing dimensions will preserve existing button configurations. New slots will be empty.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.saveButton}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
