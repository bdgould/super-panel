import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsageService, USAGE_REFRESH_MS } from '../electron/usage/service.js';
import { UsageError } from '../electron/usage/errors.js';

const snapshot = (id = 'account', observedAt = 1000) => ({ provider: 'claude', account: { id, label: id }, observedAt,
  windows: [{ id: 'five_hour', usedPercent: 25, resetsAt: 18000000, durationMs: null }] });
const instances = [];
function fixture({ configured = true, read = vi.fn().mockResolvedValue(snapshot()), now = () => 1000, timeout = 30000 } = {}) {
  const providers = Object.fromEntries(['claude', 'codex'].map(id => [id, { read: id === 'claude' ? read : vi.fn().mockResolvedValue(snapshot()),
    connect: vi.fn(), disconnect: vi.fn(), dispose: vi.fn() }]));
  const persist = vi.fn(); const disable = vi.fn();
  const service = new UsageService({ providers, connections: configured ? { claude: { account: { id: 'account' } } } : {},
    persistConnection: persist, disableProvider: disable, now, requestTimeoutMs: timeout });
  instances.push(service);
  return { service, providers, read, persist, disable };
}
afterEach(() => { instances.splice(0).forEach(service => service.dispose()); vi.useRealTimers(); });

describe('usage collection lifecycle', () => {
  it('does not collect for missing configuration or disabled providers', async () => {
    const { service, providers } = fixture({ configured: false });
    service.setSettings({ aiUsage: { claude: { enabled: true }, codex: { enabled: false } } });
    await service.tick(); await service.refresh('claude');
    expect(providers.claude.read).not.toHaveBeenCalled();
    expect(providers.codex.read).not.toHaveBeenCalled();
  });
  it('coalesces overlapping requests and keeps providers independent', async () => {
    let finish;
    const read = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const { service, providers } = fixture({ read });
    const first = service.refresh('claude'); const second = service.refresh('claude');
    expect(first).toBe(second); expect(read).toHaveBeenCalledOnce();
    finish(snapshot()); await first;
    expect(service.status().claude.snapshot.windows[0].usedPercent).toBe(25);
    expect(providers.codex.read).not.toHaveBeenCalled();
  });
  it('retains observation time and backs off on network failure', async () => {
    let time = 1000;
    const { service, read } = fixture({ now: () => time });
    await service.refresh('claude');
    read.mockRejectedValue(new UsageError('network', 'Offline'));
    time = 5000; await service.refresh('claude');
    expect(service.status().claude.snapshot.observedAt).toBe(1000);
    expect(service.nextRefresh.claude).toBe(35000);
    await service.refresh('claude'); expect(service.nextRefresh.claude).toBe(65000);
  });
  it('respects provider retry-after even for manual refresh', async () => {
    const { service, read } = fixture({ read: vi.fn().mockRejectedValue(new UsageError('rate-limited', 'Wait', 600000)) });
    await service.refresh('claude'); await service.refresh('claude');
    expect(read).toHaveBeenCalledOnce(); expect(service.nextRefresh.claude).toBe(601000);
  });
  it('pauses scheduled collection while hidden and refreshes when restored and due', async () => {
    let time = 1000;
    const { service, read } = fixture({ now: () => time });
    service.setVisible(false); service.setSettings({ aiUsage: { claude: { enabled: true } } });
    await service.tick(); expect(read).not.toHaveBeenCalled();
    service.setVisible(true); await service.refresh('claude'); expect(read).toHaveBeenCalledOnce();
    time += USAGE_REFRESH_MS + 1; service.setVisible(false); await service.tick(); expect(read).toHaveBeenCalledOnce();
    service.setVisible(true); await service.refresh('claude'); expect(read).toHaveBeenCalledTimes(2);
  });
  it('disconnect discards readings from an in-flight request', async () => {
    let finish;
    const { service, persist, disable } = fixture({ read: vi.fn(() => new Promise(resolve => { finish = resolve; })) });
    const reading = service.refresh('claude');
    await service.disconnect('claude'); finish(snapshot()); await reading;
    expect(service.status().claude).toMatchObject({ configured: false, snapshot: null, connection: 'disconnected' });
    expect(persist).toHaveBeenCalledExactlyOnceWith('claude', null);
    expect(disable).toHaveBeenCalledWith('claude');
  });
  it('disabling cancels an active read without restoring state', async () => {
    let finish;
    const { service, providers } = fixture({ read: vi.fn(() => new Promise(resolve => { finish = resolve; })) });
    service.setSettings({ aiUsage: { claude: { enabled: true } } });
    const reading = service.refresh('claude'); service.setSettings({ aiUsage: { claude: { enabled: false } } });
    finish(snapshot()); await reading;
    expect(service.status().claude.snapshot).toBeNull();
    expect(service.status().claude.refreshing).toBe(false);
    expect(providers.claude.dispose).toHaveBeenCalled();
  });
  it('marks authentication failure as reconnect-required without removing configuration', async () => {
    const { service } = fixture({ read: vi.fn().mockRejectedValue(new UsageError('authentication', 'Reconnect')) });
    await service.refresh('claude');
    expect(service.status().claude).toMatchObject({ configured: true, connection: 'reconnect-required' });
  });
  it('a successful explicit connection does not enable polling', async () => {
    const { service, read } = fixture({ configured: false });
    await service.connect('claude'); await service.tick();
    expect(service.status().claude).toMatchObject({ configured: true, connection: 'connected' });
    expect(read).toHaveBeenCalledOnce(); expect(service.enabled.claude).toBeFalsy();
  });
  it('requests a new reading at reset without inventing a zero window', async () => {
    let time = 1000;
    const { service, read } = fixture({ now: () => time });
    service.setVisible(false); service.setSettings({ aiUsage: { claude: { enabled: true } } });
    read.mockResolvedValue(snapshot('account', 1000)); await service.refresh('claude');
    time = 18000001; read.mockRejectedValue(new UsageError('network', 'Offline'));
    service.setVisible(true); await service.refresh('claude');
    expect(service.status().claude.snapshot.windows[0].usedPercent).toBe(25);
    expect(service.status().claude.error.code).toBe('network');
  });
  it('replaces previous account data and persists new account identity', async () => {
    const { service, read, persist } = fixture();
    await service.refresh('claude'); read.mockResolvedValue(snapshot('new-account'));
    await service.refresh('claude');
    expect(service.status().claude.account.id).toBe('new-account');
    expect(persist).toHaveBeenLastCalledWith('claude', expect.objectContaining({ organizationId: 'new-account' }));
  });
  it('aborts hung requests at the deadline and releases timers on dispose', async () => {
    vi.useFakeTimers();
    const { service, providers } = fixture({ timeout: 50, read: vi.fn(({ signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new UsageError('timeout', 'Timeout')));
    })) });
    service.start(); const reading = service.refresh('claude');
    await vi.advanceTimersByTimeAsync(51); await reading;
    expect(service.status().claude.error.code).toBe('timeout');
    service.dispose(); expect(providers.claude.dispose).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
