import { useLongPress } from '../../hooks/useLongPress';
import styles from './MetricsPanel.module.css';

export function CompactMetricCard({ title, value, unit = '%', icon, color, onExpand }) {
  const getColor = () => {
    if (color) return color;

    // Default color coding for percentages
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'var(--color-accent-cyan)';
    if (numValue < 50) return 'var(--color-success)';
    if (numValue < 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const longPressProps = useLongPress(onExpand, {
    duration: 800,
  });

  const displayColor = getColor();
  const percentage = Math.min(100, Math.max(0, parseFloat(value) || 0));

  return (
    <div
      className={styles.compactCard}
      {...longPressProps}
      style={{ '--card-color': displayColor }}
    >
      {/* Icon */}
      <div className={styles.cardIcon}>{icon}</div>

      {/* Circular Progress */}
      <div className={styles.circularProgress}>
        <svg className={styles.progressRing} viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            className={styles.progressRingBg}
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            className={styles.progressRingFill}
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={displayColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 326.73} 326.73`}
            transform="rotate(-90 60 60)"
          />
        </svg>

        {/* Value in center */}
        <div className={styles.cardValue}>
          <span className={styles.valueNumber}>{value}</span>
          <span className={styles.valueUnit}>{unit}</span>
        </div>
      </div>

      {/* Label */}
      <div className={styles.cardLabel}>{title}</div>

      {/* Long press hint */}
      <div className={styles.pressHint}>Press & hold</div>
    </div>
  );
}
