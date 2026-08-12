#!/usr/bin/env node
// conscientious / fastidious — SessionStart hook.
//
// Initialise the fastidious flag to OFF if it doesn't exist yet (via hardened
// safeWriteFlag so the very first write is atomic + symlink-checked).
// OFF is the default because the ON directive is invasive and token-expensive —
// the same reasoning biblio uses for defaulting to AUTO. Opt in per session with
// `/fastidious on`.
//
// Readers already fall back to OFF, so this seeding is cosmetic: it puts a
// concrete state on disk for the statusline to read.

const { safeWriteFlag, readFlag } = require('./fastidious-config');

try {
    if (readFlag() === null) {
        safeWriteFlag('off');
    }
} catch {
    // Never disrupt the session
}
