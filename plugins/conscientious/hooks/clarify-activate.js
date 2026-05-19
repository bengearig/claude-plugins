#!/usr/bin/env node
// conscientious / clarify — SessionStart hook.
//
// 1. Initialise the clarify flag to ON if it doesn't exist yet (via hardened
//    safeWriteFlag so the very first write is atomic + symlink-checked).
// 2. If the user has no statusLine configured in ~/.claude/settings.json,
//    emit a setup nudge so Claude proactively offers to wire it up.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { safeWriteFlag, readFlag } = require('./clarify-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');

// Initialise flag (default ON) — only writes when readFlag returns null,
// preserving an explicit "off" the user set in a previous session.
try {
    if (readFlag() === null) {
        safeWriteFlag('on');
    }
} catch {
    // Never disrupt the session
}

// Statusline nudge — same pattern as caveman-activate.js.
try {
    let hasStatusline = false;
    if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(
            raw
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/[^\n]*/g, '')
        );
        if (settings.statusLine) hasStatusline = true;
    }

    if (!hasStatusline) {
        const scriptPath = path.join(__dirname, 'clarify-statusline.sh');
        const command = `bash "${scriptPath}"`;
        const snippet = '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
        process.stdout.write(
            'STATUSLINE SETUP NEEDED: The conscientious plugin includes a clarify statusline badge ' +
            '(e.g. "Clarify: ON" / "Clarify: OFF"). It is not configured yet. ' +
            'To enable, add this to ' + settingsPath + ': ' + snippet + ' ' +
            'Proactively offer to set this up for the user on first interaction.'
        );
    }
} catch {
    // Silent fail — never block session start over statusline detection
}
