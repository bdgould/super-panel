import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { CodexRpc } from '../electron/usage/rpc.js';

function transport() {
  const child = new EventEmitter();
  child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
  child.kill = vi.fn();
  const rpc = new CodexRpc(child, 20);
  return { child, rpc };
}
describe('Codex stdio transport', () => {
  it('matches responses by ID and handles fragmented input', async () => {
    const { child, rpc } = transport();
    const first = rpc.request('account/read'); const second = rpc.request('account/rateLimits/read');
    child.stdout.write('{"id":2,"result":{"ok":true}}\n{"id":');
    child.stdout.write('1,"result":{"account":null}}\n');
    expect(await second).toEqual({ ok: true }); expect(await first).toEqual({ account: null });
    rpc.dispose(); expect(child.kill).toHaveBeenCalled();
  });
  it('times out and ignores a late response', async () => {
    const { child, rpc } = transport();
    await expect(rpc.request('account/read')).rejects.toMatchObject({ code: 'timeout' });
    child.stdout.write('{"id":1,"result":{}}\n');
    expect(rpc.pending.size).toBe(0); rpc.dispose();
  });
  it('cleans up pending requests on exit and cancellation', async () => {
    const { child, rpc } = transport();
    const controller = new AbortController();
    const first = rpc.request('account/read', undefined, { signal: controller.signal });
    controller.abort(); await expect(first).rejects.toMatchObject({ code: 'cancelled' });
    const second = rpc.request('account/read'); child.emit('exit', 1);
    await expect(second).rejects.toMatchObject({ code: 'runtime' });
    expect(rpc.pending.size).toBe(0); rpc.dispose();
  });
  it('sanitizes server errors and reports unsupported methods', async () => {
    const { child, rpc } = transport();
    const request = rpc.request('account/read');
    child.stdout.write('{"id":1,"error":{"code":-32601,"message":"secret"}}\n');
    await expect(request).rejects.toMatchObject({ code: 'unsupported-version' }); rpc.dispose();
  });
});
