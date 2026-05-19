#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.clarify-active');

let raw = '';
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    try {
        const input = JSON.parse(raw || '{}');
        if (input.permission_mode !== 'plan') return;

        let enabled = true;
        try {
            const flag = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
            enabled = flag !== 'off';
        } catch {
            // Missing flag → default ON
        }
        if (!enabled) return;

        process.stdout.write(JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'UserPromptSubmit',
                additionalContext:
                    'Ask any and all clarifying questions that you may possibly have about this implementation; do not assume and be very thorough.',
            },
        }));
    } catch {
        // Never disrupt the session
    }
});
