#!/usr/bin/env node
// conscientious / biblio — SessionStart hook.
//
// Initialise the biblio flag to AUTO if it doesn't exist yet (via hardened
// safeWriteFlag so the very first write is atomic + symlink-checked).
// Biblio's default differs from clarify's (AUTO vs ON) because the ON directive
// is more invasive — telling Claude to hunt down all repo docs on first install
// would surprise users, so the safe initial posture is to inject nothing.

const { safeWriteFlag, readFlag } = require('./biblio-config');

try {
    if (readFlag() === null) {
        safeWriteFlag('auto');
    }
} catch {
    // Never disrupt the session
}
