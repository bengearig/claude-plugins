---
description: Save or recall task reminders scoped to this project
argument-hint: "[task description]"
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

You are running the `/remind-me` command. Reminders are stored per-project under `~/.claude/.remind-me/`. All storage I/O goes through the CLI at `${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js` — never read or write the JSON store files directly.

The user's arguments are: `$ARGUMENTS`

## Step 1 — Resolve the current project

Run once:
```
node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js project-id
```
The first line is the project id (use it as `PID` below); the second line is the resolved root path. If this fails, surface the error and stop.

## Step 2 — Branch on `$ARGUMENTS`

- If `$ARGUMENTS` is empty (or whitespace-only) → go to **List mode** (Step 3).
- Otherwise → treat `$ARGUMENTS` as the raw task description and go to **Create mode** (Step 4).

## Step 3 — List mode

1. Fetch the list:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js list
   ```
   Each non-empty line is `<id>\t<title>\t<created_at>`.

2. If the list is empty, tell the user verbatim: `No reminders saved for this project. Add one with /remind-me <task description>.` and stop.

3. Print the full list to the user as a numbered set of `<title>` (with id and date) so they can see everything even when there are too many to fit in a menu. Then present a single `AskUserQuestion` to select one. Behaviour by count:
   - **1–3 reminders**: one option per reminder. Label each option with the title (truncate at ~60 chars). Set the `description` field of each option to `id=<id> · <created_at>`.
   - **4 or more reminders**: show the 3 most-recent reminders as options. The user can still type any id via the built-in `Other` field. Mention this explicitly in the question text (e.g. "Pick from the most recent reminders, or choose Other and paste any id from the printed list.").

   Read back the chosen id (either by matching the picked option back to its reminder or by parsing the user's `Other` text). If the id doesn't match any reminder, tell the user and stop.

4. Look up the current permission mode for the sub-menu label:
   - Scan this turn's `additionalContext` for a line `CURRENT_PERMISSION_MODE: <mode>` injected by the `remind-me-mode-context` hook.
   - If absent, use `default`.
   Use the value as `<MODE>` below.

5. Dump the chosen reminder:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js dump <id>
   ```
   Print the `title`, `description`, and `prompt` fields to the user in three clearly labelled sections.

6. Present the sub-menu via `AskUserQuestion` (one question, three options):
   - Option **Send in <MODE> mode** — description: `Execute the saved prompt now, in whichever mode is active (Claude cannot switch modes).`
   - Option **Modify prompt** — description: `Open the prompt in $EDITOR and save the edited version back.`
   - Option **Delete reminder** — description: `Remove this reminder from the per-project store.`

7. Act on the chosen sub-menu option:

   ### Send in <MODE> mode
   Acknowledge to the user briefly: e.g. `Executing reminder <title> in <MODE> mode.` Then begin working on the saved prompt as if the user had just sent it. Treat the `prompt` field's text as the new instructions for the rest of your turn.

   ### Modify prompt
   Implement the editor flow:
   a. Use the Write tool to create a temp file at `/tmp/remind-me-<id>-<short-random>.txt` whose contents are exactly the existing `prompt` text (no surrounding JSON, no quotes).
   b. Launch the user's editor with explicit TTY redirection:
      ```
      "${EDITOR:-vi}" "/tmp/remind-me-<id>-<short-random>.txt" </dev/tty >/dev/tty 2>/dev/tty
      ```
   c. If the bash command exits 0 and the file is non-empty, pipe the edited content to the CLI:
      ```
      cat /tmp/remind-me-<id>-<short-random>.txt | node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js update <id>
      ```
      Then `rm -f /tmp/remind-me-<id>-<short-random>.txt` and confirm `Updated reminder <title>.`
   d. If the editor exits non-zero, the file becomes empty, or the bash invocation fails for any reason (e.g. no TTY available), **fall back** to a single `AskUserQuestion` asking the user to paste the replacement prompt:
      - Question: `Editor unavailable. Paste the replacement prompt as Other, or keep the current text.`
      - Options: `Keep current text` and `Replace via Other field`.
      - If they choose `Other` with non-empty text, pipe that text on stdin to `update <id>` and confirm. If they choose `Keep current` or supply empty text, do nothing and tell them the prompt is unchanged.
      - Always `rm -f /tmp/remind-me-<id>-*.txt` afterwards.

   ### Delete reminder
   Run:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js delete <id>
   ```
   Confirm `Deleted reminder <title>.`

## Step 4 — Create mode

The user has provided a task description in `$ARGUMENTS`. Synthesise the saved reminder from that description plus this turn's surrounding context.

1. Generate a **title**:
   - Imperative, action-oriented, ≤60 characters.
   - No surrounding quotes, no trailing punctuation.
   - Example: `Refactor auth middleware to drop legacy session tokens`.

2. Generate a **pickup prompt**:
   - Self-contained: a fresh Claude session with no prior conversation memory must be able to act on it.
   - Include relevant facts from the current conversation: file paths discussed, decisions already made, constraints the user mentioned, what's been ruled out, the next concrete step.
   - Do **not** include speculation about what the user wants beyond what's been said.
   - Single paragraph or a short ordered list — keep it focused.

3. Persist the reminder. Use the Write tool to create `/tmp/remind-me-add-<short-random>.json` containing a single JSON object:
   ```json
   {
     "title": "<generated title>",
     "description": "<verbatim $ARGUMENTS>",
     "prompt": "<generated pickup prompt>"
   }
   ```
   Then pipe it in:
   ```
   cat /tmp/remind-me-add-<short-random>.json | node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js add
   ```
   The CLI prints the generated reminder id to stdout. Capture it.

4. Clean up: `rm -f /tmp/remind-me-add-<short-random>.json`.

5. Confirm to the user with the new id and the generated title, e.g.:
   `Saved reminder <id>: <title>`

## General notes

- Never read or write the JSON store files directly — always go through the CLI so writes stay atomic and permissions stay tight.
- Tempfiles must live under `/tmp/` (or `$TMPDIR` if set) and be removed in every code path, success or failure.
- The CLI returns non-zero exit codes for usage (2), not-found (3), or write failure (1). Surface the stderr message to the user verbatim when something fails.
