import { execFile } from 'child_process';
import os from 'os';
import si from 'systeminformation';

// systeminformation's networkStats() cannot be used on Windows: it matches
// performance counters to adapters through Win32_NetworkAdapter, and skips any
// adapter whose NetEnabled field is blank. Some drivers (e.g. Qualcomm Wi-Fi 7)
// leave it blank, so the active adapter reports 0 bytes forever. Instead we
// read the per-adapter byte counters from the same CIM classes Get-NetAdapter
// uses, keyed by connection name ("Wi-Fi"), and compute rates ourselves.
const CIM_QUERY = [
  "$ns = 'root/StandardCimv2'",
  '$stats = @(Get-CimInstance -Namespace $ns -ClassName MSFT_NetAdapterStatisticsSettingData | Select-Object Name, ReceivedBytes, SentBytes)',
  '$adapters = @(Get-CimInstance -Namespace $ns -ClassName MSFT_NetAdapter | Select-Object Name, InterfaceDescription, MediaConnectState, ConnectorPresent, Virtual, ReceiveLinkSpeed)',
  '@{ stats = $stats; adapters = $adapters } | ConvertTo-Json -Compress -Depth 3',
].join('; ');

const EXEC_TIMEOUT_MS = 5000;
const MEDIA_CONNECTED = 1;

// Last byte counters per adapter, used to turn totals into bytes/second
const previousSamples = new Map();
let inFlight = null;

function runCimQuery() {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', CIM_QUERY],
      { timeout: EXEC_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
  });
}

// Samples closer together than this reuse the last rate instead of measuring
// over a near-zero interval (e.g. a second caller right after a poll).
const MIN_SAMPLE_INTERVAL_MS = 500;

// Bytes per second since the previous sample. 0 on the first sample, and when
// a counter goes backwards (adapter reset or reconnect).
function computeRate(name, rxBytes, txBytes, now) {
  const prev = previousSamples.get(name);

  if (prev && now - prev.time < MIN_SAMPLE_INTERVAL_MS) return prev.rate;

  const rate = prev
    ? {
        rx: Math.max(0, Math.round((rxBytes - prev.rx) / ((now - prev.time) / 1000))),
        tx: Math.max(0, Math.round((txBytes - prev.tx) / ((now - prev.time) / 1000))),
      }
    : { rx: 0, tx: 0 };

  previousSamples.set(name, { rx: rxBytes, tx: txBytes, time: now, rate });
  return rate;
}

// IPv4/IPv6/MAC per connection name from Node itself (no process spawn)
function getAddresses() {
  const result = new Map();
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    const ip4 = entries.find(e => e.family === 'IPv4' || e.family === 4);
    const ip6s = entries.filter(e => e.family === 'IPv6' || e.family === 6);
    // Prefer a global IPv6 address over a link-local (fe80::) one
    const ip6 = ip6s.find(e => !/^fe80:/i.test(e.address)) || ip6s[0];
    result.set(name, {
      ip4: ip4?.address || '',
      ip6: ip6?.address || '',
      mac: entries[0]?.mac || '',
    });
  }
  return result;
}

export function buildNetworkMetrics({ stats, adapters }, now = Date.now()) {
  const statsByName = new Map(stats.map(s => [s.Name, s]));
  const addresses = getAddresses();

  const interfaces = adapters
    .filter(a => a.MediaConnectState === MEDIA_CONNECTED)
    .map(adapter => {
      const counters = statsByName.get(adapter.Name);
      const rate = counters
        ? computeRate(adapter.Name, Number(counters.ReceivedBytes) || 0, Number(counters.SentBytes) || 0, now)
        : { rx: 0, tx: 0 };
      const addr = addresses.get(adapter.Name) || { ip4: '', ip6: '', mac: '' };
      return {
        name: adapter.Name,
        description: adapter.InterfaceDescription || '',
        physical: Boolean(adapter.ConnectorPresent) && !adapter.Virtual,
        linkSpeed: adapter.ReceiveLinkSpeed || null, // bits per second
        rx: rate.rx,
        tx: rate.tx,
        ...addr,
      };
    });

  // Headline numbers count physical adapters only. Tunnels (VPN, WireGuard)
  // and virtual switches carry traffic that also crosses a physical adapter,
  // so including them would double count.
  const physical = interfaces.filter(i => i.physical);
  const counted = physical.length > 0 ? physical : interfaces;

  // Physical adapters first, then by activity
  interfaces.sort((a, b) => (b.physical - a.physical) || (b.rx + b.tx - (a.rx + a.tx)));

  return {
    interface: counted.map(i => i.name).join(', ') || 'N/A',
    rx: counted.reduce((sum, i) => sum + i.rx, 0), // bytes per second received
    tx: counted.reduce((sum, i) => sum + i.tx, 0), // bytes per second transmitted
    interfaces,
  };
}

async function getWindowsNetworkMetrics() {
  // Share one PowerShell process between overlapping requests
  if (!inFlight) {
    inFlight = runCimQuery().finally(() => {
      inFlight = null;
    });
  }

  const parsed = JSON.parse(await inFlight);
  return buildNetworkMetrics({
    stats: parsed.stats || [],
    adapters: parsed.adapters || [],
  });
}

// Non-Windows development fallback
async function getGenericNetworkMetrics() {
  const [networkStats, networkInterfaces] = await Promise.all([
    si.networkStats(),
    si.networkInterfaces(),
  ]);
  const active = networkStats[0] || {};
  return {
    interface: active.iface || 'N/A',
    rx: active.rx_sec || 0,
    tx: active.tx_sec || 0,
    interfaces: networkInterfaces.map(iface => ({
      name: iface.iface,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
    })),
  };
}

export async function getNetworkMetrics() {
  return process.platform === 'win32'
    ? getWindowsNetworkMetrics()
    : getGenericNetworkMetrics();
}
