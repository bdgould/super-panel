# SuperPanel

A touchscreen-optimized Electron dashboard for Windows with configurable buttons and real-time system metrics.

## Features

- **Honeycomb Button Grid**: Customizable buttons in a honeycomb layout with visual feedback
- **System Metrics**: Real-time monitoring of CPU, RAM, network, disk, and temperature
- **Touch-Optimized**: Designed for touchscreen displays with proper touch targets (44x44px minimum)
- **Swipe Navigation**: Swipe left/right to switch between buttons and metrics views
- **RGB Dark Theme**: Modern dark theme with RGB accent colors
- **Press & Hold Configuration**: Long-press buttons to configure their actions
- **Multiple Action Types**:
  - Launch applications
  - Run PowerShell commands
  - Open URLs
  - System controls (lock, sleep, restart, shutdown, volume)

## Prerequisites

- Windows PC
- Node.js v24.11.0 (LTS)
- nvm (Node Version Manager)

## Installation

1. **Set the correct Node version**:
   ```bash
   nvm use
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Development

Run the app in development mode:

```bash
npm run electron:dev
```

This will:
- Start the Vite dev server on port 5173
- Launch the Electron app
- Enable hot module replacement
- Open DevTools automatically

## Building

### Development Build

```bash
npm run build
```

### Production Build (Windows Installer)

```bash
npm run electron:build:win
```

This creates a Windows installer in the `dist-electron` directory.

## Usage

### Configuring Buttons

1. **Long-press** (800ms) any button to open the configuration modal
2. Set the button appearance:
   - Label (up to 20 characters)
   - Icon (emoji or character)
   - Color (hex color picker)
3. Choose an action type and configure it:
   - **Launch Application**: Provide the full path to the executable
   - **Run Command**: Enter a PowerShell command
   - **Open URL**: Enter a website URL or file path
   - **System Control**: Select from lock, sleep, restart, shutdown, or volume controls
4. Click **Save** to apply changes

### Swipe Navigation

- **Swipe Right**: Show buttons only
- **Swipe Left**: Show metrics only
- **Tap Indicators**: Click the dots at the bottom to switch views
  - Left dot: Buttons only
  - Middle dot: Split view (default)
  - Right dot: Metrics only

### Keyboard Shortcuts

- **F11**: Toggle fullscreen
- **Ctrl+Shift+I**: Open DevTools (development only)

## Project Structure

```
super-panel/
├── electron/                 # Electron main process
│   ├── main.js              # Main entry point
│   ├── preload.js           # Preload script (security)
│   └── ipc/                 # IPC handlers
│       ├── metrics.js       # System metrics
│       ├── actions.js       # Button actions
│       └── config.js        # Configuration management
├── src/                     # React application
│   ├── components/          # React components
│   │   ├── Dashboard/       # Main dashboard
│   │   ├── HoneycombGrid/   # Button grid
│   │   ├── MetricsPanel/    # System metrics
│   │   └── ConfigModal/     # Button configuration
│   ├── contexts/            # React contexts
│   │   ├── ConfigContext.jsx
│   │   └── MetricsContext.jsx
│   ├── hooks/               # Custom hooks
│   │   ├── useSwipe.js
│   │   └── useLongPress.js
│   ├── styles/              # Global styles
│   │   ├── global.css
│   │   └── theme.css
│   ├── utils/               # Utilities
│   │   └── constants.js
│   ├── App.jsx              # Root component
│   └── main.jsx             # React entry point
├── public/                  # Static files
│   └── index.html
├── .nvmrc                   # Node version
├── package.json
├── vite.config.js
└── README.md
```

## Configuration Storage

Button configurations and app settings are stored using `electron-store` in:
```
%APPDATA%\super-panel-config\config.json
```

## Touch Optimizations

- All interactive elements use `touch-action: manipulation` to prevent delays
- Minimum touch target size: 44x44px
- Visual feedback within 100ms
- Swipe threshold: 50px minimum distance
- Long-press threshold: 800ms

## System Requirements

- Windows 10 or later
- Touchscreen display (optional, works with mouse/keyboard)
- 4GB RAM minimum
- 200MB disk space

## Troubleshooting

### Temperature data not available
Some systems require administrator privileges to access temperature sensors. Run the app as administrator if temperature data is not showing.

### Commands not executing
Ensure PowerShell execution policy allows scripts:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### App won't start
1. Verify Node version: `node --version` (should be v24.11.0)
2. Delete `node_modules` and reinstall: `npm install`
3. Check console for errors in DevTools

## Security

- Context isolation enabled
- Node integration disabled in renderer
- Preload script exposes only necessary IPC methods
- All user inputs validated before execution
- Command execution sandboxed via PowerShell

## License

MIT

## Contributing

This is a personal project. Feel free to fork and modify for your own use.
