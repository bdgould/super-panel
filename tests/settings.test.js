import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REFRESH_INTERVAL,
  MAX_REFRESH_INTERVAL,
  MIN_REFRESH_INTERVAL,
  validateSettings,
  mergeSettings,
} from '../electron/utils/settings.js';
import { METRICS_REFRESH_INTERVAL, METRICS_REFRESH_OPTIONS } from '../src/utils/constants.js';

describe('refresh interval defaults', () => {
  it('main process default matches the renderer default', () => {
    expect(DEFAULT_REFRESH_INTERVAL).toBe(METRICS_REFRESH_INTERVAL);
  });

  it('every refresh option in the settings modal passes validation', () => {
    for (const option of METRICS_REFRESH_OPTIONS) {
      expect(() => validateSettings({ metricsRefreshInterval: option.value })).not.toThrow();
    }
  });
});

describe('AI usage settings', () => {
  it('defaults both providers to disabled and preserves independent provider updates', () => {
    expect(mergeSettings({}, {}).aiUsage).toEqual({ claude: { enabled: false }, codex: { enabled: false } });
    const first = mergeSettings({ theme: 'rgb-dark' }, { aiUsage: { codex: { enabled: true } } });
    const second = mergeSettings(first, { aiUsage: { claude: { enabled: true } } });
    expect(second.aiUsage).toEqual({ claude: { enabled: true }, codex: { enabled: true } });
    expect(second.theme).toBe('rgb-dark');
  });
  it.each([null, [], { other: { enabled: true } }, { claude: { enabled: 'yes' } },
    { claude: { enabled: true, token: 'secret' } }])('rejects invalid usage settings: %s', aiUsage => {
    expect(() => validateSettings({ aiUsage })).toThrow('AI usage');
  });
});

describe('validateSettings', () => {
  it('rejects non-objects', () => {
    expect(() => validateSettings(null)).toThrow('Invalid settings object');
    expect(() => validateSettings('fast')).toThrow('Invalid settings object');
  });

  it('accepts settings without a refresh interval', () => {
    expect(() => validateSettings({ theme: 'rgb-dark' })).not.toThrow();
  });

  it('accepts the bounds', () => {
    expect(() => validateSettings({ metricsRefreshInterval: MIN_REFRESH_INTERVAL })).not.toThrow();
    expect(() => validateSettings({ metricsRefreshInterval: MAX_REFRESH_INTERVAL })).not.toThrow();
  });

  it.each([MIN_REFRESH_INTERVAL - 1, MAX_REFRESH_INTERVAL + 1, 1500.5, '6000', NaN, null])(
    'rejects a refresh interval of %s',
    value => {
      expect(() => validateSettings({ metricsRefreshInterval: value })).toThrow('Refresh interval');
    }
  );
});
