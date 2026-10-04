# Claude and Codex usage

Open Settings → AI usage, connect the provider, then enable **Show on dashboard** and Save. Connecting an account takes effect immediately; Cancel only discards the visibility and other settings edits. Both providers default to hidden, and either can be configured independently.

Claude opens an isolated sign-in window. Complete sign-in yourself, then use **Check connection** if needed. Select your Claude workspace when more than one is available. SuperPanel reads your Claude account directly; Claude Code can be closed.

Codex uses an installed Codex executable and opens the managed OpenAI sign-in in your browser. If discovery fails, use **Choose executable** to select `codex.exe`. SuperPanel uses its own Codex home and login; a coding session does not need to be running. A ChatGPT account is required; an API key does not expose subscription limits.

The cards appear to the left of the system metrics in split and metrics-only views. Weekly usage fills the outer arc, session usage fills the inner arc. Each white tick shows how much of that window's time has elapsed, using the reset time and known duration. It is an even-use budgeting reference, not a forecast. The percentages show allowance consumed, not token counts.

Press and hold a card for 800ms to open details, or focus it and press Enter/Space. Details show every reported window as a bar, including any additional model-specific limits, exact resets, source, and usage compared with pace. Refresh is available there and in Settings.

Usage refreshes every three minutes while the app is visible. Collection pauses while minimized or when a provider is disabled. Countdown ticks use a local clock. Six-minute-old readings are marked stale and lose their pace markers. At a reset, the old percentage is withheld until a new reading arrives; it never resets to zero by guesswork.

If a card is missing, check that the account is connected and **Show on dashboard** was saved. Buttons-only view hides the metrics region. Temporary network failures retain the last reading; rate limits back off automatically. Expired credentials require Reconnect in Settings. Claude browser challenges may need you to complete sign-in again; its web usage interface is not a guaranteed public API.

Disabling a card preserves its connection. Disconnect removes only SuperPanel's connection, cached reading, and provider authentication. It does not sign out your other Claude or Codex applications. Claude credentials are encrypted using Windows DPAPI; Codex credentials use the OS keyring. Ordinary settings JSON and renderer IPC contain account labels and normalized usage, never credentials.
