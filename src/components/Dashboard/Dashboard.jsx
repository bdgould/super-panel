import { useState } from 'react';
import { useSwipe } from '../../hooks/useSwipe';
import { HoneycombGrid } from '../HoneycombGrid/HoneycombGrid';
import { MetricsPanel } from '../MetricsPanel/MetricsPanel';
import { ButtonConfigModal } from '../ConfigModal/ButtonConfigModal';
import { VIEW_MODES } from '../../utils/constants';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [viewMode, setViewMode] = useState(VIEW_MODES.SPLIT);
  const [configModal, setConfigModal] = useState({
    isOpen: false,
    buttonId: null,
    config: null,
  });

  const handleSwipeLeft = () => {
    if (viewMode === VIEW_MODES.SPLIT) {
      setViewMode(VIEW_MODES.METRICS_ONLY);
    } else if (viewMode === VIEW_MODES.BUTTONS_ONLY) {
      setViewMode(VIEW_MODES.SPLIT);
    }
  };

  const handleSwipeRight = () => {
    if (viewMode === VIEW_MODES.SPLIT) {
      setViewMode(VIEW_MODES.BUTTONS_ONLY);
    } else if (viewMode === VIEW_MODES.METRICS_ONLY) {
      setViewMode(VIEW_MODES.SPLIT);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const openConfigModal = (buttonId, config) => {
    setConfigModal({
      isOpen: true,
      buttonId,
      config,
    });
  };

  const closeConfigModal = () => {
    setConfigModal({
      isOpen: false,
      buttonId: null,
      config: null,
    });
  };

  // Only apply swipe handlers when modal is closed
  const dashboardProps = configModal.isOpen ? {} : swipeHandlers;

  return (
    <div className={styles.dashboard} {...dashboardProps}>
      <div className={styles.viewContainer}>
        {/* Buttons Panel */}
        <div
          className={`${styles.panel} ${styles.buttonsPanel} ${
            viewMode === VIEW_MODES.BUTTONS_ONLY ? styles.fullWidth : ''
          } ${viewMode === VIEW_MODES.METRICS_ONLY ? styles.hidden : ''}`}
        >
          <HoneycombGrid onConfigureButton={openConfigModal} />
        </div>

        {/* Metrics Panel */}
        <div
          className={`${styles.panel} ${styles.metricsPanel} ${
            viewMode === VIEW_MODES.METRICS_ONLY ? styles.fullWidth : ''
          } ${viewMode === VIEW_MODES.BUTTONS_ONLY ? styles.hidden : ''}`}
        >
          <MetricsPanel isFullScreen={viewMode === VIEW_MODES.METRICS_ONLY} />
        </div>
      </div>

      {/* View Mode Indicator */}
      <div className={styles.viewIndicator}>
        <button
          className={`${styles.indicatorDot} ${
            viewMode === VIEW_MODES.BUTTONS_ONLY ? styles.active : ''
          }`}
          onClick={() => setViewMode(VIEW_MODES.BUTTONS_ONLY)}
          aria-label="Buttons only view"
        />
        <button
          className={`${styles.indicatorDot} ${
            viewMode === VIEW_MODES.SPLIT ? styles.active : ''
          }`}
          onClick={() => setViewMode(VIEW_MODES.SPLIT)}
          aria-label="Split view"
        />
        <button
          className={`${styles.indicatorDot} ${
            viewMode === VIEW_MODES.METRICS_ONLY ? styles.active : ''
          }`}
          onClick={() => setViewMode(VIEW_MODES.METRICS_ONLY)}
          aria-label="Metrics only view"
        />
      </div>

      {/* Configuration Modal */}
      <ButtonConfigModal
        isOpen={configModal.isOpen}
        onClose={closeConfigModal}
        buttonId={configModal.buttonId}
        initialConfig={configModal.config}
      />
    </div>
  );
}
