# AI usage implementation validation

Feature branch: `codex/claude-codex-usage`.

## Phase 1: connections

- Baseline: 32 tests passed; renderer build passed.
- Adapter/transport regression: 56 tests passed; renderer build passed; Windows unpacked package passed.
- Packaged connection screen: user signed into both providers; Claude returned 5-hour and weekly readings, Codex returned both windows with durations and resets. User confirmed Claude readings matched its Usage page.
- User closed Claude Code. A fresh packaged SuperPanel process restored both connections and retrieved new readings without sign-in or a model turn. Claude returned 4% session / 13% weekly; Codex returned 32% session / 5% weekly during that test. No account identity or credentials are recorded here.
- Claude credentials use an in-memory Electron partition and an encrypted snapshot via Electron 28 safeStorage (Windows DPAPI); external browser cookies are never imported. Codex uses a dedicated SuperPanel home and explicit keyring credential storage.
- Claude's documented five-hour session and weekly limits supply the recognized window durations. Packaged independent reads confirmed stable resets; other unknown windows do not acquire invented durations.

Diagnostics output is kept in ignored `logs/`; connection tests expose only normalized readings, never raw authenticated responses.

The first rebuild failed because the running prototype held package files open. Closing its processes allowed packaging to pass. This was a file-lock failure, not an application regression.

## Phase 2: service and settings

- 74 tests passed; renderer build and Windows unpacked package passed.
- The service suite covers independent opt-in collection, overlapping requests, network backoff, provider retry-after, minimize/restore, timeout cleanup, reset-boundary refresh, account changes, disconnect, and disabling during an active read.
- User connected both accounts in the packaged Settings UI. Dashboard cards are the next phase, so this build still displays only the original system metrics.
- UI automation was stopped with Escape during the Settings check. Further interaction checks will use an isolated application test harness and a final packaged smoke test.

## Phase 3: compact usage dials

- 88 tests passed; renderer build and Windows unpacked package passed after the final design changes.
- Native Computer Use inspection confirmed live provider readings and the concentric dials in the packaged app. Both connections survived a fresh app restart.
- Weekly is the outer arc, session is the inner arc. White ticks follow the same 270-degree scale and are withheld for stale, expired, or unknown timing. Expired readings never become a fabricated zero.
- Both providers occupy a left column beside smaller system cards. The isolated 1024×600 test confirms both cards fit and precede system metrics horizontally. When both are disabled, the original metrics layout remains.
- Press-and-hold opens the details modal; its per-window bars include elapsed ticks, exact reset times, source, reading age, and pace comparisons. Additional model-specific or Codex buckets remain available in details.
- Final visual refinements use locally bundled Claude/Codex logos, internal labels matching their ring colors, and system-card hover/press feedback. The dashboard omits legends, reset rows, and updated-at text; stale state remains visible. Reset countdowns, exact resets, and reading time are available in details. Asset provenance is recorded in `src/assets/providers/ATTRIBUTION.md`.

## Phase 4: regression and delivery

- `scripts/test-usage-ui.mjs` runs an isolated Electron process with real preload, config persistence, usage IPC, service, normalization, and renderer. Only provider transports and system readings are fixtures. It never reads the user's accounts.
- UI regression passed: neither/one/both providers, connect without visibility, Save/Cancel, 1024×600 split and metrics-only layouts, long press, modal bars, stale/expired readings, retained network error, isolated disconnect, and minimize/restore service events. No renderer exceptions were observed.
- Account adapter regression includes allowlisted Codex login URLs, API-key rejection, failed-logout child cleanup, and explicit Claude reconnect after an unreadable encrypted login.
- Setup and troubleshooting are documented in `docs/ai-usage.md`. Real auth is tested manually, never through CI or scripted credential entry. Claude uses authenticated web endpoints, which may change or challenge the session; the UI preserves the last reading and offers reconnect rather than reporting fake usage.

Run renderer UI regression after `npm run build`, with Playwright available:

```powershell
node scripts/test-usage-ui.mjs
# Or pass the absolute path to an existing Playwright index.mjs.
```

Screenshots and isolated fixture profiles remain in ignored `logs/`. Unit tests require no network or live credentials.
