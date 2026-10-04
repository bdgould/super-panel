import { describe, expect, it } from 'vitest';
import { windowDisplay, formatCountdown, formatObservation, visibleUsageProviders, usageDialPoint } from '../src/utils/usage.js';
import { USAGE_STALE_MS } from '../electron/usage/service.js';
import { USAGE_STALE_MS as DISPLAY_STALE_MS } from '../src/utils/usage.js';

const now = 1800000000000;
const duration = 18000000;
const window = { usedPercent: 35, durationMs: duration, resetsAt: now + duration * .4, paceSupported: true };

describe('usage dial display', () => {
  it('places ticks along the same 270-degree arc as usage on either radius', () => {
    expect(usageDialPoint(50, 66).x).toBeCloseTo(80);
    expect(usageDialPoint(50, 66).y).toBeCloseTo(14);
    expect(usageDialPoint(50, 53).y).toBeCloseTo(27);
    expect(usageDialPoint(-10, 66)).toEqual(usageDialPoint(0, 66));
    expect(usageDialPoint(110, 66)).toEqual(usageDialPoint(100, 66));
    expect(usageDialPoint(0, 66).x).toBeLessThan(80);
    expect(usageDialPoint(100, 66).x).toBeGreaterThan(80);
  });
  it('puts even pace at elapsed time rather than usage percentage', () => {
    expect(windowDisplay(window, { observedAt: now }, now)).toMatchObject({ pace: 60, paceLabel: '25 points below pace', abovePace: false });
    expect(windowDisplay({ ...window, usedPercent: 72 }, { observedAt: now }, now)).toMatchObject({ paceLabel: '12 points above pace', abovePace: true });
  });
  it('supports start, end, and missing or unverified timing without a misleading tick', () => {
    expect(windowDisplay({ ...window, resetsAt: now + duration }, { observedAt: now }, now).pace).toBe(0);
    expect(windowDisplay({ ...window, resetsAt: now }, { observedAt: now }, now)).toMatchObject({ pace: null, expired: true });
    for (const patch of [{ durationMs: null }, { resetsAt: null }, { paceSupported: false }, { resetsAt: now + duration * 2 }]) {
      expect(windowDisplay({ ...window, ...patch }, { observedAt: now }, now).pace).toBeNull();
    }
  });
  it('withholds the time tick on stale readings', () => {
    expect(DISPLAY_STALE_MS).toBe(USAGE_STALE_MS);
    expect(windowDisplay(window, { observedAt: now - USAGE_STALE_MS }, now)).toMatchObject({ stale: true, pace: null });
  });
  it('formats countdown boundaries without claiming an expired window reset to zero', () => {
    expect(formatCountdown(null, now)).toBe('Reset time unavailable');
    expect(formatCountdown(now - 1, now)).toBe('Awaiting updated window');
    expect(formatCountdown(now + 100, now)).toBe('Resets in 1m');
    expect(formatCountdown(now + 3660000, now)).toBe('Resets in 1h 1m');
    expect(formatCountdown(now + 90000000, now)).toBe('Resets in 1d 1h');
  });
  it('formats original observation age', () => {
    expect(formatObservation(null, now)).toBe('Waiting for usage data');
    expect(formatObservation(now, now)).toBe('Updated just now');
    expect(formatObservation(now - 180000, now)).toBe('Updated 3m ago');
  });
  it('shows cards only for providers that are both configured and enabled', () => {
    const settings = { aiUsage: { claude: { enabled: true }, codex: { enabled: false } } };
    expect(visibleUsageProviders(settings, { claude: { configured: true }, codex: { configured: true } })).toEqual(['claude']);
    expect(visibleUsageProviders(settings, { claude: { configured: false } })).toEqual([]);
    expect(visibleUsageProviders({}, {})).toEqual([]);
  });
});
