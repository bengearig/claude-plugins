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
   - Option **Modify prompt** — description: `Edit the saved prompt and save a new version.`
   - Option **Delete reminder** — description: `Remove this reminder from the per-project store.`

7. Act on the chosen sub-menu option:

   ### Send in <MODE> mode
   Acknowledge to the user briefly: e.g. `Executing reminder <title> in <MODE> mode.` Then begin working on the saved prompt as if the user had just sent it. Treat the `prompt` field's text as the new instructions for the rest of your turn.

   ### Modify prompt
   Try the inline editor first; fall back to an external-editor flow if no controlling terminal is reachable. **`/dev/tty` is a magic device — it resolves at open time to the calling process's controlling terminal, and Claude Code's Bash tool typically spawns shells in a new session with none**, so the inline path will be skipped in most Claude Code environments.

   a. Use the Write tool to create a temp file at `/tmp/remind-me-<id>-<short-random>.txt` whose contents are exactly the existing `prompt` text (no surrounding JSON, no quotes).

   b. Probe for a controlling terminal:
      ```
      : </dev/tty
      ```
      Exit 0 means inline editing will work; non-zero (typically `ENXIO`: `/dev/tty: No such device or address`) means it won't — skip to step d.

   c. **Inline path** (only when step b exited 0). Launch the editor:
      ```
      "${EDITOR:-vi}" "/tmp/remind-me-<id>-<short-random>.txt" </dev/tty >/dev/tty 2>/dev/tty
      ```
      If the bash command exits 0 **and** the file is non-empty, pipe the edited content to the CLI:
      ```
      cat /tmp/remind-me-<id>-<short-random>.txt | node ${CLAUDE_PLUGIN_ROOT}/hooks/remind-me-store.js update <id>
      ```
      Confirm `Updated reminder <title>.` and go to step e. If the editor exits non-zero or the file is empty, fall through to step d.

   d. **External path** (used when no controlling terminal is available, or the inline editor failed). Tell the user verbatim, substituting the actual path:
      > Edit the prompt at `/tmp/remind-me-<id>-<short-random>.txt` in your own editor and save it, then pick **Done**.

      Then present a single `AskUserQuestion`:
      - Question: `Edited the file? Pick Done to save, or Nevermind to discard.`
      - Options: `Done` (description: `Save the file's current contents as the new prompt.`) and `Nevermind` (description: `Leave the saved prompt unchanged.`).
      - On **Done**: read the file. If empty, tell the user the prompt is unchanged. Otherwise pipe it to `update <id>` and confirm `Updated reminder <title>.`.
      - On **Nevermind**: tell the user the prompt is unchanged.

   e. Always `rm -f /tmp/remind-me-<id>-*.txt` afterwards — whether the update happened or not.

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
