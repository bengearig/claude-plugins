#!/usr/bin/env node
// conscientious / taciturn — UserPromptSubmit hook that intercepts /taciturn
// commands. Parses the slash command in-hook (deterministic, no LLM round-trip,
// no prompt-injection risk) and uses {decision:"block", reason:"..."} to display
// status directly in the terminal without the prompt reaching Claude.
//
// Matched forms:
//   /taciturn              → print current state
//   /taciturn on           → set ON (minimal, terse code comments)
//   /taciturn off          → set OFF (comment generously)
//   /taciturn auto         → explain that taciturn has no AUTO state
//   /taciturn <other>      → show usage
//   /conscientious:taciturn [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally and conscientious-reinforce can add its directives.

const { safeWriteFlag, readFlag } = require('./taciturn-config');

const BEHAVIOR = {
    on:  "I'll keep code comments to a minimum, and terse when they're needed.",
    off: "I'll comment code generously.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?taciturn(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readFlag() || 'on';
            reason = `Taciturn is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'off') {
            const ok = safeWriteFlag(arg);
            reason = ok
                ? `Taciturn is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write taciturn flag — state unchanged.`;
        } else if (arg === 'auto') {
            // Called out explicitly: every sibling toggle takes `auto`, so
            // reaching for it here is a reasonable mistake worth answering.
            reason = 'Taciturn has no AUTO state — OFF already means "comment normally". Usage: /taciturn [on|off]';
        } else {
            reason = 'Usage: /taciturn [on|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
