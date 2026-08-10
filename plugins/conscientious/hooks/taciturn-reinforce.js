#!/usr/bin/env node
// conscientious / taciturn — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string for
// the active mode, or null when nothing should be injected.
//
// Like remind-me-propose (and unlike clarify / biblio) this module does NOT gate
// on plan mode: comment density is a property of the code Claude writes, so the
// directive has to be live while editing, not only while planning.
//
// Modes (no AUTO — see taciturn-config.js; this module always injects):
//   on    → minimal-comments directive
//   off   → comment-generously directive
//   null/missing/invalid → treated as ON (matches the plugin's default)

const { readFlag } = require('./taciturn-config');

const ON_DIRECTIVE =
    'Keep code comments to a minimum. Write a comment only where there is genuine ambiguity, or where important context is not obvious and apparent from the code itself — never to restate what the code plainly does. When a comment is warranted, keep the prose brief and concise, or replace it with a simple phrase or expression where that carries the same meaning. Do not strip existing comments unless asked.';

const OFF_DIRECTIVE =
    'Comment code generously. Explain intent, tradeoffs, and non-obvious mechanics as you write, even where the code looks self-explanatory.';

function getReinforcement(/* input */) {
    const state = readFlag() || 'on'; // default ON when missing/invalid
    return state === 'off' ? OFF_DIRECTIVE : ON_DIRECTIVE;
}

module.exports = { getReinforcement };
