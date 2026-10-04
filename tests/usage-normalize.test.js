import { describe, expect, it } from 'vitest';
import { normalizeClaude, normalizeCodex } from '../electron/usage/normalize.js';
import { isClaudeCookie, isClaudeLoginUrl, ClaudeProvider } from '../electron/usage/providers/claude.js';
import { publicError, UsageError } from '../electron/usage/errors.js';

const account = { type: 'chatgpt', email: 'example@test.invalid', planType: 'pro' };
const codexWindow = { usedPercent: 35, windowDurationMins: 300, resetsAt: 1800000000 };

describe('usage normalization', () => {
  it('prefers buckets without duplicating the legacy view and preserves distinct windows', () => {
    const result = normalizeCodex({ rateLimits: { primary: codexWindow }, rateLimitsByLimitId: {
      codex: { primary: codexWindow, secondary: { ...codexWindow, windowDurationMins: 10080 } },
      review: { primary: { ...codexWindow, usedPercent: 80 } },
    } }, account, 123);
    expect(result.windows).toHaveLength(3);
    expect(result.windows[0]).toMatchObject({ id: 'codex:primary', usedPercent: 35, resetsAt: 1800000000000, durationMs: 18000000 });
    expect(result.observedAt).toBe(123);
  });
  it('supports legacy and absent limits without fabricated zero readings', () => {
    expect(normalizeCodex({ rateLimits: { primary: codexWindow } }, account).windows).toHaveLength(1);
    expect(normalizeCodex({}, account).windows).toEqual([]);
    expect(() => normalizeCodex({}, { type: 'apiKey' })).toThrow('ChatGPT');
  });
  it.each([-1, 101, '35', NaN, null])('rejects invalid percentages: %s', usedPercent => {
    expect(() => normalizeCodex({ rateLimits: { primary: { ...codexWindow, usedPercent } } }, account)).toThrow('percentage');
    expect(() => normalizeClaude({ five_hour: { utilization: usedPercent } }, { uuid: 'org' })).toThrow('percentage');
  });
  it('converts Claude timestamps, preserves missing windows, and withholds unverified timing', () => {
    const result = normalizeClaude({ five_hour: { utilization: 0, resets_at: '2026-10-04T20:00:00Z' },
      seven_day: null }, { uuid: 'org', name: 'Personal' }, 123);
    expect(result.windows).toEqual([{ id: 'five_hour', label: '5-hour window', usedPercent: 0,
      resetsAt: Date.parse('2026-10-04T20:00:00Z'), durationMs: null, paceSupported: false }]);
    expect(normalizeClaude({}, { uuid: 'org' }).windows).toEqual([]);
  });
  it('does not treat malformed timestamps as current reset times', () => {
    expect(normalizeCodex({ rateLimits: { primary: { ...codexWindow, resetsAt: '1800000000' } } }, account).windows[0].resetsAt).toBeNull();
    expect(normalizeClaude({ five_hour: { utilization: 5, resets_at: 'bad' } }, { uuid: 'org' }).windows[0].resetsAt).toBeNull();
  });
});

describe('provider boundaries', () => {
  it('limits Claude cookies and login navigation to intended domains', () => {
    expect(isClaudeCookie({ domain: '.claude.ai' })).toBe(true);
    expect(isClaudeCookie({ domain: 'otherclaude.ai' })).toBe(false);
    expect(isClaudeLoginUrl('https://claude.ai/settings/usage')).toBe(true);
    expect(isClaudeLoginUrl('https://accounts.google.com/')).toBe(true);
    expect(isClaudeLoginUrl('https://claude.ai.evil.invalid')).toBe(false);
    expect(isClaudeLoginUrl('file:///C:/secret')).toBe(false);
  });
  it('does not forward unexpected exceptions or remote bodies', () => {
    expect(publicError(new Error('secret-cookie'))).toEqual({ code: 'unavailable', message: 'Usage could not be retrieved. Try again.', retryAfterMs: null });
    expect(publicError(new UsageError('rate-limited', 'Wait', 30000)).retryAfterMs).toBe(30000);
  });
  it('does not select an arbitrary Claude workspace', async () => {
    const provider = new ClaudeProvider({ directory: '.', session: {}, safeStorage: {} });
    provider.restored = true;
    provider.request = async () => [{ uuid: 'a', name: 'Personal' }, { uuid: 'b', name: 'Team' }];
    expect(await provider.read()).toEqual({ needsOrganization: true, organizations: [{ id: 'a', label: 'Personal' }, { id: 'b', label: 'Team' }] });
  });
});
