#!/usr/bin/env node
// conscientious / fastidious — UserPromptSubmit hook that intercepts /fastidious
// commands. Parses the slash command in-hook (deterministic, no LLM round-trip,
// no prompt-injection risk) and uses {decision:"block", reason:"..."} to display
// status directly in the terminal without the prompt reaching Claude.
//
// Matched forms:
//   /fastidious              → print current state
//   /fastidious on           → set ON (exhaustive planning, implementation, verification)
//   /fastidious off          → set OFF (no directive)
//   /fastidious auto         → explain that fastidious has no AUTO state
//   /fastidious <other>      → show usage
//   /conscientious:fastidious [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally and conscientious-reinforce can add its directives.

const { safeWriteFlag, readFlag } = require('./fastidious-config');

const BEHAVIOR = {
    on:  "I'll be exhaustively thorough and meticulous while planning, implementing, and verifying.",
    off: "I'll behave normally.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?fastidious(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readFlag() || 'off';
            reason = `Fastidious is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'off') {
            const ok = safeWriteFlag(arg);
            reason = ok
                ? `Fastidious is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write fastidious flag — state unchanged.`;
        } else if (arg === 'auto') {
            // Called out explicitly: the sibling toggles take `auto`, so
            // reaching for it here is a reasonable mistake worth answering.
            reason = 'Fastidious has no AUTO state — OFF already injects no directive. Usage: /fastidious [on|off]';
        } else {
            reason = 'Usage: /fastidious [on|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
