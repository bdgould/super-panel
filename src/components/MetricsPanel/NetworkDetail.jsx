import { formatSpeed } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function NetworkDetail({ network }) {
  return (
    <div className={styles.detailContent}>
      {/* Current Speeds */}
      <div className={styles.detailStats}>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>↓ Download</span>
          <span
            className={styles.detailStatValue}
            style={{ color: 'var(--color-accent-cyan)' }}
          >
            {formatSpeed(network.rx)}
          </span>
        </div>
        <div className={styles.detailStat}>
          <span className={styles.detailStatLabel}>↑ Upload</span>
          <span
            className={styles.detailStatValue}
            style={{ color: 'var(--color-accent-magenta)' }}
          >
            {formatSpeed(network.tx)}
          </span>
        </div>
      </div>

      {/* Network Interfaces */}
      {network.interfaces.length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Network Interfaces</h3>
          <div className={styles.interfaceDetailList}>
            {network.interfaces.map((iface, index) => (
              <div key={index} className={styles.interfaceDetail}>
                <div className={styles.interfaceDetailName}>{iface.name}</div>
                <div className={styles.interfaceDetailInfo}>
                  {iface.ip4 && (
                    <div className={styles.interfaceDetailRow}>
                      <span className={styles.interfaceDetailLabel}>IPv4:</span>
                      <span className={styles.interfaceDetailValue}>{iface.ip4}</span>
                    </div>
                  )}
                  {iface.ip6 && (
                    <div className={styles.interfaceDetailRow}>
                      <span className={styles.interfaceDetailLabel}>IPv6:</span>
                      <span className={styles.interfaceDetailValue}>{iface.ip6}</span>
                    </div>
                  )}
                  {iface.mac && (
                    <div className={styles.interfaceDetailRow}>
                      <span className={styles.interfaceDetailLabel}>MAC:</span>
                      <span className={styles.interfaceDetailValue}>{iface.mac}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
