# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugins are versioned independently and tagged `<plugin>/v<MAJOR>.<MINOR>.<PATCH>`.

## [Unreleased]

## conscientious/v1.4.1 — 2026-08-13

### Changed

- `/synoptic` — both active modes now forbid the trailing attribution line (`Co-Authored-By` and friends) instead of exempting it as a required trailer. The single summary line is the entire commit message, overriding a system instruction, tool default, or repo convention that asks for the trailer. Under **auto** the repository still wins on body and format; the attribution ban does not yield.

## conscientious/v1.4.0 — 2026-08-13

### Added

- **Directives** — always-on reinforcements with no toggle, no flag file, and no statusline segment. `conscientious-reinforce.js` now aggregates a `DIRECTIVES` list alongside `FEATURES`, appending directive blocks after the configured ones. New directives are added by dropping a `<name>-directive.js` next to the `*-reinforce.js` modules and listing it.
- First directive, *drift-resistant prose* (`drift-resistant-directive.js`) — Claude avoids wording comments and documentation around details the next edit invalidates: counts, enumerations, line numbers, ordinal positions, and `currently N` phrasing. "The five Authentication routes are built" becomes "The Authentication routes are built"; "the five places anything is registered" becomes "wherever anything is registered".
- README `### Directives` section documenting the distinction and how to add one.

### Notes

- The directive scopes itself to how prose is worded rather than how much of it there is, so it does not contend with `/taciturn` in the same `additionalContext` block, and it exempts prose that deliberately records a fixed moment — changelog entries like this one.
- A directive module that throws is dropped in isolation by the aggregator's existing per-module `try`/`catch`; the remaining blocks still emit.

## conscientious/v1.3.0 — 2026-08-13

### Added

- `/synoptic` command — `on|auto|off` toggle for commit-message altitude, defaulting to **off**. **on** asks Claude to write each commit message as a single-line, fewest-words summary carrying the birds-eye macro overview of the work, with no body (required trailers excepted). **auto** applies the same directive but yields to a repository's own documented commit convention. Not gated on plan mode, since commit messages are written while executing.
- `Synoptic: <STATE>` segment in the combined statusline badge (bash and PowerShell), between `Fastidious` and `Reminders`.

### Notes

- `/synoptic` keeps the three-state shape of `/clarify` and `/biblio` but swaps the roles of `auto` and `off`. Its **off** injects *nothing* — the neutral state the older toggles spell `auto` — because there is no useful opposing "commit verbosely" directive. Its **auto** is therefore an active, softer mode rather than a default, and a grey `AUTO` in the statusline reads as "synoptic, repo permitting."
- The directive explicitly scopes itself to the commit message, disclaiming any effect on how thoroughly the work is done or reported in conversation, so it does not contend with `/fastidious` in the same `additionalContext` block.
- Under **on** the directive overrides a repository's documented commit convention, including this repo's own `CONTRIBUTING.md` guidance to use the commit body for context. Use **auto** to keep the repo's convention authoritative.

### Fixed

- `docs/CAPTURING_STATUSLINE.md` cross-reference to the ANSI escape definitions in `conscientious-statusline.sh`, which had gone stale by two lines in v1.2.0 and shifts again here.

## conscientious/v1.2.0 — 2026-08-12

### Added

- `/fastidious` command — `on|off` toggle for thoroughness, defaulting to **off**. **on** asks Claude to research exhaustively while planning, implement meticulously (error paths, edge cases, surrounding conventions, no placeholders), and verify before reporting anything done. The directive is bounded to the requested scope, and is not gated on plan mode since rigor applies while editing.
- `Fastidious: <STATE>` segment in the combined statusline badge (bash and PowerShell), between `Taciturn` and `Reminders`.

### Notes

- Like `/taciturn`, `/fastidious` has no `auto` state — but for the opposite reason. Its **off** injects *nothing* rather than an opposing directive, so **off** already is the neutral state the three-state toggles spell `auto`. `/fastidious auto` answers with a short explanation instead of an error, and an `auto` hand-written into the flag file renders as `off`.
- The `on` directive explicitly disclaims code comments so it does not contend with `/taciturn`, which is injected into the same `additionalContext` block.

## verbing/v1.4.0 — 2026-08-12

### Added

- New spinner verb in `plugins/verbing/verbs.json`: Jakob Mac-ing.

### Changed

- `plugins/verbing/verbs.json` is now pretty-printed one verb per line, so future additions show up as a one-line diff.

## conscientious/v1.1.0 — 2026-08-10

### Added

- `/taciturn` command — `on|off` toggle for comment discipline, defaulting to **on**. **on** tells Claude to comment only where there is genuine ambiguity or non-obvious context, and to keep any necessary comment terse; **off** asks for generous commenting. Unlike `/clarify` and `/biblio` the directive is not gated on plan mode, since comment style applies while editing.
- `Taciturn: <STATE>` segment in the combined statusline badge (bash and PowerShell), between `Biblio` and `Reminders`.

### Notes

- `/taciturn` deliberately has no `auto` state, unlike the other three toggles: injecting no directive is indistinguishable from `off`, so the middle state carried no behavior. `/taciturn auto` answers with a short explanation instead of an error, and a flag file left reading `auto` by a pre-release build is normalised to `on`.

## verbing/v1.3.0 — 2026-05-29

### Added

- New spinner verb in `plugins/verbing/verbs.json`: Big McDumbo-ing.

## verbing/v1.2.0 — 2026-05-22

### Added

- Four new spinner verbs in `plugins/verbing/verbs.json`: Jigglebillying, Munching, Let there be lighting, Kindling.

## verbing/v1.1.0 — 2026-05-21

### Added

- Four new spinner verbs in `plugins/verbing/verbs.json`: Crab swirling, Ideating, Foosballing, Spline reticulating.

## conscientious/v1.0.0 — 2026-05-20

### Added

- `docs/demo.gif` — animated demo of the statusline badge updating as `/clarify`, `/biblio`, and `/remind-me` are run; embedded in the README `### Statusline` section.
- `docs/CAPTURING_STATUSLINE.md` — maintainer recipe for re-capturing the demo GIF (`asciinema rec` → `agg`).

### Changed

- README `### Statusline` example now matches the live UPPERCASE rendering (`Clarify: ON | Biblio: AUTO | Reminders: 3 (Propose: ON)`).
- Marks the plugin's surface (`/clarify`, `/biblio`, `/remind-me`, `/remind-me-propose`, statusline badge) as stable.

## verbing/v1.0.0 — 2026-05-20

### Changed

- Marks the plugin as stable; no behavior changes since v0.1.0.

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
