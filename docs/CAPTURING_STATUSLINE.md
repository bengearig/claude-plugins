# Capturing the conscientious statusline

The `### Statusline` section of [`../README.md`](../README.md) embeds `docs/demo.gif` — an animated demo showing the badge updating live as toggles change.

The GIF is not generated automatically. This doc is the recipe for re-capturing it — re-run it whenever the badge format, colors, or default states change.

## Prerequisites

- A terminal that supports 256-color ANSI (the statusline uses `\033[38;5;Nm` escapes — see [`../plugins/conscientious/hooks/conscientious-statusline.sh`](../plugins/conscientious/hooks/conscientious-statusline.sh) lines 24–28).
- The conscientious plugin enabled locally so `~/.claude/conscientious-statusline.sh` exists. If it doesn't, start a new Claude Code session — the plugin's SessionStart hook installs it.
- For the GIF: `asciinema` (`pip install asciinema`, `brew install asciinema`, …) plus a `.cast` → `.gif` converter such as [`agg`](https://github.com/asciinema/agg) (`brew install agg` / `cargo install --git https://github.com/asciinema/agg`).

## Animated demo (`docs/demo.gif`)

Record a short clip of the badge updating as toggles change, then convert it to a GIF so it renders inline on GitHub (which doesn't auto-play asciinema embeds).

Sequence to perform during recording:

1. Show the starting statusline (whatever the current state is).
2. Run `/clarify off` and re-render the badge.
3. Run `/biblio on` and re-render the badge.
4. Run `/remind-me example task` and re-render the badge — the count should increment by one.

Commands:

```
asciinema rec /tmp/statusline.cast    # Ctrl-D to stop
agg /tmp/statusline.cast docs/demo.gif
rm /tmp/statusline.cast               # don't commit the raw cast
```

Tune `agg` flags (`--font-size`, `--theme`, `--speed`) if the default render looks off. Target a final GIF under ~1MB so the README stays cheap to clone.

## After capturing

- `git add docs/demo.gif` and the README edit.
- Open `README.md` in a Markdown previewer (or push to a branch and view on GitHub) to confirm the GIF renders inline.
