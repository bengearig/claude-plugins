#!/usr/bin/env node
// conscientious / biblio — UserPromptSubmit hook that intercepts /biblio
// commands. Parses the slash command in-hook (deterministic, no LLM round-trip,
// no prompt-injection risk) and uses {decision:"block", reason:"..."} to display
// status directly in the terminal without the prompt reaching Claude.
//
// Matched forms:
//   /biblio              → print current state
//   /biblio on           → set ON (reference all repo docs while planning)
//   /biblio auto         → set AUTO (no directive — Claude behaves normally)
//   /biblio off          → set OFF (explicitly ignore repo docs while planning)
//   /biblio <other>      → show usage
//   /conscientious:biblio [...same as above]
//
// Anything else is passed through (no decision emitted), so the prompt reaches
// Claude normally and conscientious-reinforce can add its directives.

const { safeWriteFlag, readFlag } = require('./biblio-config');

const BEHAVIOR = {
    on:   "I'll find and reference any documentation in this repo while planning.",
    auto: "I'll behave normally.",
    off:  "I'll ignore repo documentation while planning.",
};

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        const match = /^\/(?:conscientious:)?biblio(?:\s+(.*))?$/i.exec(prompt);
        if (!match) return;

        const arg = (match[1] || '').trim().toLowerCase();
        let reason;

        if (arg === '') {
            const state = readFlag() || 'auto';
            reason = `Biblio is currently ${state.toUpperCase()} — ${BEHAVIOR[state]}`;
        } else if (arg === 'on' || arg === 'auto' || arg === 'off') {
            const ok = safeWriteFlag(arg);
            reason = ok
                ? `Biblio is now ${arg.toUpperCase()} — ${BEHAVIOR[arg]}`
                : `Could not write biblio flag — state unchanged.`;
        } else {
            reason = 'Usage: /biblio [on|auto|off]';
        }

        process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } catch {
        // Silent fail — let the prompt through normally
    }
});
