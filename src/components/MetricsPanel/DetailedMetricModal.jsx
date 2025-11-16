import styles from './MetricsPanel.module.css';

export function DetailedMetricModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className={styles.detailModalOverlay} onClick={onClose}>
      <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.detailModalHeader}>
          <h2 className={styles.detailModalTitle}>{title}</h2>
          <button
            className={styles.detailModalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.detailModalContent}>
          {children}
        </div>
      </div>
    </div>
  );
}
