import { useMetrics } from '../../contexts/MetricsContext';
import { formatBytes } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function RAMWidget() {
  const { memory } = useMetrics();

  const getUsageColor = (usage) => {
    if (usage < 50) return 'var(--color-success)';
    if (usage < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>Memory</h3>
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.mainMetric}>
          <div
            className={styles.percentage}
            style={{ color: getUsageColor(parseFloat(memory.usagePercent)) }}
          >
            {memory.usagePercent}%
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${memory.usagePercent}%`,
                background: getUsageColor(parseFloat(memory.usagePercent)),
              }}
            />
          </div>
        </div>

        <div className={styles.metricDetails}>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Used:</span>
            <span className={styles.metricValue}>{formatBytes(memory.used)}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Free:</span>
            <span className={styles.metricValue}>{formatBytes(memory.free)}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Total:</span>
            <span className={styles.metricValue}>{formatBytes(memory.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
