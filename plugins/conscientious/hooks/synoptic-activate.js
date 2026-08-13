#!/usr/bin/env node
// conscientious / synoptic — SessionStart hook.
//
// Initialise the synoptic flag to OFF if it doesn't exist yet (via hardened
// safeWriteFlag so the very first write is atomic + symlink-checked).
// OFF is the default because this directive shapes a committed artifact — an
// installer should opt in before their commit messages change shape. Opt in per
// session with `/synoptic on` (or `/synoptic auto` to let repo conventions win).
//
// Readers already fall back to OFF, so this seeding is cosmetic: it puts a
// concrete state on disk for the statusline to read.

const { safeWriteFlag, readFlag } = require('./synoptic-config');

try {
    if (readFlag() === null) {
        safeWriteFlag('off');
    }
} catch {
    // Never disrupt the session
}
