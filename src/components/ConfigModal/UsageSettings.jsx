import { useState } from 'react';
import { useUsage } from '../../contexts/UsageContext';
import styles from './SettingsModal.module.css';

const names = { claude: 'Anthropic · Claude', codex: 'OpenAI · Codex' };
export function UsageSettings({ enabled, onChange }) {
  const { status, error, act } = useUsage();
  const [busy, setBusy] = useState({});
  const [organizations, setOrganizations] = useState({});
  const perform = async (id, action) => {
    setBusy(previous => ({ ...previous, [id]: true }));
    const result = await act(action, ...(action === 'chooseRuntime' ? [] : [id, organizations[id] || null]));
    if (action === 'disconnect' && result.success) onChange(id, false);
    setBusy(previous => ({ ...previous, [id]: false }));
  };
  return (
    <section className={styles.usageSection} aria-labelledby="usage-settings-title">
      <h3 id="usage-settings-title" className={styles.label}>AI usage</h3>
      <p className={styles.helpText}>Connect each account to show its usage windows. Sign-in and Disconnect take effect immediately; dashboard visibility changes when you Save.</p>
      {Object.entries(names).map(([id, name]) => {
        const state = status[id];
        const connecting = state?.connection === 'connecting';
        const connected = state?.connection === 'connected' && state.configured;
        const disabled = busy[id] || state?.refreshing;
        return (
          <div className={styles.usageProvider} key={id}>
            <h4 className={styles.usageName}>{name}</h4>
            <p className={styles.helpText} role="status">
              {state?.account?.label && <span>{state.account.label} · </span>}
              {connecting ? 'Waiting for sign-in' : connected ? 'Connected' : state?.configured ? 'Reconnect required' : 'Not connected'}
            </p>
            {state?.snapshot && <p className={styles.helpText}>
              {state.snapshot.windows.length ? state.snapshot.windows.map(window => `${window.label}: ${Math.round(window.usedPercent)}%`).join(' · ') : 'No usage windows reported'}
              {' · Updated '}{new Date(state.snapshot.observedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>}
            {state?.error && <p className={styles.usageError} role="status">{state.error.message}</p>}
            {state?.organizations?.length > 0 && <label className={styles.helpText}>
              Claude workspace
              <select className={styles.input} value={organizations[id] || ''} onChange={event => setOrganizations(previous => ({ ...previous, [id]: event.target.value }))}>
                <option value="">Choose a workspace</option>
                {state.organizations.map(org => <option key={org.id} value={org.id}>{org.label}</option>)}
              </select>
            </label>}
            <div className={styles.usageActions}>
              {!connecting && <button type="button" className={`${styles.button} ${styles.cancelButton}`} disabled={disabled} onClick={() => perform(id, 'connect')}>
                {state?.configured ? 'Reconnect' : 'Connect'}
              </button>}
              {(connecting || state?.configured) && <button type="button" className={`${styles.button} ${styles.cancelButton}`} disabled={disabled || (state.organizations?.length > 0 && !organizations[id])} onClick={() => perform(id, 'refresh')}>
                {state?.refreshing ? 'Refreshing…' : connecting ? 'Check connection' : 'Refresh'}
              </button>}
              {(connecting || state?.configured) && <button type="button" className={`${styles.button} ${styles.cancelButton}`} disabled={disabled} onClick={() => perform(id, 'disconnect')}>Disconnect</button>}
              {id === 'codex' && !connecting && <button type="button" className={`${styles.button} ${styles.cancelButton}`} disabled={disabled} onClick={() => perform(id, 'chooseRuntime')}>Choose executable</button>}
            </div>
            {state?.configured && <label className={styles.usageToggle}>
              <input type="checkbox" checked={enabled[id] || false} onChange={event => onChange(id, event.target.checked)} />
              Show on dashboard
            </label>}
            <p className={styles.helpText}>{id === 'claude'
              ? 'Reads your Claude web account directly; Claude Code can be closed.'
              : 'Uses an installed Codex runtime and a separate sign-in. No coding session needs to be running.'}</p>
          </div>
        );
      })}
      {error && <p className={styles.usageError} role="alert">{error}</p>}
    </section>
  );
}
