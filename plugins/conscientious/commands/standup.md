---
description: Summarize a day's commits as standup bullets (no arg = today, 5 bullets)
argument-hint: "[TODAY|PREVIOUS|YYYY-MM-DD] [max-bullets]"
allowed-tools: Bash
---

You are running the `/standup` command. It turns one day of this repository's commit history into bullets the user can read aloud in a team standup. All date resolution and commit selection happen in the CLI at `${CLAUDE_PLUGIN_ROOT}/hooks/standup-range.js` — do not run `git log` yourself, and do not second-guess which day it picked. The CLI already excludes stash and notes refs, ignores `.mailmap` rewriting, and buckets commits by your machine's local day, so its answer is the authoritative one.

The user's arguments are: `$ARGUMENTS`

## Step 1 — Guard the argument string

If `$ARGUMENTS` contains anything other than letters, digits, hyphens, and single spaces — a quote, backslash, backtick, dollar sign, semicolon, or a line break — do not run anything. Tell the user verbatim: `usage: /standup [TODAY|PREVIOUS|YYYY-MM-DD] [1-20]` and stop. Every accepted argument is drawn from that small set, so this rejects only input that could not have parsed anyway. The CLI validates every token again on its own, so this step is the outer of two gates rather than the only one.

## Step 2 — Resolve the day and collect commits

Run once, passing the arguments as a single double-quoted argument:
```
node "${CLAUDE_PLUGIN_ROOT}/hooks/standup-range.js" "$ARGUMENTS"
```

On a non-zero exit, show the user the stderr line verbatim and stop. The CLI exits 2 for a bad argument or a missing `user.email`, and 3 outside a git repository.

On success it prints one JSON object:

| Field | Meaning |
| --- | --- |
| `requested` | What the user asked for — `TODAY`, `PREVIOUS`, or a date |
| `date` | The day actually resolved, or `null` if none was found |
| `weekday` | Day name for `date` |
| `maxBullets` | The cap you must not exceed |
| `commitCount` / `commits` | That day's commits, oldest first, each with `subject` and `body` |
| `uncommitted` | Working-tree changes, present only when `date` is today |
| `notes` | Anything the CLI wants surfaced, such as an exhausted lookback |

## Step 3 — Handle a day with no commits

If `commitCount` is 0, say so plainly and stop — for example `No commits by you on Sunday 2026-08-16.`, or when `date` is `null`, report whatever `notes` says. Never substitute a nearby day that does have commits: the user is going to read this to their team alongside the date.

## Step 4 — Write the bullets

Summarize the day's work as **at most `maxBullets`** bullets, in the order the work happened.

- Write at outcome level: what changed and why it mattered. A teammate who does not know this codebase should understand each bullet.
- No commit hashes, no filenames, no branch names, no version numbers unless the release itself is the point.
- Collapse related commits into one bullet. Several commits refining one change are one line of standup, not three.
- When the day has more distinct work than the cap allows, merge the smallest items into a single closing bullet rather than dropping them silently or running past the cap.
- Do not pad. If the day genuinely holds one thing, write one bullet.

Read the `body` of each commit as well as its `subject` — the reasoning behind a change is usually what makes the bullet worth hearing.

## Step 5 — Note work in progress

When `uncommitted` is present, add one final line after the bullets, outside the cap, saying how many files are still uncommitted and roughly what area they touch. Mark it clearly as in progress rather than done.

## General notes

- Surface any entry in `notes` to the user; they explain why a result looks thinner than expected.
- `PREVIOUS` means the most recent day *with commits*, not simply the previous weekday. Report the date and weekday the CLI resolved so the user can see which day they are describing.
