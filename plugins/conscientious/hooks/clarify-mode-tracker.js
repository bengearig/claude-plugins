#!/usr/bin/env node
// conscientious / clarify — UserPromptSubmit hook that intercepts /clarify
// commands. Parses the slash command in-hook (deterministic, no LLM round-trip,
// no prompt-injection risk) and uses {decision:"block", reason:"..."} to display
// status directly in the terminal without the prompt reaching Claude.
//
// Matched forms:
//   /clarify              → print current state
//   /clarify on           → set ON (thorough clarifying questions)
//   /clarify auto         → set AUTO (no directive — Claude behaves normally)
//   /clarify off          → set OFF (explicitly suppress clarifying questions)
//   /clarify <other>      → show usage
//   /conscientious:clarify [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally and conscientious-reinforce can add its directives.

const { safeWriteFlag, readFlag } = require('./clarify-config');

const BEHAVIOR = {
    on:   "I'll be very thorough with clarifying questions.",
    auto: "I'll behave normally.",
    off:  "I will not ask clarifying questions.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?clarify(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readFlag() || 'on';
            reason = `Clarify is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'auto' || arg === 'off') {
            const ok = safeWriteFlag(arg);
            reason = ok
                ? `Clarify is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write clarify flag — state unchanged.`;
        } else {
            reason = 'Usage: /clarify [on|auto|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
