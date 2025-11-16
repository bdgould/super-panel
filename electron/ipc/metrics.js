import si from 'systeminformation';

export function setupMetricsHandlers(ipcMain) {
  // CPU metrics
  ipcMain.handle('metrics:cpu', async () => {
    try {
      const cpuLoad = await si.currentLoad();
      const cpuTemp = await si.cpuTemperature();

      return {
        usage: cpuLoad.currentLoad.toFixed(1),
        cores: cpuLoad.cpus.map(cpu => ({
          load: cpu.load.toFixed(1),
        })),
        temperature: cpuTemp.main || null,
      };
    } catch (error) {
      console.error('Error fetching CPU metrics:', error);
      return { usage: 0, cores: [], temperature: null };
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
      const networkStats = await si.networkStats();
      const networkInterfaces = await si.networkInterfaces();

      // Get the default/active interface
      const activeInterface = networkStats[0] || {};

      return {
        interface: activeInterface.iface || 'N/A',
        rx: activeInterface.rx_sec || 0, // bytes per second received
        tx: activeInterface.tx_sec || 0, // bytes per second transmitted
        interfaces: networkInterfaces.map(iface => ({
          name: iface.iface,
          ip4: iface.ip4,
          ip6: iface.ip6,
          mac: iface.mac,
        })),
      };
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
