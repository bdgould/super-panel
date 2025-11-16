import { useMetrics } from '../../contexts/MetricsContext';
import styles from './MetricsPanel.module.css';

export function TempWidget() {
  const { temperature } = useMetrics();

  const getTempColor = (temp) => {
    if (!temp) return 'var(--color-text-secondary)';
    if (temp < 60) return 'var(--color-success)';
    if (temp < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const hasData = temperature.main || temperature.cores.length > 0;

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>Temperature</h3>
      </div>

      <div className={styles.widgetContent}>
        {!hasData ? (
          <div className={styles.noData}>Temperature data not available</div>
        ) : (
          <>
            {temperature.main && (
              <div className={styles.mainMetric}>
                <div
                  className={styles.percentage}
                  style={{ color: getTempColor(temperature.main) }}
                >
                  {temperature.main}°C
                </div>
                <div className={styles.tempLabel}>CPU Average</div>
              </div>
            )}

            {temperature.cores.length > 0 && (
              <div className={styles.coreGrid}>
                {temperature.cores.slice(0, 8).map((temp, index) => (
                  <div key={index} className={styles.tempCore}>
                    <div className={styles.coreLabel}>C{index}</div>
                    <div
                      className={styles.tempValue}
                      style={{ color: getTempColor(temp) }}
                    >
                      {temp}°
                    </div>
                  </div>
                ))}
              </div>
            )}

            {temperature.max && (
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Max:</span>
                <span
                  className={styles.metricValue}
                  style={{ color: getTempColor(temperature.max) }}
                >
                  {temperature.max}°C
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
