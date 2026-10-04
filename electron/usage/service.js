import { EventEmitter } from 'node:events';
import { publicError, UsageError } from './errors.js';

export const USAGE_REFRESH_MS = 180000;
export const USAGE_STALE_MS = 360000;
const IDS = ['claude', 'codex'];

export class UsageService extends EventEmitter {
  constructor({ providers, connections = {}, persistConnection = () => {}, disableProvider = () => {}, now = Date.now,
    requestTimeoutMs = 30000 }) {
    super();
    this.providers = providers;
    this.persistConnection = persistConnection;
    this.disableProvider = disableProvider;
    this.now = now;
    this.requestTimeoutMs = requestTimeoutMs;
    this.visible = true;
    this.disposed = false;
    this.enabled = {};
    this.jobs = {};
    this.generations = { claude: 0, codex: 0 };
    this.failures = {};
    this.nextRefresh = {};
    this.connections = { ...connections };
    this.states = Object.fromEntries(IDS.map(id => [id, { provider: id, configured: Boolean(connections[id]),
      connection: connections[id] ? 'connected' : 'disconnected', account: connections[id]?.account || null,
      snapshot: null, error: null, refreshing: false, organizations: [] }]));
  }
  validate(id) { if (!IDS.includes(id)) throw new UsageError('invalid-provider', 'Unknown usage provider.'); }
  status() { return structuredClone(this.states); }
  publish() { if (!this.disposed) this.emit('status', this.status()); }
  setSettings(settings) {
    for (const id of IDS) {
      const previous = this.enabled[id];
      this.enabled[id] = Boolean(settings?.aiUsage?.[id]?.enabled && this.connections[id]);
      if (previous && !this.enabled[id]) this.cancel(id);
    }
    this.publish();
    void this.tick();
  }
  cancel(id) {
    this.generations[id]++;
    this.jobs[id]?.controller.abort();
    delete this.jobs[id];
    this.states[id].refreshing = false;
    this.providers[id].dispose?.();
  }
  setVisible(visible) {
    this.visible = visible;
    if (visible) void this.tick();
  }
  start() { this.timer = setInterval(() => { void this.tick(); }, 1000); this.timer.unref?.(); }
  async tick() {
    if (this.disposed || !this.visible) return;
    await Promise.all(IDS.map(async id => {
      const state = this.states[id];
      if (!this.enabled[id] || state.connection === 'reconnect-required' || state.connection === 'disconnected') return;
      const now = this.now();
      const resetDue = state.snapshot?.windows.some(window => window.resetsAt != null && window.resetsAt <= now && window.resetsAt > (state.snapshot?.observedAt || 0));
      if (now >= (this.nextRefresh[id] || 0) || (resetDue && !this.failures[id] && !state.resetChecked)) {
        if (resetDue) state.resetChecked = true;
        await this.refresh(id);
      }
    }));
  }
  async connect(id, parent) {
    this.validate(id);
    if (this.states[id].connection === 'connecting') return this.status();
    this.cancel(id);
    const generation = this.generations[id];
    this.states[id] = { ...this.states[id], connection: 'connecting', error: null, snapshot: null, organizations: [] };
    this.publish();
    try {
      await this.providers[id].connect(parent);
      if (this.generations[id] !== generation || this.disposed) return this.status();
      // Sign-in completion is explicitly checked from Settings; no unauthenticated
      // website polling and no collection enabled as a side effect of Connect.
      await this.refresh(id, { connecting: true });
    } catch (error) {
      if (this.generations[id] === generation && !this.disposed) {
        this.states[id].connection = this.connections[id] ? 'reconnect-required' : 'disconnected';
        this.states[id].error = publicError(error);
        this.publish();
      }
    }
    return this.status();
  }
  refresh(id, { connecting = false, organizationId = null } = {}) {
    this.validate(id);
    if (this.disposed) return Promise.resolve(this.status());
    if (!this.connections[id] && this.states[id].connection !== 'connecting') return Promise.resolve(this.status());
    if (this.jobs[id]) return this.jobs[id].promise;
    if (this.states[id].error?.code === 'rate-limited' && this.now() < this.nextRefresh[id]) return Promise.resolve(this.status());
    const generation = this.generations[id];
    const controller = new AbortController();
    const state = this.states[id];
    state.refreshing = true;
    const job = { controller, promise: null };
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    job.promise = (async () => {
      try {
        const reading = await this.providers[id].read({ signal: controller.signal,
          organizationId: organizationId || this.connections[id]?.organizationId });
        if (generation !== this.generations[id] || this.disposed) return this.status();
        if (reading.needsOrganization) {
          state.organizations = reading.organizations;
          state.connection = 'connecting';
          state.snapshot = null;
          state.error = { code: 'workspace', message: 'Choose a Claude workspace and check the connection.', retryAfterMs: null };
          return this.status();
        }
        if (state.account?.id !== reading.account.id) state.snapshot = null;
        const connection = { account: reading.account,
          ...(id === 'claude' ? { organizationId: reading.account.id } : {}),
          ...(id === 'codex' && this.providers[id].executable ? { executable: this.providers[id].executable } : {}) };
        await this.persistConnection(id, connection);
        if (generation !== this.generations[id] || this.disposed) return this.status();
        this.connections[id] = connection;
        state.configured = true;
        state.connection = 'connected';
        state.account = reading.account;
        state.snapshot = reading;
        state.organizations = [];
        state.error = null;
        state.resetChecked = false;
        this.failures[id] = 0;
        this.nextRefresh[id] = this.now() + USAGE_REFRESH_MS;
      } catch (error) {
        if (generation !== this.generations[id] || this.disposed) return this.status();
        const sanitized = publicError(error);
        // A sign-in window can be waiting for the first login; keep it usable.
        if ((connecting || state.connection === 'connecting') && sanitized.code === 'authentication') {
          state.error = { ...sanitized, message: 'Finish sign-in, then check the connection.' };
        } else {
          state.error = sanitized;
          if (sanitized.code === 'authentication') state.connection = 'reconnect-required';
        }
        this.failures[id] = (this.failures[id] || 0) + 1;
        this.nextRefresh[id] = this.now() + Math.max(sanitized.retryAfterMs || 0,
          Math.min(1800000, 30000 * 2 ** Math.min(this.failures[id] - 1, 6)));
      } finally {
        clearTimeout(timeout);
        if (this.jobs[id] === job) {
          delete this.jobs[id]; state.refreshing = false; this.publish();
        }
      }
      return this.status();
    })();
    this.jobs[id] = job;
    this.publish();
    return job.promise;
  }
  async disconnect(id) {
    this.validate(id);
    this.cancel(id);
    // Clear metadata/card first so a late reading cannot restore the connection.
    await this.persistConnection(id, null);
    delete this.connections[id];
    this.enabled[id] = false;
    await this.disableProvider(id);
    this.states[id] = { provider: id, configured: false, connection: 'disconnected', account: null,
      snapshot: null, error: null, refreshing: false, organizations: [] };
    try { await this.providers[id].disconnect(); }
    catch (error) { this.states[id].error = publicError(error); }
    this.publish();
    return this.status();
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    for (const id of IDS) this.cancel(id);
    this.removeAllListeners();
  }
}
