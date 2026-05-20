# Contributing

Thanks for considering a contribution. This repo is a Claude Code plugin marketplace; the two plugins (`verbing`, `conscientious`) live under `plugins/`.

## Local setup

Clone the repo, then point Claude Code at your local checkout instead of GitHub:

```
/plugin marketplace add /absolute/path/to/claude-plugins
```

Edit files under `plugins/<name>/`, run `/reload-plugins` to pick up the changes (or `/plugin marketplace update <name>` from the marketplace pane).

## Plugin layout

Each plugin has a manifest at `plugins/<name>/.claude-plugin/plugin.json` declaring hooks, commands, and metadata. The marketplace itself is declared at `.claude-plugin/marketplace.json` at the repo root.

## Testing hooks

Hook scripts under `plugins/<name>/hooks/` are Node CLIs invoked by Claude Code with JSON on stdin (per the [Claude Code hooks spec][hooks]). To test one in isolation, run it directly:

```
echo '{}' | node plugins/conscientious/hooks/<hook>.js
```

`plugins/conscientious/hooks/remind-me-store.js` is a self-contained example with multiple subcommands (`list`, `dump`, `add`, …) — run it with no arguments to print usage.

[hooks]: https://docs.claude.com/en/docs/claude-code/hooks

## Commit style

Imperative mood, capitalized first word, no trailing period in the subject line. Examples drawn from this repo:

```
Add CHANGELOG.md and adopt release tagging
Improve statusline nudge: add cross-platform launcher, migration checks
Make /remind-me Modify-prompt flow probe for a TTY before launching the editor
```

The subject line should fit in ~72 characters. Use the body for context, the "why," and any tradeoffs.

## Pull requests

Fork, branch, push, open a PR against `main`. The PR template will prompt for a summary and a test plan. Keep PRs focused — one logical change per PR.

## Releases

Plugins are versioned independently. Each plugin has a `version` field in its `plugins/<name>/.claude-plugin/plugin.json`, and releases are tagged `<plugin>/v<MAJOR>.<MINOR>.<PATCH>` (e.g. `conscientious/v0.2.0`).

To cut a release:

1. Bump `version` in the plugin's manifest.
2. Move the relevant `## [Unreleased]` notes into a new dated section in `CHANGELOG.md` keyed `<plugin>/v<NEW> — <YYYY-MM-DD>`.
3. Commit (`Release <plugin> 0.x.y`), then create an annotated tag:

   ```
   git tag -a <plugin>/v<NEW> -m "<plugin> <NEW>"
   git push --tags
   ```

This repo does not publish GitHub Releases — tags are the source of truth.

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
