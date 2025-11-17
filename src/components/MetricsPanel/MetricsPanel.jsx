import { useState } from 'react';
import { useMetrics } from '../../contexts/MetricsContext';
import { CompactMetricCard } from './CompactMetricCard';
import { DetailedMetricModal } from './DetailedMetricModal';
import { CPUDetail } from './CPUDetail';
import { RAMDetail } from './RAMDetail';
import { NetworkDetail } from './NetworkDetail';
import { DiskDetail } from './DiskDetail';
import { TempDetail } from './TempDetail';
import { formatSpeed } from '../../utils/constants';
import styles from './MetricsPanel.module.css';

export function MetricsPanel({ isFullScreen = false }) {
  const { cpu, memory, network, disk, temperature } = useMetrics();
  const [expandedMetric, setExpandedMetric] = useState(null);

  const openDetail = (metric) => {
    setExpandedMetric(metric);
  };

  const closeDetail = () => {
    setExpandedMetric(null);
  };

  // Format network speed for display
  const getNetworkDisplay = () => {
    const totalSpeed = network.rx + network.tx;
    if (totalSpeed === 0) return { value: '0', unit: 'KB/s' };

    const speed = formatSpeed(totalSpeed);
    const parts = speed.split(' ');
    return { value: parts[0], unit: parts[1] };
  };

  const networkDisplay = getNetworkDisplay();

  // Get primary disk usage
  const getPrimaryDiskUsage = () => {
    if (disk.length === 0) return '0';
    return disk[0].usagePercent;
  };

  return (
    <div className={styles.metricsPanel}>
      <div className={`${styles.compactGrid} ${isFullScreen ? styles.threeColumn : ''}`}>
        {/* CPU Card */}
        <CompactMetricCard
          title="CPU"
          value={cpu.usage}
          unit="%"
          icon="🔥"
          onExpand={() => openDetail('cpu')}
        />

        {/* RAM Card */}
        <CompactMetricCard
          title="Memory"
          value={memory.usagePercent}
          unit="%"
          icon="💾"
          onExpand={() => openDetail('memory')}
        />

        {/* Network Card */}
        <CompactMetricCard
          title="Network"
          value={networkDisplay.value}
          unit={networkDisplay.unit}
          icon="🌐"
          color="var(--color-accent-cyan)"
          onExpand={() => openDetail('network')}
        />

        {/* Disk Card */}
        <CompactMetricCard
          title="Disk"
          value={getPrimaryDiskUsage()}
          unit="%"
          icon="💿"
          onExpand={() => openDetail('disk')}
        />

        {/* Temperature Card */}
        <CompactMetricCard
          title="Temperature"
          value={temperature.main || '—'}
          unit="°C"
          icon="🌡️"
          color={
            temperature.main
              ? temperature.main < 60
                ? 'var(--color-success)'
                : temperature.main < 80
                ? 'var(--color-warning)'
                : 'var(--color-error)'
              : 'var(--color-text-secondary)'
          }
          onExpand={() => openDetail('temperature')}
        />
      </div>

      {/* Detailed Modals */}
      <DetailedMetricModal
        isOpen={expandedMetric === 'cpu'}
        onClose={closeDetail}
        title="CPU Details"
      >
        <CPUDetail cpu={cpu} />
      </DetailedMetricModal>

      <DetailedMetricModal
        isOpen={expandedMetric === 'memory'}
        onClose={closeDetail}
        title="Memory Details"
      >
        <RAMDetail memory={memory} />
      </DetailedMetricModal>

      <DetailedMetricModal
        isOpen={expandedMetric === 'network'}
        onClose={closeDetail}
        title="Network Details"
      >
        <NetworkDetail network={network} />
      </DetailedMetricModal>

      <DetailedMetricModal
        isOpen={expandedMetric === 'disk'}
        onClose={closeDetail}
        title="Disk Details"
      >
        <DiskDetail disk={disk} />
      </DetailedMetricModal>

      <DetailedMetricModal
        isOpen={expandedMetric === 'temperature'}
        onClose={closeDetail}
        title="Temperature Details"
      >
        <TempDetail temperature={temperature} />
      </DetailedMetricModal>
    </div>
  );
}
