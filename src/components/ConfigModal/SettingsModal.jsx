import { useState, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useUpdater } from '../../hooks/useUpdater';
import {
  DEFAULT_GRID_DIMENSIONS,
  METRICS_REFRESH_INTERVAL,
  METRICS_REFRESH_OPTIONS,
} from '../../utils/constants';
import styles from './SettingsModal.module.css';
import { UsageSettings } from './UsageSettings';

const SETTINGS_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'usage', label: 'AI usage' },
  { id: 'updates', label: 'Updates' },
];

function describeUpdate(update) {
  switch (update?.status) {
    case 'disabled': return 'Updates are off in development builds';
    case 'checking': return 'Checking for updates...';
    case 'available': return `Downloading ${update.version} (${update.percent ?? 0}%)`;
    case 'downloaded': return `Version ${update.version} is ready to install`;
    case 'not-available': return 'Up to date';
    case 'error': return `Update check failed: ${update.error}`;
    default: return 'Checks for updates automatically';
  }
}

export function SettingsModal({ isOpen, onClose }) {
  const { settings, saveSettings } = useConfig();
  const [rows, setRows] = useState(DEFAULT_GRID_DIMENSIONS.rows);
  const [columns, setColumns] = useState(DEFAULT_GRID_DIMENSIONS.columns);
  const [refreshInterval, setRefreshInterval] = useState(METRICS_REFRESH_INTERVAL);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usageEnabled, setUsageEnabled] = useState({ claude: false, codex: false });
  const { status: update, check: checkForUpdate, install: installUpdate } = useUpdater();

  const savedRefreshInterval = settings?.metricsRefreshInterval || METRICS_REFRESH_INTERVAL;

  // Include a stored value that isn't one of the presets so it still displays
  const refreshOptions = METRICS_REFRESH_OPTIONS.some(o => o.value === savedRefreshInterval)
    ? METRICS_REFRESH_OPTIONS
    : [
        ...METRICS_REFRESH_OPTIONS,
        { value: savedRefreshInterval, label: `Every ${savedRefreshInterval / 1000} seconds` },
      ].sort((a, b) => a.value - b.value);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('dashboard');
      setRows(settings?.gridDimensions?.rows || DEFAULT_GRID_DIMENSIONS.rows);
      setColumns(settings?.gridDimensions?.columns || DEFAULT_GRID_DIMENSIONS.columns);
      setRefreshInterval(settings?.metricsRefreshInterval || METRICS_REFRESH_INTERVAL);
      setUsageEnabled({ claude: settings?.aiUsage?.claude?.enabled || false, codex: settings?.aiUsage?.codex?.enabled || false });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveSettings({
        gridDimensions: {
          rows: parseInt(rows, 10),
          columns: parseInt(columns, 10),
        },
        metricsRefreshInterval: parseInt(refreshInterval, 10),
        aiUsage: { claude: { enabled: usageEnabled.claude }, codex: { enabled: usageEnabled.codex } },
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
    setRefreshInterval(settings?.metricsRefreshInterval || METRICS_REFRESH_INTERVAL);
    onClose();
  };

  const totalButtons = rows * columns;

  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % SETTINGS_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = SETTINGS_TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(SETTINGS_TABS[nextIndex].id);
    event.currentTarget.parentElement.children[nextIndex].focus();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="settings-title" className={styles.modalTitle}>Settings</h2>
          <button
            className={styles.closeButton}
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.tabList} role="tablist" aria-label="Settings areas">
          {SETTINGS_TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={styles.tab}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          <section role="tabpanel" id="settings-panel-dashboard" aria-labelledby="settings-tab-dashboard" hidden={activeTab !== 'dashboard'} tabIndex={0}>
            <h3 className={styles.sectionTitle}>Button grid</h3>
            <p className={styles.sectionDescription}>Choose how many rows and columns appear on your dashboard.</p>
            <div className={styles.fieldRow}>
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
            </div>

            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                Grid will have <strong>{totalButtons}</strong> buttons ({rows} rows × {columns} columns)
              </p>
              <p className={styles.warningText}>
                Note: Changing dimensions will preserve existing button configurations. New slots will be empty.
              </p>
            </div>

          </section>

          <section role="tabpanel" id="settings-panel-metrics" aria-labelledby="settings-tab-metrics" hidden={activeTab !== 'metrics'} tabIndex={0}>
            <h3 className={styles.sectionTitle}>System metrics</h3>
            <p className={styles.sectionDescription}>Control how often your system readings update.</p>
            <div className={styles.formGroup}>
              <label htmlFor="refreshInterval" className={styles.label}>
                Metrics Refresh
              </label>
              <select
                id="refreshInterval"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                className={styles.input}
              >
                {refreshOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className={styles.helpText}>
                Slower means fewer system queries. Paused while minimized.
              </p>
            </div>
          </section>

          <section role="tabpanel" id="settings-panel-usage" aria-labelledby="settings-tab-usage" hidden={activeTab !== 'usage'} tabIndex={0}>
            <UsageSettings enabled={usageEnabled} onChange={(id, enabled) => setUsageEnabled(previous => ({ ...previous, [id]: enabled }))} />
          </section>

          <section role="tabpanel" id="settings-panel-updates" aria-labelledby="settings-tab-updates" hidden={activeTab !== 'updates'} tabIndex={0}>
            <h3 className={styles.sectionTitle}>App updates</h3>
            <p className={styles.sectionDescription}>Keep SuperPanel up to date. Restart installs a downloaded update immediately.</p>
            <div className={styles.formGroup}>
              <span className={styles.label}>
                Updates{update?.currentVersion ? ` · v${update.currentVersion}` : ''}
              </span>
              <div className={styles.updateRow}>
                <p className={styles.helpText}>{describeUpdate(update)}</p>
                {update?.status === 'downloaded' ? (
                  <button className={`${styles.button} ${styles.saveButton} ${styles.updateButton}`} onClick={installUpdate}>
                    Restart
                  </button>
                ) : (
                  <button
                    className={`${styles.button} ${styles.cancelButton} ${styles.updateButton}`}
                    onClick={checkForUpdate}
                    disabled={!update || ['disabled', 'checking', 'available'].includes(update.status)}
                  >
                    Check now
                  </button>
                )}
              </div>
            </div>
          </section>
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
