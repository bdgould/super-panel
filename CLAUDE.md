# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuperPanel is an Electron-based touchscreen dashboard for Windows that displays system metrics and provides configurable action buttons. Built with React + Vite, optimized for touch interaction with swipe gestures and long-press actions.

## Development Commands

### Running the App

```bash
# Development mode (recommended)
npm run electron:dev
# Runs Vite dev server + Electron concurrently with HMR

# Vite dev server only
npm run dev

# Build for production
npm run build

# Build Windows installer
npm run electron:build:win
# Output: dist-electron/*.exe
```

### Node Version

Use Node.js v24.11.0 (LTS). An `.nvmrc` file is provided:
```bash
nvm use
```

## Architecture

### Electron Process Model

**Main Process** (`electron/main.js`):
- Window lifecycle management
- IPC handler registration
- Frameless window with custom title bar
- Node.js runtime with full system access

**Renderer Process** (`src/`):
- React 18 SPA running in Chromium
- Context isolation enabled for security
- Communicates with main via IPC through preload script

**Preload Script** (`electron/preload.cjs`):
- **Uses CommonJS** (not ES modules) - Electron requirement
- Exposes `window.electron` API to renderer
- Security boundary - only whitelisted IPC methods exposed

### IPC Communication Pattern

All IPC follows a consistent pattern:

**Preload exposes methods:**
```javascript
window.electron.{category}.{method}()
```

**Categories:**
- `metrics.*` - System information (CPU, RAM, network, disk, temperature)
- `actions.*` - Button actions (launch app, run command, open URL, system control)
- `config.*` - Configuration persistence (get/save/delete buttons, settings)
- `window.*` - Window controls (minimize, maximize, fullscreen, close)
- `app.*` - Application controls (quit)

**Handler pattern** (in `electron/ipc/*.js`):
```javascript
ipcMain.handle('category:method', async (event, ...args) => {
  try {
    // Validate inputs
    // Perform operation
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### State Management

**React Context + Hooks** (no Redux):

- **ConfigContext** - Button configurations and settings
  - Loads from electron-store on mount
  - Provides `saveButton()`, `deleteButton()`, `executeAction()`
  - Persists to `%APPDATA%\super-panel-config\config.json`

- **MetricsContext** - System metrics
  - Polls every 2 seconds via IPC
  - Provides individual and bulk fetch methods
  - Auto-cleanup on unmount

### Component Architecture

**View Hierarchy:**
```
App
├── ConfigProvider
├── MetricsProvider
├── TitleBar (custom window controls)
└── Dashboard (view mode management)
    ├── HoneycombGrid
    │   └── HoneycombButton (12 buttons, 4x3 grid)
    ├── MetricsPanel (responsive grid: 2 cols default, 3 cols full-screen)
    │   ├── CompactMetricCard (5 cards: CPU, RAM, Network, Disk, Temp)
    │   └── DetailedMetricModal (expands on long-press)
    └── ButtonConfigModal
