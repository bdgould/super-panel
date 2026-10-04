import { useState } from 'react';
import { DetailedMetricModal } from '../MetricsPanel/DetailedMetricModal';
import { useLongPress } from '../../hooks/useLongPress';
import { windowDisplay, formatCountdown, usageDialPoint, USAGE_STALE_MS } from '../../utils/usage';
import styles from './UsagePanel.module.css';
import claudeLogo from '../../assets/providers/claude.png';
import codexLogo from '../../assets/providers/codex.svg';

const titles = { claude: 'Anthropic · Claude', codex: 'OpenAI · Codex' };
const exactTime = value => Number.isFinite(value) ? new Date(value).toLocaleString() : 'Unavailable';

export function UsageCard({ provider, state, now, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const longPress = useLongPress(() => setExpanded(true));
  const snapshot = state.snapshot;
  const stale = snapshot && now - snapshot.observedAt >= USAGE_STALE_MS;
  const waiting = !snapshot;
  const reconnect = state.connection === 'reconnect-required';
  const title = titles[provider];
  const windows = snapshot?.windows || [];
  const primary = provider === 'claude' ? windows.filter(window => ['five_hour', 'seven_day'].includes(window.id)) : windows;
  const dials = (primary.length ? primary : windows).slice(0, 2).sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0));
  const dialLabel = window => window.durationMs === 18000000 ? 'Session' : window.durationMs === 604800000 ? 'Weekly' : window.label;
  return (
    <>
      <article className={`${styles.card} ${styles[provider]}`} {...longPress} tabIndex={0}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setExpanded(true); } }}
        aria-label={`${title} usage. Press and hold for details.`} data-usage-provider={provider}>
        <div className={styles.header}>
          <h3><img className={styles.providerLogo} src={provider === 'claude' ? claudeLogo : codexLogo}
            alt={provider === 'claude' ? 'Claude' : 'Codex'} draggable="false" /></h3>
        </div>
        <div className={styles.dial}>
          <svg viewBox="0 0 160 160" aria-label={`${title} concentric usage dials`}>
            {dials.map((window, index) => {
              const display = windowDisplay(window, snapshot, now);
              const radius = index === 0 ? 66 : 53;
              const circumference = 2 * Math.PI * radius;
              const a = usageDialPoint(display.pace ?? 0, radius - 6);
              const b = usageDialPoint(display.pace ?? 0, radius + 6);
              return <g key={window.id} className={`${index ? styles.innerRing : styles.outerRing} ${display.stale ? styles.oldReading : ''}`}
                role={display.expired ? 'img' : 'progressbar'} aria-label={`${title}, ${window.label}${display.expired ? ', awaiting updated window' : display.stale ? ', last known usage' : ''}`}
                aria-valuemin={display.expired ? undefined : 0} aria-valuemax={display.expired ? undefined : 100}
                aria-valuenow={display.expired ? undefined : window.usedPercent}
                aria-valuetext={`${display.expired ? 'Awaiting updated window' : `${window.usedPercent}% used`}${display.paceLabel ? `, ${display.paceLabel}` : ''}`}>
                <circle cx="80" cy="80" r={radius} className={styles.ringTrack} fill="none" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${circumference * .75} ${circumference}`} transform="rotate(135 80 80)" />
                {!display.expired && <circle cx="80" cy="80" r={radius} className={`${styles.ringFill} ${window.usedPercent >= 100 ? styles.exhausted : ''}`} fill="none" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${circumference * .75 * window.usedPercent / 100} ${circumference}`} transform="rotate(135 80 80)" />}
                {display.pace != null && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.paceMarker} data-pace-marker aria-hidden="true" />}
              </g>;
            })}
          </svg>
          <div className={styles.dialValue} aria-hidden="true">
            {[...dials].reverse().map(window => <span key={window.id} className={window.durationMs === 18000000 ? styles.sessionValue : styles.weeklyValue}>
              {windowDisplay(window, snapshot, now).expired ? '—' : `${Math.round(window.usedPercent)}%`}<small>{dialLabel(window)}</small>
            </span>)}
          </div>
        </div>
        <div className={styles.windows}>
          {(waiting || !snapshot.windows.length) && <p className={styles.empty}>
            {reconnect ? 'Reconnect in Settings to resume usage updates.' : waiting ? 'Waiting for usage data…' : 'No usage windows reported for this account.'}
          </p>}
        </div>
        {state.error && <p className={styles.error} role="status">{state.error.message}</p>}
        {stale && <p className={styles.error}>Stale reading</p>}
        <span className={styles.pressHint}>Press &amp; hold</span>
      </article>
      <DetailedMetricModal isOpen={expanded} onClose={() => setExpanded(false)} title={`${title} usage details`}>
        <div className={styles.detailContent} style={{ '--usage-color': provider === 'claude' ? 'var(--color-accent-purple)' : 'var(--color-accent-cyan)' }}>
          <p>{state.account?.label}</p>
          <p>Source: {snapshot?.source === 'claude-web' ? 'Claude web account' : snapshot?.source === 'codex-app-server' ? 'Codex app server' : 'Waiting for reading'}</p>
          <p>Last reading: {exactTime(snapshot?.observedAt)}</p>
          <button type="button" className={styles.refreshButton} disabled={state.refreshing || reconnect || state.connection === 'connecting'} onClick={onRefresh}
            aria-label={`Refresh ${title} usage`}>{state.refreshing ? 'Refreshing…' : 'Refresh'}</button>
          {snapshot?.windows.map(window => {
            const display = windowDisplay(window, snapshot, now);
            return <div key={window.id} className={styles.detailWindow}>
            <strong>{window.label}</strong>
            <p>Last reported usage: {window.usedPercent}%</p>
            <div className={styles.detailTrack} role={display.expired ? 'img' : 'progressbar'}
              aria-label={`${window.label}${display.expired ? ', awaiting updated window' : ', usage'}`}
              aria-valuemin={display.expired ? undefined : 0} aria-valuemax={display.expired ? undefined : 100}
              aria-valuenow={display.expired ? undefined : window.usedPercent}>
              {!display.expired && <div className={`${styles.detailFill} ${display.stale ? styles.staleFill : ''}`}
                style={{ width: `${window.usedPercent}%`, background: window.usedPercent >= 100 ? 'var(--color-error)' : undefined }} />}
              {display.pace != null && <span className={styles.detailTick} style={{ left: `${display.pace}%` }} aria-hidden="true" data-detail-pace-marker />}
            </div>
            <p>Reset: {exactTime(window.resetsAt)}</p>
            <p>{formatCountdown(window.resetsAt, now)} · {windowDisplay(window, snapshot, now).paceLabel || 'Pace unavailable'}</p>
          </div>; })}
          <p>The outer arc shows {dials[0]?.label || 'the first window'}; the inner arc shows {dials[1]?.label || 'the second window'}. Each white tick shows the elapsed share of its window: an even-use budgeting reference. Ticks appear when timing is known and the reading is current. All additional windows are listed here.</p>
          <p>Manage visibility and reconnect accounts under Settings → AI usage.</p>
        </div>
      </DetailedMetricModal>
    </>
  );
}
