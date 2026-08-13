#!/usr/bin/env node
// conscientious / synoptic — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string for
// the active mode, or null when nothing should be injected.
//
// Like taciturn, fastidious, and remind-me-propose (and unlike clarify / biblio)
// this module does NOT gate on plan mode: commit messages are written while
// executing, not while planning. Hence the unused `input` param.
//
// Modes (three states, but with AUTO and OFF swapped relative to clarify/biblio
// — see synoptic-config.js):
//   on    → terse-commit directive that overrides a repo's documented convention
//   auto  → same directive, but a repo's documented convention wins
//   off   → null (Claude commits normally); there is no "commit verbosely" directive
//   null/missing/invalid → treated as OFF (matches the plugin's default)

const { readFlag } = require('./synoptic-config');

// Shared opening. The "governs the commit message alone" sentence keeps this from
// contending with fastidious's "give step-by-step detail rather than a summary",
// which lands in the same additionalContext block.
const CORE_DIRECTIVE =
    'Write commit messages as a single-line summary and nothing more. Use as few words as possible while still conveying the birds-eye, macro overview of what the work accomplished — state the macro claim and drop the supporting detail clause. Do not write a commit body; required trailers (such as Co-Authored-By) are the only exception. This governs the commit message alone — it does not reduce how thoroughly you do the work, nor how fully you report it in conversation.';

const EXPLICIT_REQUEST_ESCAPE =
    ' If the user explicitly asks for a detailed commit message, give them one.';

const ON_DIRECTIVE =
    CORE_DIRECTIVE +
    " Follow it even where the repository's own documented commit convention asks for a body." +
    EXPLICIT_REQUEST_ESCAPE;

const AUTO_DIRECTIVE =
    CORE_DIRECTIVE +
    ' If the repository documents a commit-message convention that requires a body or a different format, follow the repository.' +
    EXPLICIT_REQUEST_ESCAPE;

function getReinforcement(/* input */) {
    const state = readFlag() || 'off'; // default OFF when missing/invalid
    if (state === 'on') return ON_DIRECTIVE;
    if (state === 'auto') return AUTO_DIRECTIVE;
    return null;
}

module.exports = { getReinforcement };
