# Claude and Codex usage cards

Status: implementation in progress; see [validation record](ai-usage-validation.md) for phase gates and results.

## Outcome and scope

Add two independent, opt-in dashboard cards: **Anthropic · Claude** and **OpenAI · Codex**. Both are hidden and perform no collection until configured and enabled in Settings. Each card displays the account's available usage windows, percentage consumed, reset countdown, and an elapsed-window pace marker. Claude collection must work with Claude Code closed and without launching it.

Initial scope is one account/workspace per provider on Windows. Keep windows separate; never add percentages from different windows, buckets, or sessions. Do not present Codex readings as comprehensive ChatGPT usage. API spending, token histories, forecasting, extra-credit purchases, and limit-reset actions are outside the first release.

## 1. Prove the connections before building the dashboard

### Claude feasibility prototype

- Open a dedicated, isolated Claude login window from Settings using a SuperPanel-owned browser session. The remote window has no application preload, no Node integration, and sandboxing enabled. Constrain navigation and popups to the verified authentication flow.
- Test sign-in, account/workspace identification, and usage retrieval through that authenticated session. The candidate source is the Claude website's organization usage endpoint; it is undocumented and must be isolated behind an adapter.
- Verify session and weekly percentages and reset timestamps against Claude's Usage page. Record sanitized response fixtures, including missing windows.
- Close Claude Code and all Claude application windows, then demonstrate successful repeated reads from SuperPanel alone.
- Restart SuperPanel and verify session persistence; test expiry, sign-out, network failure, rate limiting, and browser challenges. Determine and document Windows credential protection rather than assuming persistent Electron cookies provide the desired protection.
- Never import browser cookies silently or copy Claude Code credentials as a fallback. Do not attempt to bypass a login challenge.

**Gate:** proceed with the web adapter only after sign-in and independent refresh work in the installed Windows app. If embedded sign-in is blocked, record the failure and evaluate an explicit browser-assisted connection separately. Do not silently restore the Claude Code dependency or ship cached-only readings as live data.

### Codex feasibility prototype

- Detect an installed Codex executable, check its version, and communicate with a SuperPanel-owned `codex app-server` child process over stdio.
- Complete the initialization handshake, identify the account, and call `account/rateLimits/read`. Prefer `rateLimitsByLimitId` when available; fall back to the documented legacy view without duplicating it.
- Verify the provider's percentages, duration fields, and reset times against its own usage display. Handle absent windows and multiple buckets.
- Test with the Codex desktop app and interactive CLI sessions closed. An installed Codex runtime is an explicit first-version dependency; an active coding session is not.
- Decide during the prototype how to isolate SuperPanel's Codex authentication/configuration. Prefer a dedicated profile/home with managed login if supported. Disconnect must not sign the user out of unrelated Codex clients.
- Test missing executable, unsupported protocol, expired authentication, child-process exit, and packaged-app executable discovery.

**Gate:** retrieve usage without creating a model turn, verify account identity, and demonstrate clean startup/shutdown on Windows. Do not automatically install a runtime.

## 2. Shared usage service

Add a main-process service with two adapters. Suggested organization:

```text
electron/usage/service.js
electron/usage/normalize.js
electron/usage/providers/claude.js
electron/usage/providers/codex.js
electron/ipc/usage.js
src/contexts/UsageContext.jsx
src/components/UsagePanel/UsagePanel.jsx
src/components/UsagePanel/UsageCard.jsx
src/components/UsagePanel/UsagePanel.module.css
```

Each normalized snapshot contains provider, account/workspace identity, source, observation time, connection state, and a list of windows. Each window contains a stable bucket/window identifier, label, used percentage, duration when known, and reset time when known. Normalize timestamp units once at the boundary. Reject malformed data; preserve missing values as unavailable.

Keep settings, connection state, and measurements separate. Connection states include disconnected, connecting, connected, and reconnect-required. Measurement states include waiting, current, stale, expired, and unavailable. A network error does not erase configuration or imply expired credentials.

Refresh every three minutes while visible, on application restore when due, and on explicit Refresh. Coalesce overlapping requests, set timeouts, respect retry delays, and back off on repeated failures. Accept useful Codex notifications but do not depend on them as the only update source. Pause scheduled collection while minimized and stop it when a provider is disabled. Use a local UI timer for countdowns and pace markers.

Retain the original observation time with cached readings. At the reset boundary, request an update; do not fabricate a new window or set consumption to zero. Discard cached readings on account/workspace changes or disconnect. Keep diagnostics free of credentials and raw authenticated responses.

