#!/usr/bin/env node
// conscientious / biblio — per-turn reinforcement module.
//
// Pluggable into conscientious-reinforce.js (the plugin-scoped UserPromptSubmit
// hook). Exports getReinforcement(input) which returns the directive string
// for the active mode, or null when nothing should be injected.
//
// Modes (plan-mode only — outside plan mode this module never injects):
//   on    → reference-all-repo-docs directive
//   off   → ignore-repo-docs directive
//   auto  → null (Claude behaves normally)
//   null/missing → treated as AUTO (matches the plugin's default)

const { readFlag } = require('./biblio-config');

const ON_DIRECTIVE =
    'Find and reference any and all documentation in this repository (README files, docs/ directories, *.md files, inline docstrings) while building your plan. Do not skip documentation just because the code seems self-explanatory.';

const OFF_DIRECTIVE =
    'Do not read or reference repository documentation (READMEs, docs/, *.md, inline docstrings) while building your plan. Plan from the code itself. (CLAUDE.md / AGENTS.md remain in effect since the harness loads them.)';

function getReinforcement(input) {
    if (!input || input.permission_mode !== 'plan') return null;
    const state = readFlag() || 'auto'; // default AUTO when missing/invalid
    if (state === 'on') return ON_DIRECTIVE;
    if (state === 'off') return OFF_DIRECTIVE;
    return null; // 'auto'
}

module.exports = { getReinforcement };
