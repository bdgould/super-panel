import fs from 'node:fs/promises';
import path from 'node:path';
import { UsageError } from '../errors.js';
import { normalizeClaude } from '../normalize.js';

const ORIGIN = 'https://claude.ai';
export function isClaudeCookie(cookie) {
  return cookie && typeof cookie.domain === 'string' && /^(\.)?claude\.ai$/.test(cookie.domain);
}
export function isClaudeLoginUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['claude.ai', 'accounts.google.com'].includes(url.hostname);
  } catch { return false; }
}

export class ClaudeProvider {
  constructor({ session, BrowserWindow, safeStorage, directory }) {
    this.session = session;
    this.BrowserWindow = BrowserWindow;
    this.safeStorage = safeStorage;
    this.directory = directory;
    this.credentialsPath = path.join(directory, 'claude-session.enc');
    this.loginWindow = null;
    this.restored = false;
    this.selectedOrganization = null;
  }

  ensureEncryption() {
    if (!this.safeStorage.isEncryptionAvailable() ||
      this.safeStorage.getSelectedStorageBackend?.() === 'basic_text') {
      throw new UsageError('secure-storage', 'Secure credential storage is unavailable on this computer.');
    }
  }

  async restore() {
    if (this.restored) return;
    this.ensureEncryption();
    let encrypted;
    try { encrypted = await fs.readFile(this.credentialsPath); }
    catch (error) { if (error.code === 'ENOENT') { this.restored = true; return; } throw error; }
    let cookies;
    try { cookies = JSON.parse(this.safeStorage.decryptString(encrypted)); }
    catch { throw new UsageError('authentication', 'Reconnect Claude to restore your saved session.'); }
    if (!Array.isArray(cookies)) throw new UsageError('authentication', 'Reconnect Claude to restore your saved session.');
    for (const cookie of cookies.filter(isClaudeCookie)) {
      if (cookie.expirationDate && cookie.expirationDate <= Date.now() / 1000) continue;
      await this.session.cookies.set({ url: ORIGIN, name: cookie.name, value: cookie.value,
        domain: cookie.domain, path: cookie.path || '/', secure: cookie.secure,
        httpOnly: cookie.httpOnly, expirationDate: cookie.expirationDate, sameSite: cookie.sameSite });
    }
    this.restored = true;
  }

  async persist() {
    this.ensureEncryption();
    const cookies = (await this.session.cookies.get({})).filter(isClaudeCookie);
    if (!cookies.some(cookie => cookie.name === 'sessionKey' && cookie.value)) {
      throw new UsageError('authentication', 'Sign in to Claude, then try reading usage again.');
    }
    await fs.mkdir(this.directory, { recursive: true });
    const temporary = `${this.credentialsPath}.tmp`;
    await fs.writeFile(temporary, this.safeStorage.encryptString(JSON.stringify(cookies)));
    await fs.rename(temporary, this.credentialsPath);
  }

  async connect(parent) {
    try { await this.restore(); }
    catch (error) {
      if (error.code !== 'authentication') throw error;
      // An explicit reconnect must be able to replace an unreadable saved login.
      await this.session.clearStorageData();
      this.restored = true;
    }
    if (this.loginWindow && !this.loginWindow.isDestroyed()) { this.loginWindow.focus(); return; }
    const window = new this.BrowserWindow({ width: 920, height: 760, parent,
      title: 'Connect Claude — SuperPanel', autoHideMenuBar: true,
      webPreferences: { session: this.session, nodeIntegration: false, contextIsolation: true, sandbox: true } });
    this.loginWindow = window;
    const guard = (event, url) => { if (!isClaudeLoginUrl(url)) event.preventDefault(); };
    window.webContents.on('will-navigate', guard);
    window.webContents.on('will-redirect', guard);
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (isClaudeLoginUrl(url)) void window.loadURL(url).catch(() => {});
      return { action: 'deny' };
    });
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.on('closed', () => { if (this.loginWindow === window) this.loginWindow = null; });
    try { await window.loadURL(`${ORIGIN}/settings/usage`); }
    catch { throw new UsageError('network', 'Claude sign-in could not load. Check your connection.'); }
  }

  async request(endpoint, signal) {
    let response;
    try {
      response = await this.session.fetch(`${ORIGIN}${endpoint}`, { credentials: 'include', signal,
        redirect: 'error', headers: { Accept: 'application/json' } });
    } catch { throw new UsageError('network', 'Claude usage could not be reached. Try again.'); }
    if (response.status === 401) throw new UsageError('authentication', 'Reconnect Claude to refresh usage.');
    if (response.status === 429) {
      const retry = response.headers.get('retry-after');
      const seconds = Number(retry);
      const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Math.max(0, Date.parse(retry) - Date.now());
      throw new UsageError('rate-limited', 'Claude asked us to wait before refreshing.', Number.isFinite(delay) && delay > 0 ? delay : 300000);
    }
    if (response.status === 403) throw new UsageError('challenge', 'Open Connect Claude to check your session or browser challenge.');
    if (!response.ok) throw new UsageError('unavailable', 'Claude usage is temporarily unavailable.');
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new UsageError('challenge', 'Open Connect Claude to check your session or browser challenge.');
    }
    try { return await response.json(); }
    catch { throw new UsageError('invalid-data', 'Claude returned unreadable usage data.'); }
  }

  async read({ signal, organizationId = null } = {}) {
    await this.restore();
    const organizations = await this.request('/api/organizations', signal);
    if (!Array.isArray(organizations)) throw new UsageError('invalid-data', 'Claude account could not be identified.');
    const available = organizations.filter(org => typeof org?.uuid === 'string');
    const selected = organizationId || this.selectedOrganization;
    const organization = selected ? available.find(org => org.uuid === selected) : available.length === 1 ? available[0] : null;
    if (!organization) {
      if (!available.length) throw new UsageError('authentication', 'Sign in to Claude to read usage.');
      // Return only workspace identity; never guess or merge multiple accounts.
      return { needsOrganization: true, organizations: available.map(org => ({ id: org.uuid, label: typeof org.name === 'string' ? org.name.slice(0, 160) : 'Claude workspace' })) };
    }
    const payload = await this.request(`/api/organizations/${encodeURIComponent(organization.uuid)}/usage`, signal);
    const snapshot = normalizeClaude(payload, organization);
    await this.persist();
    this.selectedOrganization = organization.uuid;
    this.closeLogin();
    return snapshot;
  }

  closeLogin() { if (this.loginWindow && !this.loginWindow.isDestroyed()) this.loginWindow.close(); }
  async disconnect() {
    this.closeLogin();
    await this.session.clearStorageData();
    await fs.rm(this.credentialsPath, { force: true });
    this.selectedOrganization = null;
    this.restored = true;
  }
  dispose() { this.closeLogin(); }
}
