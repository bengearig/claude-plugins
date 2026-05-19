#!/usr/bin/env node
// conscientious — plugin-scoped UserPromptSubmit hook.
//
// Aggregates per-turn reinforcement directives from every feature module in
// FEATURES. Each module exports getReinforcement(input) returning a string
// (the directive) or null (skip). Emitted as a single additionalContext block
// when any feature returns non-null.
//
// To plug a new feature in: create <feature>-reinforce.js exporting
// getReinforcement(input), then add it to FEATURES below.

const FEATURES = [
    require('./clarify-reinforce'),
    require('./biblio-reinforce'),
];

let raw = '';
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    try {
        const input = JSON.parse(raw || '{}');
        const messages = FEATURES
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
