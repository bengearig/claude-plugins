#!/usr/bin/env node
// conscientious / clarify — SessionStart hook.
//
// Initialise the clarify flag to ON if it doesn't exist yet (via hardened
// safeWriteFlag so the very first write is atomic + symlink-checked).
// The statusline-setup nudge now lives in conscientious-statusline-nudge.js so
// a single combined nudge covers both /clarify and /biblio.

const { safeWriteFlag, readFlag } = require('./clarify-config');

try {
    if (readFlag() === null) {
        safeWriteFlag('on');
    }
} catch {
    // Never disrupt the session
}
