#!/usr/bin/env node
// conscientious / drift-resistant prose — always-on directive module.
//
// Pluggable into conscientious-reinforce.js under DIRECTIVES rather than
// FEATURES: same getReinforcement(input) contract, but no flag file, no
// command, no statusline segment, and no state in which it returns null. It
// is injected on every turn regardless of user configuration.
//
// The directive targets prose whose truth is pinned to a detail that the next
// edit invalidates — counts above all, but also line numbers, ordinals, and
// "currently N" phrasing.

// The closing sentences keep this from contending with taciturn (comment
// density) and synoptic (changelog/commit prose), which land in the same
// additionalContext block.
const DIRECTIVE =
    'Never write comments or documentation whose accuracy depends on details that drift as the code changes. ' +
    'Counts and enumerations are the usual culprits: write "The Authentication routes are built" rather than ' +
    '"The five Authentication routes are built", and "The hard ones are wherever anything is registered" rather ' +
    'than "The hard ones are the five places anything is registered". The same goes for line numbers, ordinal ' +
    'positions ("the second handler"), and "currently N" phrasing — identify things by name or by what they are, ' +
    'so the prose stays true after the next edit. Keep an exact figure only where it is the point of the sentence ' +
    'and cannot be read off the code. This governs how comments and documentation are worded, not how many you ' +
    'write, and it does not apply to prose that deliberately records a fixed moment, such as changelog entries.';

function getReinforcement(/* input */) {
    return DIRECTIVE;
}

module.exports = { getReinforcement };
