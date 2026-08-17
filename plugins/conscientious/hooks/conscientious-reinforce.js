#!/usr/bin/env node
// conscientious — plugin-scoped UserPromptSubmit hook.
//
// Aggregates per-turn reinforcement directives from every module in FEATURES
// and DIRECTIVES. Each module exports getReinforcement(input) returning a
// string (the directive) or null (skip). Emitted as a single additionalContext
// block when any module returns non-null.
//
// FEATURES are toggleable: each is backed by a flag file, a slash command, and
// a statusline segment, and each has states in which it injects nothing.
// DIRECTIVES are not — they carry no user-facing surface and apply on every
// turn. Directives are appended after features so a configured mode reads first.
//
// To plug a new feature in: create <feature>-reinforce.js exporting
// getReinforcement(input), then add it to FEATURES below. For an always-on
// directive: create <name>-directive.js with the same export and add it to
// DIRECTIVES.

const FEATURES = [
    require('./clarify-reinforce'),
    require('./biblio-reinforce'),
    require('./taciturn-reinforce'),
    require('./fastidious-reinforce'),
    require('./synoptic-reinforce'),
    require('./remind-me-propose-reinforce'),
];

const DIRECTIVES = [
    require('./drift-resistant-directive'),
    require('./sycophancy-resistant-directive'),
];

let raw = '';
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    try {
        const input = JSON.parse(raw || '{}');
        const messages = FEATURES.concat(DIRECTIVES)
            .map(f => {
                try { return f.getReinforcement(input); }
                catch { return null; }
            })
            .filter(m => typeof m === 'string' && m.length > 0);

        if (messages.length === 0) return;

        process.stdout.write(JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'UserPromptSubmit',
                additionalContext: messages.join('\n\n'),
            },
        }));
    } catch {
        // Never disrupt the session
    }
});
