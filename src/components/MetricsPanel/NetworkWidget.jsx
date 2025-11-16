import { useMetrics } from '../../contexts/MetricsContext';
import { formatSpeed } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function NetworkWidget() {
  const { network } = useMetrics();

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>Network</h3>
        <span className={styles.subtitle}>{network.interface}</span>
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.networkStats}>
          <div className={styles.networkStat}>
            <div className={styles.networkIcon} style={{ color: 'var(--color-accent-cyan)' }}>
              ↓
            </div>
            <div className={styles.networkInfo}>
              <div className={styles.networkLabel}>Download</div>
              <div className={styles.networkValue}>{formatSpeed(network.rx)}</div>
            </div>
          </div>

          <div className={styles.networkStat}>
            <div className={styles.networkIcon} style={{ color: 'var(--color-accent-magenta)' }}>
              ↑
            </div>
            <div className={styles.networkInfo}>
              <div className={styles.networkLabel}>Upload</div>
              <div className={styles.networkValue}>{formatSpeed(network.tx)}</div>
            </div>
          </div>
        </div>

        {network.interfaces.length > 0 && (
          <div className={styles.interfaceList}>
            {network.interfaces.slice(0, 3).map((iface, index) => (
              <div key={index} className={styles.interfaceItem}>
                <span className={styles.interfaceName}>{iface.name}</span>
                <span className={styles.interfaceIp}>{iface.ip4 || 'N/A'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
