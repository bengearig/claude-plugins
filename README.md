# claude-plugins

Benjamin Gearig's [Claude Code](https://claude.com/claude-code) plugin marketplace. Ships two plugins:

- **verbing** — extra verbs for the Claude Code spinner
- **conscientious** — working-style nudges (`/clarify`, `/biblio`, `/taciturn`, `/fastidious`, `/synoptic`, `/remind-me`, `/standup`) plus a combined statusline badge

## Install

```
/plugin marketplace add bengearig/claude-plugins
```

Then enable plugins via `/plugin`, or by adding to your `~/.claude/settings.json`:

```json
"enabledPlugins": {
  "verbing@benjamin-gearig-marketplace": true,
  "conscientious@benjamin-gearig-marketplace": true
}
```

## verbing

Appends custom spinner verbs (Watsoning, Zooting, Manifesting, …) via a SessionStart hook. To customize, edit [`plugins/verbing/verbs.json`](./plugins/verbing/verbs.json) and add or remove entries — changes apply on next session start.

## conscientious

Slash commands plus a statusline badge that surface plan-mode hygiene, comment discipline, thoroughness, commit-message altitude, per-project reminders, and standup summaries — plus always-on directives that take no configuration at all.

### Commands

| Command | Args | Default | Effect |
| --- | --- | --- | --- |
| `/clarify` | `on \| auto \| off` | `on` | Whether Claude asks thorough clarifying questions in plan mode |
| `/biblio` | `on \| auto \| off` | `auto` | Whether Claude reads repo docs (READMEs, `*.md`, docstrings) while planning |
| `/taciturn` | `on \| off` | `on` | Whether Claude keeps code comments minimal — only for real ambiguity or non-obvious context, and terse when needed |
| `/fastidious` | `on \| off` | `off` | Whether Claude plans, implements, and verifies exhaustively — thorough within the requested scope, not beyond it |
| `/synoptic` | `on \| auto \| off` | `off` | Whether Claude writes commit messages as one-line birds-eye summaries in as few words as possible, with no body and no attribution trailer |
| `/remind-me` | `[task description]` | — | No arg → list+menu of saved tasks; with arg → save a new task |
| `/remind-me-propose` | `on \| auto \| off` | `on` | Whether Claude offers `/remind-me <…>` when it spots out-of-scope work |
| `/standup` | `[TODAY \| PREVIOUS \| YYYY-MM-DD] [max]` | — | Summarizes your commits for one day as standup bullets, capped at `max` (default 5) |

Most toggles have three states: **on** (apply the directive), **auto** (no directive — let Claude behave normally), **off** (apply the opposite directive). Modes are saved per-project; current state is visible in the statusline. `/taciturn`, `/fastidious`, and `/synoptic` each depart from that scheme, as described below.

