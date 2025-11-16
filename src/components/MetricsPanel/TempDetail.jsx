import styles from './MetricsPanel.module.css';

export function TempDetail({ temperature }) {
  const getTempColor = (temp) => {
    if (!temp) return 'var(--color-text-secondary)';
    if (temp < 60) return 'var(--color-success)';
    if (temp < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const hasData = temperature.main || temperature.cores.length > 0;

  return (
    <div className={styles.detailContent}>
      {!hasData ? (
        <div className={styles.noData}>Temperature data not available</div>
      ) : (
        <>
          {/* Overall Stats */}
          {temperature.main && (
            <div className={styles.detailStats}>
              <div className={styles.detailStat}>
                <span className={styles.detailStatLabel}>CPU Average</span>
                <span
                  className={styles.detailStatValue}
                  style={{ color: getTempColor(temperature.main) }}
                >
                  {temperature.main}°C
                </span>
              </div>
              {temperature.max && (
                <div className={styles.detailStat}>
                  <span className={styles.detailStatLabel}>Maximum</span>
                  <span
                    className={styles.detailStatValue}
                    style={{ color: getTempColor(temperature.max) }}
                  >
                    {temperature.max}°C
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Individual Core Temperatures */}
          {temperature.cores.length > 0 && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Core Temperatures</h3>
              <div className={styles.tempDetailGrid}>
                {temperature.cores.map((temp, index) => (
                  <div key={index} className={styles.tempDetailItem}>
                    <span className={styles.tempDetailLabel}>Core {index}</span>
                    <span
                      className={styles.tempDetailValue}
                      style={{ color: getTempColor(temp) }}
                    >
                      {temp}°C
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Temperature Guide */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Temperature Guide</h3>
            <div className={styles.tempGuide}>
              <div className={styles.tempGuideItem}>
                <span className={styles.tempGuideDot} style={{ background: 'var(--color-success)' }} />
                <span className={styles.tempGuideLabel}>{'< 60°C: Normal'}</span>
              </div>
              <div className={styles.tempGuideItem}>
                <span className={styles.tempGuideDot} style={{ background: 'var(--color-warning)' }} />
                <span className={styles.tempGuideLabel}>60-80°C: Warm</span>
              </div>
              <div className={styles.tempGuideItem}>
                <span className={styles.tempGuideDot} style={{ background: 'var(--color-error)' }} />
                <span className={styles.tempGuideLabel}>{'>80°C: Hot'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
