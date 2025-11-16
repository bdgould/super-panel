import { useMetrics } from '../../contexts/MetricsContext';
import { formatBytes } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function DiskWidget() {
  const { disk } = useMetrics();

  const getUsageColor = (usage) => {
    if (usage < 70) return 'var(--color-success)';
    if (usage < 90) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  // Show up to 3 disks
  const visibleDisks = disk.slice(0, 3);

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>Disk Usage</h3>
      </div>

      <div className={styles.widgetContent}>
        {visibleDisks.length === 0 ? (
          <div className={styles.noData}>No disk data available</div>
        ) : (
          <div className={styles.diskList}>
            {visibleDisks.map((diskItem, index) => (
              <div key={index} className={styles.diskItem}>
                <div className={styles.diskHeader}>
                  <span className={styles.diskMount}>{diskItem.mount}</span>
                  <span
                    className={styles.diskPercent}
                    style={{ color: getUsageColor(parseFloat(diskItem.usagePercent)) }}
                  >
                    {diskItem.usagePercent}%
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${diskItem.usagePercent}%`,
                      background: getUsageColor(parseFloat(diskItem.usagePercent)),
                    }}
                  />
                </div>
                <div className={styles.diskInfo}>
                  <span className={styles.diskUsed}>{formatBytes(diskItem.used)}</span>
                  <span className={styles.diskTotal}>/ {formatBytes(diskItem.size)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
