export const USAGE_STALE_MS = 360000;

// A 270-degree dial leaves room for labels at the bottom.
export function usageDialPoint(percent, radius) {
  const angle = (135 + Math.min(100, Math.max(0, percent)) * 2.7) * Math.PI / 180;
  return { x: 80 + radius * Math.cos(angle), y: 80 + radius * Math.sin(angle) };
}

export function windowDisplay(window, snapshot, now = Date.now()) {
  const expired = Number.isFinite(window.resetsAt) && now >= window.resetsAt;
  const stale = !Number.isFinite(snapshot?.observedAt) || now - snapshot.observedAt >= USAGE_STALE_MS;
  const duration = window.durationMs;
  const start = window.resetsAt - duration;
  const pace = !expired && !stale && window.paceSupported && Number.isFinite(duration) && duration > 0 &&
    Number.isFinite(window.resetsAt) && now >= start
    ? Math.min(100, Math.max(0, 100 * (now - start) / duration)) : null;
  const difference = pace == null ? null : window.usedPercent - pace;
  const roundedDifference = difference == null ? null : Math.round(Math.abs(difference));
  const paceLabel = difference == null ? null : roundedDifference < 1 ? 'At even pace'
    : `${roundedDifference} ${roundedDifference === 1 ? 'point' : 'points'} ${difference > 0 ? 'above' : 'below'} pace`;
  return { expired, stale, pace, paceLabel, abovePace: difference != null && difference > 1 };
}

export function formatCountdown(resetsAt, now = Date.now()) {
  if (!Number.isFinite(resetsAt)) return 'Reset time unavailable';
  if (resetsAt <= now) return 'Awaiting updated window';
  const minutes = Math.ceil((resetsAt - now) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  const remaining = minutes % 60;
  if (days) return `Resets in ${days}d ${hours}h`;
  if (hours) return `Resets in ${hours}h ${remaining}m`;
  return `Resets in ${minutes}m`;
}

export function formatObservation(observedAt, now = Date.now()) {
  if (!Number.isFinite(observedAt)) return 'Waiting for usage data';
  const seconds = Math.max(0, Math.floor((now - observedAt) / 1000));
  if (seconds < 60) return 'Updated just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

export function visibleUsageProviders(settings, status) {
  return ['claude', 'codex'].filter(id => settings?.aiUsage?.[id]?.enabled && status?.[id]?.configured);
}
