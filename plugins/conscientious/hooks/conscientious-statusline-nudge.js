#!/usr/bin/env node
// conscientious — SessionStart hook that emits a one-time statusline-setup nudge.
//
// If the user has no statusLine configured in ~/.claude/settings.json, emit a
// single setup message pointing at the combined conscientious-statusline script
// (bash on Linux/macOS, PowerShell on Windows) so Claude can proactively offer
// to wire it up. Detection is "any statusLine present", so users who already
// have any statusline (including the legacy clarify-only one) won't be re-nudged.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');

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
        const isWindows = process.platform === 'win32';
        const scriptName = isWindows ? 'conscientious-statusline.ps1' : 'conscientious-statusline.sh';
        const scriptPath = path.join(__dirname, scriptName);
        const command = isWindows
            ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
            : `bash "${scriptPath}"`;
        const snippet = '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
        process.stdout.write(
            'STATUSLINE SETUP NEEDED: The conscientious plugin includes a combined statusline badge ' +
            '(e.g. "Clarify: ON | Biblio: AUTO") covering both /clarify and /biblio. It is not configured yet. ' +
            'To enable, add this to ' + settingsPath + ': ' + snippet + ' ' +
            'Proactively offer to set this up for the user on first interaction.'
        );
    }
} catch {
    // Silent fail — never block session start over statusline detection
}
