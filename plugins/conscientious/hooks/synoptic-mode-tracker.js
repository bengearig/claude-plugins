#!/usr/bin/env node
// conscientious / synoptic — UserPromptSubmit hook that intercepts /synoptic
// commands. Parses the slash command in-hook (deterministic, no LLM round-trip,
// no prompt-injection risk) and uses {decision:"block", reason:"..."} to display
// status directly in the terminal without the prompt reaching Claude.
//
// Matched forms:
//   /synoptic              → print current state
//   /synoptic on           → set ON (one-line commit subjects, repo convention overridden)
//   /synoptic auto         → set AUTO (same, but a repo's documented convention wins)
//   /synoptic off          → set OFF (no directive)
//   /synoptic <other>      → show usage
//   /conscientious:synoptic [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally and conscientious-reinforce can add its directives.

const { safeWriteFlag, readFlag } = require('./synoptic-config');

const BEHAVIOR = {
    on:   "I'll write commit messages as one-line birds-eye summaries in as few words as possible, with no co-author line.",
    auto: "I'll write one-line birds-eye commit messages with no co-author line, unless the repo documents its own convention.",
    off:  "I'll write commit messages normally.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?synoptic(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readFlag() || 'off';
            reason = `Synoptic is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'auto' || arg === 'off') {
            const ok = safeWriteFlag(arg);
            reason = ok
                ? `Synoptic is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write synoptic flag — state unchanged.`;
        } else {
            reason = 'Usage: /synoptic [on|auto|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
