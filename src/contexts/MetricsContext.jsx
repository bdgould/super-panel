import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { METRICS_REFRESH_INTERVAL } from '../utils/constants';

const MetricsContext = createContext();

export function MetricsProvider({ children }) {
  const [cpu, setCpu] = useState({ usage: 0, cores: [], temperature: null });
  const [memory, setMemory] = useState({ total: 0, used: 0, free: 0, usagePercent: 0 });
  const [network, setNetwork] = useState({ interface: 'N/A', rx: 0, tx: 0, interfaces: [] });
  const [disk, setDisk] = useState([]);
  const [temperature, setTemperature] = useState({ main: null, cores: [], max: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [cpuData, memData, netData, diskData, tempData] = await Promise.all([
        window.electron.metrics.getCPU(),
        window.electron.metrics.getMemory(),
        window.electron.metrics.getNetwork(),
        window.electron.metrics.getDisk(),
        window.electron.metrics.getTemperature(),
      ]);

      setCpu(cpuData);
      setMemory(memData);
      setNetwork(netData);
      setDisk(diskData);
      setTemperature(tempData);
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

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Set up polling for metrics
  useEffect(() => {
    const interval = setInterval(fetchMetrics, METRICS_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const value = {
    cpu,
    memory,
    network,
    disk,
    temperature,
    loading,
    error,
    refresh: fetchMetrics,
    fetchCPU,
    fetchMemory,
    fetchNetwork,
    fetchDisk,
    fetchTemperature,
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
