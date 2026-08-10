#!/usr/bin/env node
// conscientious / taciturn — SessionStart hook.
//
// Initialise the taciturn flag to ON if it doesn't exist yet (via hardened
// safeWriteFlag so the very first write is atomic + symlink-checked).
// ON is the default because terse comments are the point of the feature — an
// installer who wants the opposite runs `/taciturn off`.
//
// readFlag() returns null for anything outside the on/off whitelist, so this
// also migrates a pre-release 'auto' flag file to 'on' in place.

const { safeWriteFlag, readFlag } = require('./taciturn-config');

try {
    if (readFlag() === null) {
        safeWriteFlag('on');
    }
} catch {
    // Never disrupt the session
}
