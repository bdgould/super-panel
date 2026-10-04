// Keep in sync with METRICS_REFRESH_INTERVAL in src/utils/constants.js
// (the packaged app does not ship src/, so it can't be imported here).
// tests/settings.test.js fails if the two drift apart.
export const DEFAULT_REFRESH_INTERVAL = 6000;
export const MIN_REFRESH_INTERVAL = 1000;
export const MAX_REFRESH_INTERVAL = 300000;

// Throws if a settings object from the renderer is not safe to store.
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Invalid settings object');
  }

  if ('metricsRefreshInterval' in settings) {
    const interval = settings.metricsRefreshInterval;
    if (!Number.isInteger(interval) || interval < MIN_REFRESH_INTERVAL || interval > MAX_REFRESH_INTERVAL) {
      throw new Error(
        `Refresh interval must be a whole number of ms between ${MIN_REFRESH_INTERVAL} and ${MAX_REFRESH_INTERVAL}`
      );
    }
  }
}
