import { formatBytes } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function DiskDetail({ disk }) {
  const getUsageColor = (usage) => {
    if (usage < 70) return 'var(--color-success)';
    if (usage < 90) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className={styles.detailContent}>
      {disk.length === 0 ? (
        <div className={styles.noData}>No disk data available</div>
      ) : (
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Disk Drives</h3>
          <div className={styles.diskDetailList}>
            {disk.map((diskItem, index) => (
              <div key={index} className={styles.diskDetail}>
                <div className={styles.diskDetailHeader}>
                  <div>
                    <div className={styles.diskDetailMount}>{diskItem.mount}</div>
                    <div className={styles.diskDetailType}>
                      {diskItem.type} • {diskItem.fs}
                    </div>
                  </div>
                  <span
                    className={styles.diskDetailPercent}
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
                <div className={styles.diskDetailStats}>
                  <span className={styles.diskDetailStat}>
                    Used: {formatBytes(diskItem.used)}
                  </span>
                  <span className={styles.diskDetailStat}>
                    Free: {formatBytes(diskItem.available)}
                  </span>
                  <span className={styles.diskDetailStat}>
                    Total: {formatBytes(diskItem.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
