# AI usage implementation validation

Feature branch: `codex/claude-codex-usage`.

## Phase 1: connections

- Baseline: 32 tests passed; renderer build passed.
- Adapter/transport regression: 56 tests passed; renderer build passed; Windows unpacked package passed.
- Packaged connection screen: user signed into both providers; Claude returned 5-hour and weekly readings, Codex returned both windows with durations and resets. User confirmed Claude readings matched its Usage page.
- User closed Claude Code. A fresh packaged SuperPanel process restored both connections and retrieved new readings without sign-in or a model turn. Claude returned 4% session / 13% weekly; Codex returned 32% session / 5% weekly during that test. No account identity or credentials are recorded here.
- Claude credentials use an in-memory Electron partition and an encrypted snapshot via Electron 28 safeStorage (Windows DPAPI); external browser cookies are never imported. Codex uses a dedicated SuperPanel home and explicit keyring credential storage.
- Claude timing semantics still need confirmation before enabling its pace tick. Its quota bars and countdowns are independently available.

Diagnostics output is kept in ignored `logs/`; connection tests expose only normalized readings, never raw authenticated responses.

The first rebuild failed because the running prototype held package files open. Closing its processes allowed packaging to pass. This was a file-lock failure, not an application regression.

## Phase 2: service and settings

- 74 tests passed; renderer build and Windows unpacked package passed.
- The service suite covers independent opt-in collection, overlapping requests, network backoff, provider retry-after, minimize/restore, timeout cleanup, reset-boundary refresh, account changes, disconnect, and disabling during an active read.
- User connected both accounts in the packaged Settings UI. Dashboard cards are the next phase, so this build still displays only the original system metrics.
- UI automation was stopped with Escape during the Settings check. Further interaction checks will use an isolated application test harness and a final packaged smoke test.