Expose a narrow `window.electron.usage` API for status, connection, disconnection, refresh, and snapshot subscriptions. Validate provider IDs and caller context for account operations. Only sanitized status and measurements cross IPC. Register handlers and dispose timers/listeners/child processes through `electron/main.js`.

## 3. Settings and persistence

Extend Settings with an **AI usage** section containing independent Claude and Codex configuration rows. Each shows connection status, account/workspace, Connect or Reconnect, a sample reading/last update, and Disconnect. Show a **Show on dashboard** toggle after configuration succeeds.

- Fresh installations and existing installations default to both disabled.
- Connect is an immediate, explicit account operation. Dashboard visibility follows the modal's Save/Cancel behavior. Explain this distinction briefly in the UI so Cancel does not misleadingly imply sign-in was undone.
- Disabling hides the card and stops collection while retaining the connection for later use.
- Disconnect immediately disables the provider and clears only SuperPanel-owned authentication and cached usage.
- A configured card remains visible on temporary failures or expired login so the user can see what needs attention.
- Persist ordinary configuration through the existing settings store; keep secrets out of its JSON and out of renderer state.
- Extend `electron/utils/settings.js` validation. Account for the current shallow settings merge so changing one provider cannot drop the other's configuration.

## 4. Cards and pace calculation

Place one compact card per enabled provider to the left of the circular system-metric grid. Shrink the system cards when usage cards are visible, and stack the groups on very narrow panels. Verify at the application's 1024 by 600 default size.

Each card has concentric 270-degree usage arcs: weekly on the outside, session on the inside. Show both percentages, reset countdowns, observation age, and connection problems. A radial tick on each arc marks elapsed time. Press and hold anywhere on the card to open its details; keyboard Enter/Space also opens it. The modal lists every available window, with usage bars, pace ticks, above/below-pace text, exact resets, and source. Use stable provider colors, with labeled percentages so color alone never carries meaning. No info icon or dashboard legend is needed.

For a confirmed bounded window with duration D and reset time R:

```text
start = R - D
elapsedFraction = clamp((now - start) / D, 0, 1)
paceMarkerPercent = 100 * elapsedFraction
paceDifferencePoints = usedPercent - paceMarkerPercent
```

Use durations supplied by Codex. For Claude's named windows, verify their timing semantics in the prototype before assigning durations. Hide the pace marker when duration/reset semantics are unknown, stale past reset, or represent a truly rolling allowance that cannot support this calculation. A pace marker is a budgeting reference, not a prediction of future availability.

## 5. Validation and delivery

Meaningful automated tests cover normalization for both providers; legacy and multi-bucket Codex responses; absent/malformed windows; seconds-to-milliseconds conversion; pace boundaries; reset expiry; account changes; provider-specific settings merges; disabled-provider non-collection; timeout/backoff behavior; and listener/process cleanup. Use sanitized fixtures and mocked transports, not live credentials in CI.

Manually verify both single-provider configurations, both providers together, neither provider enabled, Save/Cancel, reconnect/disconnect, offline recovery, restart persistence, minimized/resumed behavior, touch interaction, and split/full-width layouts. Validate that Claude works with Claude Code closed and Codex works without a running coding session. Check authentication protection and absence of secrets in configuration, IPC payloads, and logs.

Run `npm test`, `npm run build`, and the existing Windows unpacked packaging check. Smoke-test actual sign-in and collection in a packaged Windows build; development-mode success alone does not satisfy the connection gates.

Deliver in reviewable stages: (1) connection prototypes and feasibility findings, (2) service/adapters and settings, (3) dashboard cards and pacing, (4) packaged verification and setup/troubleshooting documentation. Follow the repository's feature-branch and pull-request workflow when implementation begins.

## Source references

- [Codex app-server documentation](https://learn.chatgpt.com/docs/app-server): managed authentication, stdio transport, account rate-limit reads and notifications.
- [Claude Usage page guidance](https://support.claude.com/en/articles/9797557-usage-limit-best-practices): subscription-window display used for comparison.
- [CodexBar Claude adapter documentation](https://github.com/steipete/CodexBar/blob/main/docs/claude.md): implementation precedent for authenticated Claude web usage reads; not an Anthropic support guarantee.
- [Anthropic Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api): platform/organization reporting, distinct from the personal subscription-window integration.

The endpoint and protocol details above reflect research for this plan and must be revalidated against installed versions during implementation.
