// Touch target sizes
export const BUTTON_SIZE = {
  MIN: 44, // Minimum accessible touch target
  COMFORTABLE: 60, // Comfortable touch target
  LARGE: 80, // Large touch target for primary actions
};

// Long press duration (ms)
export const LONG_PRESS_DURATION = 800;

// Swipe thresholds
export const SWIPE_THRESHOLD = 50; // Minimum distance for swipe detection (px)
export const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for swipe (px/ms)

// Metrics refresh interval
export const METRICS_REFRESH_INTERVAL = 2000; // ms

// Button action types
export const ACTION_TYPES = {
  LAUNCH_APP: 'launch-app',
  RUN_COMMAND: 'run-command',
  OPEN_URL: 'open-url',
  SYSTEM_CONTROL: 'system-control',
};

// System control actions
export const SYSTEM_CONTROLS = {
  LOCK: 'lock',
  SLEEP: 'sleep',
  RESTART: 'restart',
  SHUTDOWN: 'shutdown',
  VOLUME_UP: 'volume-up',
  VOLUME_DOWN: 'volume-down',
  VOLUME_MUTE: 'volume-mute',
};

// View modes for swipe navigation
export const VIEW_MODES = {
  BUTTONS_ONLY: 'buttons-only',
  SPLIT: 'split',
  METRICS_ONLY: 'metrics-only',
};

// Default button configuration
export const DEFAULT_BUTTON_CONFIG = {
  label: 'New Button',
  icon: {
    type: 'emoji',
    value: '⚡',
  },
  actionType: ACTION_TYPES.LAUNCH_APP,
  actionData: {},
  color: '#00d9ff',
};

// Honeycomb layout configuration
export const HONEYCOMB_CONFIG = {
  BUTTON_SIZE: BUTTON_SIZE.COMFORTABLE,
  GAP: 8,
  COLUMNS: 4,
  ROWS: 3,
};

// Default grid dimensions
export const DEFAULT_GRID_DIMENSIONS = {
  rows: 3,
  columns: 4,
};

// Format bytes to human readable
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format network speed
export function formatSpeed(bytesPerSecond) {
  return formatBytes(bytesPerSecond, 1) + '/s';
}

// Clamp a value between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
