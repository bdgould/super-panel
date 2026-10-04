import si from 'systeminformation';
import { getGpuMetrics } from './gpu.js';
import { getNetworkMetrics } from './network.js';

export function setupMetricsHandlers(ipcMain) {
  // CPU metrics
  ipcMain.handle('metrics:cpu', async () => {
    try {
      // CPU temperature comes from metrics:temperature, not here, so the
      // thermal sensor is only queried once per poll.
      const cpuLoad = await si.currentLoad();

      return {
        usage: cpuLoad.currentLoad.toFixed(1),
        cores: cpuLoad.cpus.map(cpu => ({
          load: cpu.load.toFixed(1),
        })),
      };
    } catch (error) {
      console.error('Error fetching CPU metrics:', error);
      return { usage: 0, cores: [] };
    }
  });

  // Memory metrics
  ipcMain.handle('metrics:memory', async () => {
    try {
      const mem = await si.mem();

      return {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: ((mem.used / mem.total) * 100).toFixed(1),
      };
    } catch (error) {
      console.error('Error fetching memory metrics:', error);
      return { total: 0, used: 0, free: 0, usagePercent: 0 };
    }
  });

  // Network metrics
  ipcMain.handle('metrics:network', async () => {
    try {
      return await getNetworkMetrics();
    } catch (error) {
      console.error('Error fetching network metrics:', error);
      return { interface: 'N/A', rx: 0, tx: 0, interfaces: [] };
    }
  });

  // Disk metrics
  ipcMain.handle('metrics:disk', async () => {
    try {
      const fsSize = await si.fsSize();

      return fsSize.map(disk => ({
        fs: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usagePercent: disk.use.toFixed(1),
        mount: disk.mount,
      }));
    } catch (error) {
      console.error('Error fetching disk metrics:', error);
      return [];
    }
  });

  // GPU metrics (NVIDIA only, via nvidia-smi)
  ipcMain.handle('metrics:gpu', () => getGpuMetrics());

  // Temperature metrics
  ipcMain.handle('metrics:temperature', async () => {
    try {
      const cpuTemp = await si.cpuTemperature();

      return {
        main: cpuTemp.main || null,
        cores: cpuTemp.cores || [],
        max: cpuTemp.max || null,
      };
    } catch (error) {
      console.error('Error fetching temperature metrics:', error);
      return { main: null, cores: [], max: null };
    }
  });
}
