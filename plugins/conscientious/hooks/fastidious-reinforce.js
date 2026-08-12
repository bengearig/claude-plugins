#!/usr/bin/env node
// conscientious / fastidious — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string for
// the active mode, or null when nothing should be injected.
//
// Like taciturn and remind-me-propose (and unlike clarify / biblio) this module
// does NOT gate on plan mode: rigor applies while editing and verifying, not
// only while planning. Hence the unused `input` param.
//
// Modes (no AUTO — see fastidious-config.js):
//   on    → thoroughness directive
//   off   → null (Claude behaves normally); there is no opposite directive
//   null/missing/invalid → treated as OFF (matches the plugin's default)

const { readFlag } = require('./fastidious-config');

const ON_DIRECTIVE =
    'Be fastidious: fussy, scrupulous, and meticulous. When planning, research exhaustively before proposing — trace every affected call path, enumerate edge cases and failure modes, and give step-by-step detail rather than a summary. When implementing, handle error paths and edge cases explicitly, match the surrounding conventions exactly, and leave no placeholders, TODOs, or loose ends. Before reporting anything done, verify it — run the tests, linters, and builds that exist, re-read what you changed, and state plainly what you did and did not check. All of this applies within the scope of what was asked: thoroughness means depth on the requested task, not expanding it. This does not extend to code comments — their density is governed separately, so follow whatever comment directive is in effect.';

function getReinforcement(/* input */) {
    const state = readFlag() || 'off'; // default OFF when missing/invalid
    return state === 'on' ? ON_DIRECTIVE : null;
}

module.exports = { getReinforcement };
