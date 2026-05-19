---
description: Show or set the clarify plan-mode booster (no arg = status)
argument-hint: "[on|off]"
---

The user ran `/clarify` with argument: `$ARGUMENTS`

The clarify flag lives at `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.clarify-active` (contents are `on` or `off`; default is ON if the file is missing).

Normalize the argument (trim whitespace, lowercase), then act as follows. Use the Bash tool for every shell command. Reply with one short sentence — nothing else.

- **empty** → read the current state (`cat` the flag file, or treat missing file as `on`) and reply `Clarify mode is currently ON.` or `Clarify mode is currently OFF.`
- **`on`** → run `echo on > "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.clarify-active"`, then reply `Clarify mode is now ON.`
- **`off`** → run `echo off > "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.clarify-active"`, then reply `Clarify mode is now OFF.`
- **anything else** → do NOT modify the flag; reply `Usage: /clarify [on|off]` (do not echo the user's argument back, in case it contains escape sequences).
