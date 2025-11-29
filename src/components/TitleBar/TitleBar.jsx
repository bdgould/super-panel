import { useState, useEffect } from 'react';
import styles from './TitleBar.module.css';

export function TitleBar({ onOpenSettings }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check window state on mount and when window changes
  useEffect(() => {
    const updateWindowState = async () => {
      if (window.electron?.window?.getState) {
        const state = await window.electron.window.getState();
        setIsMaximized(state.isMaximized);
        setIsFullscreen(state.isFullscreen);
      }
    };

    updateWindowState();

    // Listen for window state changes
    const handleResize = () => {
      updateWindowState();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => {
    window.electron?.window?.minimize();
  };

  const handleMaximize = () => {
    window.electron?.window?.maximize();
  };

  const handleFullscreen = () => {
    window.electron?.window?.toggleFullscreen();
  };

  const handleClose = () => {
    window.electron?.window?.close();
  };

  // Double-click title bar to maximize (standard behavior)
  const handleDoubleClick = () => {
    handleMaximize();
  };

  // Hide title bar in fullscreen mode
  if (isFullscreen) {
    return null;
  }

  return (
    <div className={styles.titleBar}>
      {/* App Title */}
      <div className={styles.titleSection}>
        <span className={styles.appIcon}>⚡</span>
        <span className={styles.appTitle}>SuperPanel</span>
      </div>

      {/* Draggable Region */}
      <div
        className={styles.dragRegion}
        onDoubleClick={handleDoubleClick}
      />

      {/* Settings Button */}
      {onOpenSettings && (
        <button
          className={styles.settingsButton}
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Grid Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
          </svg>
        </button>
      )}

      {/* Window Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.controlButton} ${styles.minimize}`}
          onClick={handleMinimize}
          aria-label="Minimize"
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>

        <button
          className={`${styles.controlButton} ${styles.maximize}`}
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="0" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="0" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </button>

        <button
          className={`${styles.controlButton} ${styles.fullscreen}`}
          onClick={handleFullscreen}
          aria-label="Fullscreen"
          title="Fullscreen (F11)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M0 0 L4 0 L4 1.5 L1.5 1.5 L1.5 4 L0 4 Z M12 0 L12 4 L10.5 4 L10.5 1.5 L8 1.5 L8 0 Z M0 12 L0 8 L1.5 8 L1.5 10.5 L4 10.5 L4 12 Z M12 12 L8 12 L8 10.5 L10.5 10.5 L10.5 8 L12 8 Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          className={`${styles.controlButton} ${styles.close}`}
          onClick={handleClose}
          aria-label="Close"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M0.5 0.5 L11.5 11.5 M11.5 0.5 L0.5 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
