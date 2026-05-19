#!/usr/bin/env node
// conscientious / remind-me-propose — SessionStart hook.
//
// Seed the propose flag to ON when missing (so out-of-the-box behaviour is
// "Claude proactively offers /remind-me suggestions for out-of-scope work").
// Goes through safeWriteProposeFlag so even the very first write is atomic
// + symlink-checked.

const { safeWriteProposeFlag, readProposeFlag } = require('./remind-me-config');

try {
    if (readProposeFlag() === null) {
        safeWriteProposeFlag('on');
    }
} catch {
    // Never disrupt the session
}
