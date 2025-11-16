import styles from './MetricsPanel.module.css';

export function CPUDetail({ cpu }) {
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
          <span className={styles.detailStatLabel}>Overall Usage</span>
          <span
            className={styles.detailStatValue}
            style={{ color: getUsageColor(parseFloat(cpu.usage)) }}
          >
            {cpu.usage}%
          </span>
        </div>
        {cpu.temperature && (
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>Temperature</span>
            <span className={styles.detailStatValue}>{cpu.temperature}°C</span>
          </div>
        )}
      </div>

      {/* Individual Cores */}
      {cpu.cores.length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Core Usage</h3>
          <div className={styles.coreDetailGrid}>
            {cpu.cores.map((core, index) => (
              <div key={index} className={styles.coreDetail}>
                <div className={styles.coreDetailHeader}>
                  <span className={styles.coreDetailLabel}>Core {index}</span>
                  <span
                    className={styles.coreDetailValue}
                    style={{ color: getUsageColor(parseFloat(core.load)) }}
                  >
                    {core.load}%
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${core.load}%`,
                      background: getUsageColor(parseFloat(core.load)),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
