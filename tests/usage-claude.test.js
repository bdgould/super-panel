import { describe, expect, it, vi } from 'vitest';
import { ClaudeProvider } from '../electron/usage/providers/claude.js';
import { UsageError } from '../electron/usage/errors.js';

function makeProvider(fetch) {
  const session = { fetch, clearStorageData: vi.fn(), cookies: { get: vi.fn() } };
  const provider = new ClaudeProvider({ directory: '.', session, safeStorage: { isEncryptionAvailable: () => true } });
  provider.restored = true;
  provider.persist = vi.fn();
  return { provider, session };
}
const response = (status, data = {}, headers = {}) => ({ ok: status >= 200 && status < 300, status,
  headers: new Headers({ 'content-type': 'application/json', ...headers }), json: async () => data });

describe('Claude account adapter', () => {
  it('allows an explicit reconnect to replace an unreadable saved login', async () => {
    const { provider, session } = makeProvider(vi.fn());
    provider.restore = vi.fn().mockRejectedValue(new UsageError('authentication', 'Unreadable session'));
    const loadURL = vi.fn();
    provider.BrowserWindow = class {
      constructor() { this.webContents = { on: vi.fn(), setWindowOpenHandler: vi.fn(), session: { setPermissionRequestHandler: vi.fn() } }; }
      on() {}
      loadURL = loadURL;
    };
    await provider.connect();
    expect(session.clearStorageData).toHaveBeenCalledOnce();
    expect(loadURL).toHaveBeenCalledWith('https://claude.ai/settings/usage');
  });
  it('reads only the selected workspace and persists after a successful reading', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(200, [{ uuid: 'personal', name: 'Personal' }, { uuid: 'team', name: 'Team' }]))
      .mockResolvedValueOnce(response(200, { five_hour: { utilization: 4, resets_at: '2026-10-04T21:00:00Z' } }));
    const { provider } = makeProvider(fetch);
    const snapshot = await provider.read({ organizationId: 'team' });
    expect(snapshot.account.id).toBe('team');
    expect(fetch.mock.calls[1][0]).toBe('https://claude.ai/api/organizations/team/usage');
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'include', redirect: 'error' });
    expect(provider.persist).toHaveBeenCalledOnce();
  });
  it.each([[401, 'authentication'], [403, 'challenge'], [429, 'rate-limited'], [503, 'unavailable']])(
    'classifies HTTP %s without returning the response body', async (status, code) => {
      const { provider } = makeProvider(vi.fn().mockResolvedValue(response(status, { secret: 'private' })));
      await expect(provider.read()).rejects.toMatchObject({ code });
      expect(provider.persist).not.toHaveBeenCalled();
    });
  it('respects retry-after and identifies HTML challenges', async () => {
    const { provider } = makeProvider(vi.fn().mockResolvedValue(response(429, {}, { 'retry-after': '120' })));
    await expect(provider.read()).rejects.toMatchObject({ retryAfterMs: 120000 });
    provider.session.fetch = vi.fn().mockResolvedValue(response(200, {}, { 'content-type': 'text/html' }));
    await expect(provider.read()).rejects.toMatchObject({ code: 'challenge' });
  });
  it('never saves credentials if OS encryption is unavailable', () => {
    const { provider } = makeProvider(vi.fn());
    provider.safeStorage.isEncryptionAvailable = () => false;
    expect(() => provider.ensureEncryption()).toThrow('Secure credential storage');
  });
  it('refuses an organization ID that is no longer on the account', async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, [{ uuid: 'new', name: 'New account' }]));
    const { provider } = makeProvider(fetch);
    const result = await provider.read({ organizationId: 'old' });
    expect(result.needsOrganization).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
