import { CPUWidget } from './CPUWidget';
import { RAMWidget } from './RAMWidget';
import { NetworkWidget } from './NetworkWidget';
import { DiskWidget } from './DiskWidget';
import { TempWidget } from './TempWidget';
import styles from './MetricsPanel.module.css';

export function MetricsPanel() {
  return (
    <div className={styles.metricsPanel}>
      <div className={styles.widgetGrid}>
        <CPUWidget />
        <RAMWidget />
        <NetworkWidget />
        <DiskWidget />
        <TempWidget />
      </div>
    </div>
  );
}
