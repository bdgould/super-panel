import { describe, expect, it, vi } from 'vitest';
import { CodexProvider } from '../electron/usage/providers/codex.js';

function fixture(request) {
  const openExternal = vi.fn();
  const provider = new CodexProvider({ directory: 'isolated-test-home', openExternal });
  const rpc = { request, dispose: vi.fn() };
  provider.start = vi.fn().mockResolvedValue(rpc);
  provider.rpc = rpc;
  return { provider, rpc, openExternal };
}
describe('Codex account adapter', () => {
  it('reuses a working ChatGPT connection without another sign-in', async () => {
    const { provider, rpc, openExternal } = fixture(vi.fn().mockResolvedValueOnce({ account: { type: 'chatgpt' } }).mockResolvedValueOnce({}));
    await provider.connect();
    expect(rpc.request.mock.calls.map(call => call[0])).toEqual(['account/read', 'account/rateLimits/read']);
    expect(openExternal).not.toHaveBeenCalled();
  });
  it('opens only an allowlisted managed login URL', async () => {
    const { provider, openExternal } = fixture(vi.fn().mockResolvedValueOnce({ account: null })
      .mockResolvedValueOnce({ authUrl: 'https://auth.openai.com/login', loginId: 'fixture' }));
    await provider.connect();
    expect(openExternal).toHaveBeenCalledWith('https://auth.openai.com/login');
    expect(provider.loginId).toBe('fixture');
  });
  it.each(['http://auth.openai.com/login', 'https://evil.invalid/login'])('rejects unexpected auth URL %s', async authUrl => {
    const { provider, openExternal } = fixture(vi.fn().mockResolvedValueOnce({ account: null }).mockResolvedValueOnce({ authUrl }));
    await expect(provider.connect()).rejects.toMatchObject({ code: 'invalid-data' });
    expect(openExternal).not.toHaveBeenCalled();
  });
  it('rejects API-key accounts before requesting subscription usage', async () => {
    const { provider, rpc } = fixture(vi.fn().mockResolvedValue({ account: { type: 'apiKey' } }));
    await expect(provider.read()).rejects.toMatchObject({ code: 'authentication' });
    expect(rpc.request).toHaveBeenCalledOnce();
  });
  it('disposes the child even when logout fails', async () => {
    const { provider, rpc } = fixture(vi.fn().mockRejectedValue(new Error('offline')));
    await expect(provider.disconnect()).rejects.toThrow('offline');
    expect(rpc.dispose).toHaveBeenCalledOnce();
    expect(provider.rpc).toBeNull();
  });
});
