# claude-plugins

Benjamin Gearig's [Claude Code](https://claude.com/claude-code) plugin marketplace. Ships two plugins:

- **verbing** — extra verbs for the Claude Code spinner
- **conscientious** — working-style nudges (`/clarify`, `/biblio`, `/taciturn`, `/fastidious`, `/synoptic`, `/remind-me`) plus a combined statusline badge

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

Slash commands plus a statusline badge that surface plan-mode hygiene, comment discipline, thoroughness, commit-message altitude, and per-project reminders — plus always-on directives that take no configuration at all.

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

Most toggles have three states: **on** (apply the directive), **auto** (no directive — let Claude behave normally), **off** (apply the opposite directive). Modes are saved per-project; current state is visible in the statusline. `/taciturn`, `/fastidious`, and `/synoptic` each depart from that scheme, as described below.

`/taciturn` and `/fastidious` are **on**/**off** only. They drop the middle state for opposite reasons. `/taciturn` defaults to **on**, and its **off** injects the *opposite* directive (comment generously) — "inject no directive" and "comment normally" are the same behavior, so **off** already covers what **auto** would have. `/fastidious` defaults to **off**, and its **off** injects *nothing* — it is the neutral state the other toggles spell **auto**, so there is no opposing "be sloppy" directive to add.

`/synoptic` keeps all three states but swaps the roles of the last two. Its **off** is the silent one that injects nothing (there is no useful "commit verbosely" directive to hang off it), and its **auto** is an *active, softer* mode: still one-line commit subjects with no body, but a repository's own documented commit convention wins where the two conflict. Under **on**, `/synoptic` overrides that convention. Both active modes ban the trailing `Co-Authored-By`-style attribution line outright — the summary line is the whole message, whatever the repo or the surrounding tooling asks for. So in the statusline, a grey `AUTO` here reads as "synoptic, repo permitting" rather than "neutral default."

`/clarify` and `/biblio` only take effect in plan mode. `/taciturn`, `/fastidious`, `/synoptic`, and `/remind-me-propose` apply on every turn — comment style, rigor, commit messages, and out-of-scope work all matter while Claude is executing, not just while it plans.

### Directives

Some nudges are worth applying unconditionally, so they ship as **directives** rather than commands. A directive has no toggle, no flag file, and no statusline segment — it is injected on every turn alongside whatever the commands above are set to.

| Directive | Effect |
| --- | --- |
| Drift-resistant prose | Claude avoids wording comments and documentation around details the next edit invalidates — counts, enumerations, line numbers, ordinals, `currently N`. "The five Authentication routes are built" becomes "The Authentication routes are built"; "the five places anything is registered" becomes "wherever anything is registered". Exact figures survive only where the figure is the point. |

Directives govern *wording*, not volume — `/taciturn` still decides how much you get. Prose that deliberately records a fixed moment, such as a changelog entry, is exempt.

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

## License

MIT — see [LICENSE](./LICENSE).