`/taciturn` and `/fastidious` are **on**/**off** only. They drop the middle state for opposite reasons. `/taciturn` defaults to **on**, and its **off** injects the *opposite* directive (comment generously) — "inject no directive" and "comment normally" are the same behavior, so **off** already covers what **auto** would have. `/fastidious` defaults to **off**, and its **off** injects *nothing* — it is the neutral state the other toggles spell **auto**, so there is no opposing "be sloppy" directive to add.

`/synoptic` keeps all three states but swaps the roles of the last two. Its **off** is the silent one that injects nothing (there is no useful "commit verbosely" directive to hang off it), and its **auto** is an *active, softer* mode: still one-line commit subjects with no body, but a repository's own documented commit convention wins where the two conflict. Under **on**, `/synoptic` overrides that convention. Both active modes ban the trailing `Co-Authored-By`-style attribution line outright — the summary line is the whole message, whatever the repo or the surrounding tooling asks for. So in the statusline, a grey `AUTO` here reads as "synoptic, repo permitting" rather than "neutral default."

`/clarify` and `/biblio` only take effect in plan mode. `/taciturn`, `/fastidious`, `/synoptic`, and `/remind-me-propose` apply on every turn — comment style, rigor, commit messages, and out-of-scope work all matter while Claude is executing, not just while it plans.

### Directives

Some nudges are worth applying unconditionally, so they ship as **directives** rather than commands. A directive has no toggle, no flag file, and no statusline segment — it is injected on every turn alongside whatever the commands above are set to.

| Directive | Effect |
| --- | --- |
| Drift-resistant prose | Claude avoids wording comments and documentation around details the next edit invalidates — counts, enumerations, line numbers, ordinals, `currently N`. "The five Authentication routes are built" becomes "The Authentication routes are built"; "the five places anything is registered" becomes "wherever anything is registered". Exact figures survive only where the figure is the point. |
| Sycophancy-resistant tone | Claude does not open by praising the question, idea, or plan, reserves exclamation points for what genuinely warrants one, and does not close with unsolicited encouragement. Judgments the user asked for are unaffected — sound is called sound, unsound unsound. |

Directives stay in their lane: they govern how prose is worded and how a reply is pitched, never how much work you get or how fully it is reported — `/taciturn`, `/fastidious`, and `/synoptic` still decide that. Prose that deliberately records a fixed moment, such as a changelog entry, is exempt from the drift-resistance rule.

To add one, create `plugins/conscientious/hooks/<name>-directive.js` exporting `getReinforcement(input)` and list it in `DIRECTIVES` in `conscientious-reinforce.js`.

### Statusline

A SessionStart hook installs a stable launcher at `~/.claude/conscientious-statusline.sh` (and `.ps1` on Windows) that resolves the current plugin install at exec time. This means the path in your `settings.json` never goes stale when the plugin updates. On first run the hook proposes this snippet:

```json
"statusLine": {
  "type": "command",
  "command": "bash \"~/.claude/conscientious-statusline.sh\"",
  "refreshInterval": 1
}
```

The rendered badge looks like:

```
Clarify: ON | Biblio: AUTO | Taciturn: ON | Fastidious: OFF | Synoptic: OFF | Reminders: 3 (Propose: ON)
```

Colors: green = `on`, grey = `auto`, red = `off`, blue = reminder count.

![conscientious statusline updating live as /clarify, /biblio, and /remind-me are run](docs/demo.gif)

### Reminders

Reminders are stored per-project at `~/.claude/.remind-me/<projectId>.json` (mode `0600`, atomic writes, symlinks refused). Each entry has a title, the original task description, and a generated pickup prompt suitable for a fresh Claude session. `/remind-me` with no arg shows a menu to **send**, **modify**, or **delete** any reminder.

### Standup

`/standup` reads one day out of the current repository's history and turns it into bullets you can read aloud to your team. Both arguments are optional and order-independent:

| Argument | Meaning |
| --- | --- |
| `TODAY` | Today, in the machine's local timezone. The default |
| `PREVIOUS` | The most recent *earlier* day that actually has commits by you — not simply the previous weekday, so a day off is skipped rather than reported as empty |
| `YYYY-MM-DD` | That exact date. Must be a real calendar date, and not in the future |
| A number | How many bullets at most. Defaults to 5 |

So `/standup` covers today in five bullets, `/standup PREVIOUS 3` covers your last working day in three, and `/standup 2026-08-16` covers that date.

Commits are matched on your `git config user.email`, compared exactly, and searched across branches, tags, and remote-tracking refs rather than just the checked-out branch — so work on a branch you have since left still counts. Stash and notes refs are deliberately excluded, since both generate commits in your name that are not work.

Days are grouped by *author* date, so rebasing or amending later does not move work onto the wrong day, and that timestamp is read in your machine's local timezone — evening work committed inside a UTC container stays on the evening you did it. Merge commits are not summarized, though a day consisting only of merges says so instead of reporting nothing. A day with no commits of yours is reported as such rather than quietly replaced by a different one. When the resolved day is today, anything still uncommitted in the working tree is noted after the bullets.

The summary is written at outcome level — what changed and why it mattered — and deliberately omits commit hashes, filenames, and branch names.

## License

MIT — see [LICENSE](./LICENSE).
