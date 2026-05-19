#!/usr/bin/env node
// conscientious / remind-me-propose — UserPromptSubmit hook that intercepts
// /remind-me-propose commands. Parses the slash command in-hook (deterministic,
// no LLM round-trip, no prompt-injection risk) and uses
// {decision:"block", reason:"..."} to display status directly in the terminal
// without the prompt reaching Claude.
//
// Matched forms:
//   /remind-me-propose              → print current state
//   /remind-me-propose on           → enable proactive suggestions
//   /remind-me-propose auto         → no directive (Claude behaves normally)
//   /remind-me-propose off          → explicitly suppress proactive suggestions
//   /remind-me-propose <other>      → show usage
//   /conscientious:remind-me-propose [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally.

const { safeWriteProposeFlag, readProposeFlag } = require('./remind-me-config');

const BEHAVIOR = {
    on:   "I'll proactively suggest /remind-me reminders for out-of-scope work.",
    auto: "I'll behave normally.",
    off:  "I won't proactively suggest /remind-me reminders.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?remind-me-propose(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readProposeFlag() || 'on';
            reason = `Remind-me propose is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'auto' || arg === 'off') {
            const ok = safeWriteProposeFlag(arg);
            reason = ok
                ? `Remind-me propose is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write remind-me-propose flag — state unchanged.`;
        } else {
            reason = 'Usage: /remind-me-propose [on|auto|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
