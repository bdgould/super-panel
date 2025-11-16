import { formatBytes } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function RAMDetail({ memory }) {
  const getUsageColor = (usage) => {
    if (usage < 50) return 'var(--color-success)';
    if (usage < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className={styles.detailContent}>
      {/* Overall Stats */}
      <div className={styles.detailStats}>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Usage</span>
          <span
            className={styles.detailStatValue}
            style={{ color: getUsageColor(parseFloat(memory.usagePercent)) }}
          >
            {memory.usagePercent}%
          </span>
        </div>
      </div>

      {/* Memory Breakdown */}
      <div className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Memory Breakdown</h3>
        <div className={styles.memoryBreakdown}>
          <div className={styles.memoryBar}>
            <div
              className={styles.memoryUsed}
              style={{
                width: `${memory.usagePercent}%`,
                background: getUsageColor(parseFloat(memory.usagePercent)),
              }}
            />
          </div>
          <div className={styles.memoryStats}>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>Used</span>
              <span className={styles.memoryStatValue}>
                {formatBytes(memory.used)}
              </span>
            </div>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>Free</span>
              <span className={styles.memoryStatValue}>
                {formatBytes(memory.free)}
              </span>
            </div>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>Total</span>
              <span className={styles.memoryStatValue}>
                {formatBytes(memory.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
