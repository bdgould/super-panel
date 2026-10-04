import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CodexRpc } from '../rpc.js';
import { UsageError } from '../errors.js';
import { normalizeCodex } from '../normalize.js';

const execute = promisify(execFile);
export async function findCodexExecutable(override = null, environment = process.env) {
  if (override) {
    if (!path.isAbsolute(override) || (process.platform === 'win32' && !override.toLowerCase().endsWith('.exe'))) {
      throw new UsageError('runtime', 'Choose the Codex executable (.exe).');
    }
    if ((await fs.stat(override).catch(() => null))?.isFile()) return override;
    throw new UsageError('runtime', 'The selected Codex executable was not found.');
  }
  const file = process.platform === 'win32' ? 'codex.exe' : 'codex';
  for (const folder of (environment.PATH || environment.Path || '').split(path.delimiter)) {
    const candidate = path.join(folder.replace(/^"|"$/g, ''), file);
    if (path.isAbsolute(candidate) && (await fs.stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
  if (process.platform === 'win32' && environment.LOCALAPPDATA) {
    const base = path.join(environment.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    const directories = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
    const candidates = [];
    for (const directory of directories.filter(entry => entry.isDirectory())) {
      const candidate = path.join(base, directory.name, file);
      const stat = await fs.stat(candidate).catch(() => null);
      if (stat?.isFile()) candidates.push({ candidate, modified: stat.mtimeMs });
    }
    candidates.sort((a, b) => b.modified - a.modified);
    if (candidates.length) return candidates[0].candidate;
  }
  throw new UsageError('runtime-missing', 'Install Codex or choose its executable to connect.');
}

export class CodexProvider {
  constructor({ directory, openExternal, executable = null, spawnProcess = spawn }) {
    this.directory = directory;
    this.openExternal = openExternal;
    this.executable = executable;
    this.spawnProcess = spawnProcess;
    this.rpc = null;
    this.starting = null;
    this.loginId = null;
    this.onUpdate = () => {};
  }

  async start() {
    if (this.rpc && !this.rpc.closed) return this.rpc;
    if (this.starting) return this.starting;
    this.starting = this.startRuntime().finally(() => { this.starting = null; });
    return this.starting;
  }
  async startRuntime() {
    const executable = await findCodexExecutable(this.executable);
    try { await execute(executable, ['--version'], { windowsHide: true, timeout: 10000 }); }
    catch { throw new UsageError('runtime', 'The Codex executable could not start.'); }
    await fs.mkdir(this.directory, { recursive: true });
    const environment = { ...process.env, CODEX_HOME: this.directory };
    delete environment.OPENAI_API_KEY;
    delete environment.CODEX_API_KEY;
    // Isolated home and OS keyring: never read or overwrite another client's auth.
    const child = this.spawnProcess(executable, ['app-server', '-c', 'cli_auth_credentials_store="keyring"'], {
      cwd: this.directory, env: environment, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    const rpc = new CodexRpc(child);
    this.rpc = rpc;
    rpc.on('notification', message => {
      if (message.method === 'account/login/completed' || message.method === 'account/rateLimits/updated') this.onUpdate(message.method);
    });
    try {
      await rpc.request('initialize', { clientInfo: { name: 'super_panel_usage', title: 'SuperPanel', version: '1.0.0' } });
      rpc.notify('initialized');
      return rpc;
    } catch (error) { rpc.dispose(); this.rpc = null; throw error; }
  }
  async connect() {
    const rpc = await this.start();
    const existing = await rpc.request('account/read', { refreshToken: true });
    if (existing.account?.type === 'chatgpt') return;
    if (this.loginId) await rpc.request('account/login/cancel', { loginId: this.loginId });
    const login = await rpc.request('account/login/start', { type: 'chatgpt' });
    let url;
    try { url = new URL(login.authUrl); } catch { throw new UsageError('invalid-data', 'Codex returned an invalid sign-in link.'); }
    if (url.protocol !== 'https:' || !['auth.openai.com', 'chatgpt.com'].includes(url.hostname)) {
      throw new UsageError('invalid-data', 'Codex returned an unexpected sign-in link.');
    }
    this.loginId = login.loginId;
    await this.openExternal(url.href);
  }
  async read({ signal } = {}) {
    const rpc = await this.start();
    const { account } = await rpc.request('account/read', { refreshToken: true }, { signal });
    if (account?.type !== 'chatgpt') throw new UsageError('authentication', 'Connect your ChatGPT account to read Codex usage.');
    const payload = await rpc.request('account/rateLimits/read', undefined, { signal });
    return normalizeCodex(payload, account);
  }
  async disconnect() {
    const rpc = await this.start();
    if (this.loginId) await rpc.request('account/login/cancel', { loginId: this.loginId }).catch(() => {});
    await rpc.request('account/logout');
    this.loginId = null;
    this.dispose();
  }
  dispose() { this.rpc?.dispose(); this.rpc = null; }
}