```

**Key Patterns:**
- All components use React hooks (no classes)
- CSS Modules for scoped styling
- Long-press (800ms) to configure buttons or expand metrics
- Swipe gestures for view navigation

### Custom Hooks

**useLongPress** (`src/hooks/useLongPress.js`):
- Detects 800ms press-and-hold
- Cancels if movement > 10px
- Returns props to spread on elements: `{onTouchStart, onTouchEnd, onMouseDown, ...}`

**useSwipe** (`src/hooks/useSwipe.js`):
- Detects directional swipes
- Requires 50px distance + 0.3 px/ms velocity
- Used for view mode switching (buttons/split/metrics)

### Touch Optimization

**Critical for responsive touch:**
- All interactive elements use `touch-action: manipulation` (prevents 300ms delay)
- Minimum 44x44px touch targets (except view indicator which relies on swipe)
- Visual feedback within 100ms
- No text selection on body (enabled for inputs)

## Button Action Types

Configured via `ButtonConfigModal`, executed via `ConfigContext.executeAction()`:

1. **launch-app** - Execute application
   - `actionData: { path, args[] }`
   - Uses child_process.exec

2. **run-command** - PowerShell command
   - `actionData: { command }`
   - Runs in PowerShell.exe shell

3. **open-url** - Open URL/file
   - `actionData: { url }`
   - Uses electron.shell.openExternal

4. **system-control** - System actions
   - `actionData: { action }` (lock, sleep, restart, shutdown, volume-up/down/mute)
   - Uses Windows rundll32/PowerShell commands

## Styling System

**Theme** (`src/styles/theme.css`):
- CSS custom properties (no preprocessor)
- RGB dark theme: cyan, magenta, purple accents
- Background: #0a0a0f (very dark)
- Color-coded status: green (< 50%), yellow (50-80%), red (> 80%)

**Global** (`src/styles/global.css`):
- CSS reset
- Touch optimizations (`touch-action: manipulation`)
- Base typography
- Animation keyframes (fadeIn, scaleIn, slideInLeft/Right)

**Component Styles**:
- CSS Modules (`.module.css`)
- Scoped per component
- Use theme variables: `var(--color-accent-cyan)`

## Configuration Storage

**Location:** `%APPDATA%\super-panel-config\config.json`

**Structure:**
```json
{
  "buttons": {
    "button-0": {
      "label": "Calculator",
      "icon": "🔢",
      "color": "#00d9ff",
      "actionType": "launch-app",
      "actionData": { "path": "C:\\Windows\\System32\\calc.exe" },
      "updatedAt": 1234567890
    }
  },
  "settings": {
    "theme": "rgb-dark",
    "metricsRefreshInterval": 2000
  }
}
```

**Default buttons:** 12 slots (button-0 through button-11) in 4x3 honeycomb grid.

## View Modes

Three modes controlled by `Dashboard` state:

1. **BUTTONS_ONLY** - Honeycomb grid full-width
2. **SPLIT** - Side-by-side grid + metrics (default)
3. **METRICS_ONLY** - Metrics full-width, 3-column grid

Navigation:
- Swipe left/right to cycle through modes
- Click view indicator dots (bottom center)
- Smooth transitions with staggered card animations

## Important Files

**Must use CommonJS:**
- `electron/preload.cjs` - Electron's preload scripts require CommonJS

**Entry Points:**
- `index.html` - Root HTML (must be in project root for Vite)
- `src/main.jsx` - React entry
- `electron/main.js` - Electron main process

**Build Config:**
- `vite.config.js` - Dev server on :5173, base path './'
- `package.json` build section - electron-builder config for Windows installer

## Common Modifications

### Adding a New Metric

1. Add IPC handler in `electron/ipc/metrics.js`
2. Expose in `electron/preload.cjs` under `window.electron.metrics`
3. Add to `MetricsContext` state and fetch method
4. Create compact card in `MetricsPanel`
5. Create detail component in `src/components/MetricsPanel/`

### Adding a New Button Action Type

1. Add to `ACTION_TYPES` in `src/utils/constants.js`
2. Add handler in `electron/ipc/actions.js`
3. Add case in `ConfigContext.executeAction()`
4. Add form fields in `ButtonConfigModal`

### Modifying Touch Gestures

- Long-press duration: `LONG_PRESS_DURATION` in `src/utils/constants.js` (default 800ms)
- Swipe threshold: `SWIPE_THRESHOLD` (default 50px) and `SWIPE_VELOCITY_THRESHOLD` (default 0.3 px/ms)

## Security Considerations

- Context isolation enabled (`contextIsolation: true`)
- Node integration disabled in renderer (`nodeIntegration: false`)
- Sandbox disabled only for systeminformation access
- All IPC calls validated in main process handlers
- No eval() or unsafe HTML rendering
- Shell commands validated before execution

## Debugging

**Dev Mode:**
- DevTools auto-open in development
- Vite HMR for React components
- Console logs visible in DevTools (renderer) and terminal (main process)

**Production:**
- DevTools disabled
- Loads from `dist/index.html` instead of dev server
- Main process logs to terminal if run from command line

**Common Issues:**
- Port 5173 in use: Kill existing Vite process
- Preload script errors: Ensure using `.cjs` extension
- IPC not working: Check preload script is loaded and context isolation is on
- Metrics not updating: Verify polling interval and IPC handlers registered
