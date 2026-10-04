import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { METRICS_REFRESH_INTERVAL } from '../utils/constants';
import { useConfig } from './ConfigContext';

const MetricsContext = createContext();

export function MetricsProvider({ children }) {
  const { settings } = useConfig();
  const configuredInterval = settings?.metricsRefreshInterval;
  const refreshInterval =
    Number.isInteger(configuredInterval) && configuredInterval >= 1000
      ? configuredInterval
      : METRICS_REFRESH_INTERVAL;

  const [cpu, setCpu] = useState({ usage: 0, cores: [] });
  const [memory, setMemory] = useState({ total: 0, used: 0, free: 0, usagePercent: 0 });
  const [network, setNetwork] = useState({ interface: 'N/A', rx: 0, tx: 0, interfaces: [] });
  const [disk, setDisk] = useState([]);
  const [temperature, setTemperature] = useState({ main: null, cores: [], max: null });
  const [gpu, setGpu] = useState({ available: false, reason: null, gpus: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [cpuData, memData, netData, diskData, tempData, gpuData] = await Promise.all([
        window.electron.metrics.getCPU(),
        window.electron.metrics.getMemory(),
        window.electron.metrics.getNetwork(),
        window.electron.metrics.getDisk(),
        window.electron.metrics.getTemperature(),
        window.electron.metrics.getGPU(),
      ]);

      setCpu(cpuData);
      setMemory(memData);
      setNetwork(netData);
      setDisk(diskData);
      setTemperature(tempData);
      setGpu(gpuData);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch CPU metrics only
  const fetchCPU = useCallback(async () => {
    try {
      const cpuData = await window.electron.metrics.getCPU();
      setCpu(cpuData);
    } catch (err) {
      console.error('Error fetching CPU metrics:', err);
    }
  }, []);

  // Fetch memory metrics only
  const fetchMemory = useCallback(async () => {
    try {
      const memData = await window.electron.metrics.getMemory();
      setMemory(memData);
    } catch (err) {
      console.error('Error fetching memory metrics:', err);
    }
  }, []);

  // Fetch network metrics only
  const fetchNetwork = useCallback(async () => {
    try {
      const netData = await window.electron.metrics.getNetwork();
      setNetwork(netData);
    } catch (err) {
      console.error('Error fetching network metrics:', err);
    }
  }, []);

  // Fetch disk metrics only
  const fetchDisk = useCallback(async () => {
    try {
      const diskData = await window.electron.metrics.getDisk();
      setDisk(diskData);
    } catch (err) {
      console.error('Error fetching disk metrics:', err);
    }
  }, []);

  // Fetch temperature metrics only
  const fetchTemperature = useCallback(async () => {
    try {
      const tempData = await window.electron.metrics.getTemperature();
      setTemperature(tempData);
    } catch (err) {
      console.error('Error fetching temperature metrics:', err);
    }
  }, []);

  // Fetch GPU metrics only
  const fetchGPU = useCallback(async () => {
    try {
      const gpuData = await window.electron.metrics.getGPU();
      setGpu(gpuData);
    } catch (err) {
      console.error('Error fetching GPU metrics:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Poll at the configured interval. Pause while the window is hidden
  // (minimized or fully covered) and refresh as soon as it is visible again.
  useEffect(() => {
    let timer = null;

    const start = () => {
      if (!timer) timer = setInterval(fetchMetrics, refreshInterval);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchMetrics();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMetrics, refreshInterval]);

  const value = {
    cpu,
    memory,
    network,
    disk,
    temperature,
    gpu,
    loading,
    error,
    refresh: fetchMetrics,
    fetchCPU,
    fetchMemory,
    fetchNetwork,
    fetchDisk,
    fetchTemperature,
    fetchGPU,
  };

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}
