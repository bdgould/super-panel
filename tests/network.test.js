import { describe, expect, it } from 'vitest';
import { buildNetworkMetrics } from '../electron/ipc/network.js';

const CONNECTED = 1;
const DISCONNECTED = 7;

function adapter(name, overrides = {}) {
  return {
    Name: name,
    InterfaceDescription: `${name} adapter`,
    MediaConnectState: CONNECTED,
    ConnectorPresent: true,
    Virtual: false,
    ReceiveLinkSpeed: 1_000_000_000,
    ...overrides,
  };
}

// Adapter names are unique per test because rates are computed against
// module-level state from the previous sample.
describe('buildNetworkMetrics', () => {
  it('reads 0 on the first sample, then bytes per second', () => {
    const adapters = [adapter('rate-test')];
    const first = buildNetworkMetrics(
      { stats: [{ Name: 'rate-test', ReceivedBytes: 1000, SentBytes: 500 }], adapters },
      10_000
    );
    expect(first.rx).toBe(0);
    expect(first.tx).toBe(0);

    const second = buildNetworkMetrics(
      { stats: [{ Name: 'rate-test', ReceivedBytes: 3000, SentBytes: 1500 }], adapters },
      12_000
    );
    expect(second.rx).toBe(1000);
    expect(second.tx).toBe(500);
  });

  it('reuses the previous rate for samples under 500ms apart', () => {
    const adapters = [adapter('burst-test')];
    const sample = (bytes, now) =>
      buildNetworkMetrics({ stats: [{ Name: 'burst-test', ReceivedBytes: bytes, SentBytes: 0 }], adapters }, now);

    sample(0, 0);
    expect(sample(2000, 1000).rx).toBe(2000);
    expect(sample(9999, 1100).rx).toBe(2000);
  });

  it('never reports a negative rate when counters reset', () => {
    const adapters = [adapter('reset-test')];
    const sample = (bytes, now) =>
      buildNetworkMetrics({ stats: [{ Name: 'reset-test', ReceivedBytes: bytes, SentBytes: bytes }], adapters }, now);

    sample(50_000, 0);
    const after = sample(10, 1000);
    expect(after.rx).toBe(0);
    expect(after.tx).toBe(0);
  });

  it('counts only physical adapters in the totals when any are connected', () => {
    const result = buildNetworkMetrics(
      {
        stats: [],
        adapters: [
          adapter('totals-wifi'),
          adapter('totals-vpn', { ConnectorPresent: false, Virtual: true }),
          adapter('totals-unplugged', { MediaConnectState: DISCONNECTED }),
        ],
      },
      0
    );
    expect(result.interface).toBe('totals-wifi');
    expect(result.interfaces.map(i => i.name)).toEqual(['totals-wifi', 'totals-vpn']);
  });

  it('falls back to virtual adapters when no physical adapter is connected', () => {
    const result = buildNetworkMetrics(
      { stats: [], adapters: [adapter('fallback-vpn', { Virtual: true })] },
      0
    );
    expect(result.interface).toBe('fallback-vpn');
  });

  it('reports N/A with no connected adapters', () => {
    expect(buildNetworkMetrics({ stats: [], adapters: [] }, 0).interface).toBe('N/A');
  });
});
