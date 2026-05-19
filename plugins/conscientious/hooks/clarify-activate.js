#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.clarify-active');
const settingsPath = path.join(claudeDir, 'settings.json');

try {
    if (!fs.existsSync(flagPath)) {
        fs.writeFileSync(flagPath, 'on\n');
    }
} catch {
    // Never disrupt the session
}

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
            'STATUSLINE SETUP NEEDED: The clarify plugin includes a statusline badge ' +
            '(e.g. "Clarify: ON" / "Clarify: OFF"). It is not configured yet. ' +
            'To enable, add this to ' + settingsPath + ': ' + snippet + ' ' +
            'Proactively offer to set this up for the user on first interaction.'
        );
    }
} catch {
    // Silent fail — never block session start over statusline detection
}
