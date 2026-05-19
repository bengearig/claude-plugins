#!/usr/bin/env node
// conscientious / remind-me — UserPromptSubmit hook that surfaces the current
// permission_mode to Claude when the user invokes the bare `/remind-me` (no
// args) command. The /remind-me command markdown labels its "Send" sub-menu
// option as "Send in <mode> mode", and this hook is how it learns the active
// mode (Claude cannot read permission_mode from its own context reliably).
//
// Matched forms:
//   /remind-me              → inject CURRENT_PERMISSION_MODE additionalContext
//   /conscientious:remind-me   ditto
//
// The hook never blocks: the prompt always reaches Claude. With args (the
// create path), Claude doesn't need the mode label, so we skip injection.

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input || '{}');
        const prompt = (data.prompt || '').trim();

        if (!/^\/(?:conscientious:)?remind-me\s*$/i.test(prompt)) return;

        const mode = data.permission_mode || 'default';
        process.stdout.write(JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'UserPromptSubmit',
                additionalContext: `CURRENT_PERMISSION_MODE: ${mode}`,
            },
        }));
    } catch {
        // Silent fail — never block the prompt
    }
});
