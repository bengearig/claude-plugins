# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugins are versioned independently and tagged `<plugin>/v<MAJOR>.<MINOR>.<PATCH>`.

## [Unreleased]

## conscientious/v0.1.0 — 2026-05-20

### Added

- `/clarify` command — plan-mode toggle for thorough clarifying questions (on/auto/off, hook-driven).
- `/biblio` command — plan-mode toggle for reading repo docs (on/auto/off).
- `/remind-me` per-project task store with list/dump/add/update/delete via a hardened Node CLI, plus a hybrid inline/external editor flow for prompt edits.
- `/remind-me-propose` toggle for the proactive nudge that offers to save out-of-scope work.
- Combined statusline badge (`Clarify: x | Biblio: y | Reminders: N (Propose: z)`) for both bash and PowerShell.
- SessionStart-installed stable launcher at `~/.claude/conscientious-statusline.sh` (and `.ps1` on Windows) so the user's `settings.json` `statusLine` path survives plugin updates.
- Setup nudge that proposes the `statusLine` snippet on first run and migrates stale per-hash launcher paths to the stable one.

## verbing/v0.1.0 — 2026-05-20

### Added

- SessionStart hook that appends custom spinner verbs (Watsoning, Contractually obligating, Zooting, Manifesting, Smacky Donsing, Innovating, Zooming, Jonesing) from `plugins/verbing/verbs.json` into the user's `settings.spinnerVerbs`.
