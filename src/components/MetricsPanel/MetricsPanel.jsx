import { useState } from 'react';
import { useMetrics } from '../../contexts/MetricsContext';
import { CompactMetricCard } from './CompactMetricCard';
import { DetailedMetricModal } from './DetailedMetricModal';
import { CPUDetail } from './CPUDetail';
import { RAMDetail } from './RAMDetail';
import { NetworkDetail } from './NetworkDetail';
import { DiskDetail } from './DiskDetail';
import { TempDetail } from './TempDetail';
import { GPUDetail } from './GPUDetail';
import { formatSpeed } from '../../utils/constants';
import styles from './MetricsPanel.module.css';
import { UsagePanel } from '../UsagePanel/UsagePanel';
import { useConfig } from '../../contexts/ConfigContext';
import { useUsage } from '../../contexts/UsageContext';
import { visibleUsageProviders } from '../../utils/usage';

const getTempColor = (temp) => {
  if (temp == null) return 'var(--color-text-secondary)';
  if (temp < 60) return 'var(--color-success)';
  if (temp < 80) return 'var(--color-warning)';
  return 'var(--color-error)';
};

export function MetricsPanel({ isFullScreen = false }) {
  const { cpu, memory, network, disk, temperature, gpu } = useMetrics();
  const { settings } = useConfig();
  const { status } = useUsage();
  const hasUsage = visibleUsageProviders(settings, status).length > 0;
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

  // Card shows the first GPU; the detail modal lists all of them
  const primaryGpu = gpu.available ? gpu.gpus[0] : null;

  // Many Windows machines expose no CPU temperature sensor, so fall back to
  // the GPU's temperature rather than showing an empty card.
  const getTemperatureDisplay = () => {
    if (temperature.main != null) {
      return { title: 'CPU Temp', value: temperature.main };
    }
    if (primaryGpu?.temperature != null) {
      return { title: 'GPU Temp', value: primaryGpu.temperature };
    }
    return { title: 'Temperature', value: null };
  };

  const temperatureDisplay = getTemperatureDisplay();

  return (
    <div className={styles.metricsPanel}>
      <div className={`${styles.metricLayout} ${hasUsage ? styles.withUsage : ''}`}>
      <UsagePanel isFullScreen={isFullScreen} />
      <div className={`${styles.compactGrid} ${isFullScreen ? styles.threeColumn : ''}`}>
        {/* CPU Card */}
        <CompactMetricCard
          title="CPU"
          value={cpu.usage}
          unit="%"
          icon="🔥"
          onExpand={() => openDetail('cpu')}
        />

        {/* GPU Card (NVIDIA only; hidden when nvidia-smi is unavailable) */}
        {primaryGpu && (
          <CompactMetricCard
            title="GPU"
            value={primaryGpu.utilization ?? '—'}
            unit="%"
            icon="🎮"
            onExpand={() => openDetail('gpu')}
          />
        )}

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
          title={temperatureDisplay.title}
          value={temperatureDisplay.value ?? '—'}
          unit="°C"
          icon="🌡️"
          color={getTempColor(temperatureDisplay.value)}
          onExpand={() => openDetail('temperature')}
        />
      </div>
      </div>

      {/* Detailed Modals */}
      <DetailedMetricModal
        isOpen={expandedMetric === 'cpu'}
        onClose={closeDetail}
        title="CPU Details"
      >
        <CPUDetail cpu={cpu} temperature={temperature} />
      </DetailedMetricModal>

      <DetailedMetricModal
        isOpen={expandedMetric === 'gpu'}
        onClose={closeDetail}
        title="GPU Details"
      >
        <GPUDetail gpu={gpu} />
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
        <TempDetail temperature={temperature} gpu={gpu} />
      </DetailedMetricModal>
    </div>
  );
}
