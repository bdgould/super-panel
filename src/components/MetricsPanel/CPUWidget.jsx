import { useMetrics } from '../../contexts/MetricsContext';
import styles from './MetricsPanel.module.css';

export function CPUWidget() {
  const { cpu } = useMetrics();

  const getUsageColor = (usage) => {
    if (usage < 50) return 'var(--color-success)';
    if (usage < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>CPU</h3>
        {cpu.temperature && (
          <span className={styles.temperature}>{cpu.temperature}°C</span>
        )}
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.mainMetric}>
          <div
            className={styles.percentage}
            style={{ color: getUsageColor(parseFloat(cpu.usage)) }}
          >
            {cpu.usage}%
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${cpu.usage}%`,
                background: getUsageColor(parseFloat(cpu.usage)),
              }}
            />
          </div>
        </div>

        {cpu.cores.length > 0 && (
          <div className={styles.coreGrid}>
            {cpu.cores.slice(0, 8).map((core, index) => (
              <div key={index} className={styles.core}>
                <div className={styles.coreLabel}>C{index}</div>
                <div className={styles.coreBar}>
                  <div
                    className={styles.coreBarFill}
                    style={{
                      height: `${core.load}%`,
                      background: getUsageColor(parseFloat(core.load)),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
