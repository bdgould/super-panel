import { UsageError } from './errors.js';

const text = (value) => typeof value === 'string' ? value.slice(0, 160) : null;
const percent = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const secondsToMs = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1e11
  ? value * 1000 : null;

function durationLabel(minutes, fallback) {
  if (!minutes) return fallback;
  if (minutes % 1440 === 0) return `${minutes / 1440}-day window`;
  if (minutes % 60 === 0) return `${minutes / 60}-hour window`;
  return `${minutes}-minute window`;
}

export function normalizeCodex(payload, account, observedAt = Date.now()) {
  if (account?.type !== 'chatgpt' || !text(account.email)) {
    throw new UsageError('authentication', 'Connect a ChatGPT account to read Codex usage.');
  }
  const buckets = payload?.rateLimitsByLimitId && typeof payload.rateLimitsByLimitId === 'object'
    ? Object.entries(payload.rateLimitsByLimitId)
    : payload?.rateLimits ? [[payload.rateLimits.limitId || 'codex', payload.rateLimits]] : [];
  const windows = [];
  for (const [key, bucket] of buckets) {
    for (const slot of ['primary', 'secondary']) {
      const value = bucket?.[slot];
      if (value == null) continue;
      if (!percent(value.usedPercent)) throw new UsageError('invalid-data', 'Codex returned an invalid usage percentage.');
      const minutes = typeof value.windowDurationMins === 'number' && Number.isFinite(value.windowDurationMins) && value.windowDurationMins > 0
        ? value.windowDurationMins : null;
      const label = durationLabel(minutes, slot === 'primary' ? 'Primary window' : 'Secondary window');
      windows.push({ id: `${key}:${slot}`, label: buckets.length > 1 ? `${text(bucket.limitName) || text(key)} · ${label}` : label,
        usedPercent: value.usedPercent, durationMs: minutes == null ? null : minutes * 60000,
        resetsAt: secondsToMs(value.resetsAt), paceSupported: minutes != null });
    }
  }
  return { provider: 'codex', source: 'codex-app-server', account: { id: account.email, label: account.email, plan: text(account.planType) }, observedAt, windows };
}

// Extra spending and truly rolling limits are deliberately excluded. Claude
// timing remains unverified until the live connection gate; no invented tick.
export function normalizeClaude(payload, organization, observedAt = Date.now()) {
  if (!text(organization?.uuid)) throw new UsageError('invalid-data', 'Claude account could not be identified.');
  const windows = [];
  for (const [key, label] of [['five_hour', '5-hour window'], ['seven_day', '7-day window'],
    ['seven_day_sonnet', 'Sonnet · 7-day window'], ['seven_day_opus', 'Opus · 7-day window']]) {
    const value = payload?.[key];
    if (value == null) continue;
    if (!percent(value.utilization)) throw new UsageError('invalid-data', 'Claude returned an invalid usage percentage.');
    const parsed = typeof value.resets_at === 'string' ? Date.parse(value.resets_at) : NaN;
    windows.push({ id: key, label, usedPercent: value.utilization,
      durationMs: null, resetsAt: Number.isFinite(parsed) ? parsed : null, paceSupported: false });
  }
  return { provider: 'claude', source: 'claude-web', account: { id: organization.uuid,
    label: text(organization.name) || 'Claude account', plan: null }, observedAt, windows };
}
