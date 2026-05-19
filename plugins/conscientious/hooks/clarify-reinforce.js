#!/usr/bin/env node
// conscientious / clarify — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string
// for the active mode, or null when nothing should be injected.
//
// Modes (plan-mode only — outside plan mode this module never injects):
//   on    → ask-clarifying-questions directive
//   off   → suppress-clarifying-questions directive
//   auto  → null (Claude behaves normally)
//   null/missing → treated as ON (matches the plugin's default)

const { readFlag } = require('./clarify-config');

const ON_DIRECTIVE =
    'Ask any and all clarifying questions that you may possibly have about this implementation; do not assume and be very thorough.';

const OFF_DIRECTIVE =
    'Do not ask clarifying questions before proceeding. Make reasonable assumptions and act on them.';

function getReinforcement(input) {
    if (!input || input.permission_mode !== 'plan') return null;
    const state = readFlag() || 'on'; // default ON when missing/invalid
    if (state === 'on') return ON_DIRECTIVE;
    if (state === 'off') return OFF_DIRECTIVE;
    return null; // 'auto'
}

module.exports = { getReinforcement };
