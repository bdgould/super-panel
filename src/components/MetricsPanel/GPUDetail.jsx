import { formatBytes } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

const MIB = 1024 * 1024;

const getUsageColor = (usage) => {
  if (usage < 50) return 'var(--color-success)';
  if (usage < 80) return 'var(--color-warning)';
  return 'var(--color-error)';
};

const getTempColor = (temp) => {
  if (temp == null) return 'var(--color-text-secondary)';
  if (temp < 60) return 'var(--color-success)';
  if (temp < 80) return 'var(--color-warning)';
  return 'var(--color-error)';
};

// Values nvidia-smi could not report come through as null
const show = (value, unit = '') => (value == null ? '—' : `${value}${unit}`);

function GPUCard({ gpu }) {
  const vramPercent =
    gpu.memoryUsed != null && gpu.memoryTotal
      ? (gpu.memoryUsed / gpu.memoryTotal) * 100
      : null;

  return (
    <div className={styles.detailSection}>
      <h3 className={styles.detailSectionTitle}>{gpu.name}</h3>

      <div className={styles.detailStats}>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Utilization</span>
          <span
            className={styles.detailStatValue}
            style={{ color: gpu.utilization == null ? undefined : getUsageColor(gpu.utilization) }}
          >
            {show(gpu.utilization, '%')}
          </span>
        </div>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Temperature</span>
          <span
            className={styles.detailStatValue}
            style={{ color: getTempColor(gpu.temperature) }}
          >
            {show(gpu.temperature, '°C')}
          </span>
        </div>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Power</span>
          <span className={styles.detailStatValue}>
            {gpu.powerDraw == null ? '—' : `${Math.round(gpu.powerDraw)}W`}
          </span>
        </div>
      </div>

      {vramPercent != null && (
        <div className={styles.memoryBreakdown}>
          <div className={styles.memoryBar}>
            <div
              className={styles.memoryUsed}
              style={{
                width: `${vramPercent}%`,
                background: getUsageColor(vramPercent),
              }}
            />
          </div>
          <div className={styles.memoryStats}>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>VRAM Used</span>
              <span className={styles.memoryStatValue}>
                {formatBytes(gpu.memoryUsed * MIB)}
              </span>
            </div>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>VRAM Free</span>
              <span className={styles.memoryStatValue}>
                {formatBytes((gpu.memoryTotal - gpu.memoryUsed) * MIB)}
              </span>
            </div>
            <div className={styles.memoryStat}>
              <span className={styles.memoryStatLabel}>VRAM Total</span>
              <span className={styles.memoryStatValue}>
                {formatBytes(gpu.memoryTotal * MIB)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.memoryStats}>
        <div className={styles.memoryStat}>
          <span className={styles.memoryStatLabel}>Core Clock</span>
          <span className={styles.memoryStatValue}>
            {gpu.clockCore == null ? '—' : `${gpu.clockCore} MHz`}
          </span>
        </div>
        <div className={styles.memoryStat}>
          <span className={styles.memoryStatLabel}>Fan</span>
          <span className={styles.memoryStatValue}>{show(gpu.fanSpeed, '%')}</span>
        </div>
        <div className={styles.memoryStat}>
          <span className={styles.memoryStatLabel}>Power Limit</span>
          <span className={styles.memoryStatValue}>
            {gpu.powerLimit == null ? '—' : `${Math.round(gpu.powerLimit)}W`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function GPUDetail({ gpu }) {
  if (!gpu.available || gpu.gpus.length === 0) {
    return (
      <div className={styles.detailContent}>
        <div className={styles.noData}>
          GPU data not available{gpu.reason ? `: ${gpu.reason}` : ''}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailContent}>
      {gpu.gpus.map((item) => (
        <GPUCard key={item.index ?? item.name} gpu={item} />
      ))}
    </div>
  );
}
