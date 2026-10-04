import { formatSpeed } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

// Link speed arrives in bits per second
const formatLinkSpeed = (bps) => {
  if (!bps) return null;
  if (bps >= 1e9) return `${+(bps / 1e9).toFixed(1)} Gbps`;
  return `${+(bps / 1e6).toFixed(1)} Mbps`;
};

// Tunnels report an all-zero MAC, which is noise
const hasRealMac = (mac) => mac && !/^(00:){5}00$/.test(mac);

export function NetworkDetail({ network }) {
  const hasVirtual = network.interfaces.some(iface => iface.physical === false);

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

      {hasVirtual && (
        <div className={styles.detailNote}>
          Totals count physical adapters only ({network.interface}). VPN and
          virtual adapter traffic also passes through a physical adapter.
        </div>
      )}

      {/* Network Interfaces */}
      {network.interfaces.length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Connected Interfaces</h3>
          <div className={styles.interfaceDetailList}>
            {network.interfaces.map((iface, index) => (
              <div key={iface.name || index} className={styles.interfaceDetail}>
                <div className={styles.interfaceDetailName}>
                  {iface.name}
                  {iface.physical === false && (
                    <span className={styles.interfaceTag}>virtual</span>
                  )}
                </div>
                {iface.description && (
                  <div className={styles.interfaceDetailDescription}>{iface.description}</div>
                )}
                <div className={styles.interfaceDetailInfo}>
                  {iface.rx != null && (
                    <div className={styles.interfaceDetailRow}>
                      <span className={styles.interfaceDetailLabel}>Speed:</span>
                      <span className={styles.interfaceDetailValue}>
                        <span style={{ color: 'var(--color-accent-cyan)' }}>↓ {formatSpeed(iface.rx)}</span>
                        <span style={{ color: 'var(--color-accent-magenta)', marginLeft: 'var(--spacing-md)' }}>↑ {formatSpeed(iface.tx)}</span>
                      </span>
                    </div>
                  )}
                  {formatLinkSpeed(iface.linkSpeed) && (
                    <div className={styles.interfaceDetailRow}>
                      <span className={styles.interfaceDetailLabel}>Link:</span>
                      <span className={styles.interfaceDetailValue}>{formatLinkSpeed(iface.linkSpeed)}</span>
                    </div>
                  )}
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
                  {hasRealMac(iface.mac) && (
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
