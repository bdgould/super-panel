import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { UsageError } from './errors.js';

export class CodexRpc extends EventEmitter {
  constructor(child, timeoutMs = 20000) {
    super();
    this.child = child;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
    this.lines = createInterface({ input: child.stdout });
    this.lines.on('line', line => this.receive(line));
    // Drain diagnostics without forwarding potentially sensitive remote output.
    child.stderr?.on('data', () => {});
    child.stdin.on('error', () => this.fail());
    child.on('error', () => this.fail());
    child.on('exit', () => this.fail());
  }
  receive(line) {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id != null && this.pending.has(message.id)) {
      const request = this.pending.get(message.id);
      this.pending.delete(message.id);
      request.cleanup();
      if (message.error) {
        const code = message.error.code === -32601 ? 'unsupported-version' : 'unavailable';
        request.reject(new UsageError(code, code === 'unsupported-version'
          ? 'Update Codex to a version that supports account usage.' : 'Codex could not complete this account request. Reconnect or try again.'));
      } else request.resolve(message.result);
    } else if (message.method && message.id == null) this.emit('notification', message);
  }
  request(method, params, { signal, timeoutMs = this.timeoutMs } = {}) {
    if (this.closed) return Promise.reject(new UsageError('runtime', 'Codex stopped. Try refreshing again.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.pending.delete(id);
        cleanup();
        reject(new UsageError('cancelled', 'The usage request was cancelled.'));
      };
      const timer = setTimeout(() => {
        this.pending.delete(id);
        cleanup();
        reject(new UsageError('timeout', 'Codex did not respond in time. Try again.'));
      }, timeoutMs);
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      this.pending.set(id, { resolve, reject, cleanup });
      this.child.stdin.write(`${JSON.stringify({ id, method, ...(params === undefined ? {} : { params }) })}\n`);
    });
  }
  notify(method, params) {
    if (!this.closed) this.child.stdin.write(`${JSON.stringify({ method, ...(params === undefined ? {} : { params }) })}\n`);
  }
  fail() {
    if (this.closed) return;
    this.closed = true;
    this.lines.close();
    for (const request of this.pending.values()) {
      request.cleanup();
      request.reject(new UsageError('runtime', 'Codex stopped. Try refreshing again.'));
    }
    this.pending.clear();
    this.emit('closed');
  }
  dispose() { this.fail(); this.child.kill(); this.removeAllListeners(); }
}
