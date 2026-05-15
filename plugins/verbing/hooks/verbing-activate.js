const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(configDir, 'settings.json');
const verbsPath = path.join(__dirname, '..', 'verbs.json');

function parseJSONC(text) {
    return JSON.parse(
        text
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
    );
}

try {
    const pluginVerbs = JSON.parse(fs.readFileSync(verbsPath, 'utf8'));

    let settings = {};
    if (fs.existsSync(settingsPath)) {
        try {
            settings = parseJSONC(fs.readFileSync(settingsPath, 'utf8'));
        } catch {
            settings = {};
        }
    }

    const current = settings.spinnerVerbs || { mode: 'append', verbs: [] };
    const existing = new Set(current.verbs || []);
    const toAdd = pluginVerbs.filter(v => !existing.has(v));

    if (toAdd.length > 0) {
        settings.spinnerVerbs = {
            mode: current.mode || 'append',
            verbs: [...(current.verbs || []), ...toAdd],
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    }
} catch {
    // Never disrupt the session
}
