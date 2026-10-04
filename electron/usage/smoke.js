import { app, session, BrowserWindow, safeStorage, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ClaudeProvider } from './providers/claude.js';
import { CodexProvider } from './providers/codex.js';
import { publicError } from './errors.js';

// Explicit local diagnostics: no sign-in, turns, or raw account/credential output.
export async function runUsageSmoke() {
  const root = path.join(app.getPath('userData'), 'ai-usage');
  const outputArgument = process.argv.find(value => value.startsWith('--usage-smoke-output='));
  const providers = {
    claude: new ClaudeProvider({ session: session.fromPartition('superpanel-claude-usage'), BrowserWindow, safeStorage, directory: root }),
    codex: new CodexProvider({ directory: path.join(root, 'codex'), openExternal: url => shell.openExternal(url) }),
  };
  const results = {};
  for (const [id, provider] of Object.entries(providers)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      let snapshot = await provider.read({ signal: controller.signal });
      if (snapshot.needsOrganization && snapshot.organizations.length) {
        // Smoke tests do not choose a workspace implicitly. The user explicitly
        // passes the selected workspace ID when an account has several.
        const org = process.argv.find(value => value.startsWith('--usage-smoke-organization='))?.split('=')[1];
        if (org) snapshot = await provider.read({ signal: controller.signal, organizationId: org });
      }
      results[id] = { success: !snapshot.needsOrganization, observedAt: snapshot.observedAt,
        windows: snapshot.windows, needsOrganization: snapshot.needsOrganization || false };
    } catch (error) { results[id] = { success: false, error: publicError(error) }; }
    finally { clearTimeout(timeout); provider.dispose(); }
  }
  if (outputArgument) {
    const output = outputArgument.slice('--usage-smoke-output='.length);
    if (path.isAbsolute(output)) {
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, JSON.stringify(results, null, 2));
    }
  }
  console.log(JSON.stringify(results));
  app.exit(Object.values(results).every(result => result.success) ? 0 : 1);
}
