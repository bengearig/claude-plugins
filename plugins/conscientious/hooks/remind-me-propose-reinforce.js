#!/usr/bin/env node
// conscientious / remind-me-propose — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string for
// the active mode, or null when nothing should be injected.
//
// Unlike clarify-reinforce / biblio-reinforce, this module does NOT gate on
// plan mode — out-of-scope work is just as worth surfacing during execution as
// it is during planning.
//
// Modes:
//   on    → proactively-offer-reminders directive (matches the user's hand-
//           injected guidance: "briefly mention it and offer to save it with
//           /remind-me <description>. Do not save anything yourself — only offer.")
//   off   → explicit-suppression directive
//   auto  → null (Claude behaves normally)
//   null/missing → treated as ON (matches the plugin's default)

const { readProposeFlag } = require('./remind-me-config');

const ON_DIRECTIVE =
    'If, while responding, you identify future work that is out of scope of the current request, briefly mention it and offer to save it with `/remind-me <description>`. Do not save anything yourself — only offer.';

const OFF_DIRECTIVE =
    'Do not proactively suggest /remind-me reminders. Only create reminders when the user explicitly invokes /remind-me.';

function getReinforcement(/* input */) {
    const state = readProposeFlag() || 'on'; // default ON when missing/invalid
    if (state === 'on') return ON_DIRECTIVE;
    if (state === 'off') return OFF_DIRECTIVE;
    return null; // 'auto'
}

module.exports = { getReinforcement };
