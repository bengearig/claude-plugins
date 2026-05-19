#!/usr/bin/env node
// conscientious / remind-me — CLI used by the /remind-me command markdown.
// All storage I/O goes through remind-me-config.js so reads + writes stay
// symlink-safe, size-capped, atomic, and 0600.
//
// Sub-commands:
//   project-id          → prints "<id>\n<resolved-root>" for the current cwd
//   list                → tab-separated "<id>\t<title>\t<created_at>" lines
//   count               → integer count for the current project
//   dump <id>           → full JSON of one reminder (pretty-printed)
//   add                 → reads {title,description,prompt} JSON from stdin,
//                         appends with a generated id, prints the new id
//   update <id>         → reads the replacement prompt text from stdin,
//                         replaces the reminder's prompt field
//   delete <id>         → removes the reminder
//
// Exit codes: 0 success, 2 usage, 3 not-found, 1 write/other failure.

const crypto = require('crypto');
const {
    getProjectId,
    getProjectRoot,
    readStore,
    writeStore,
} = require('./remind-me-config');

function die(code, msg) {
    if (msg) process.stderr.write(`remind-me-store: ${msg}\n`);
    process.exit(code);
}

function readStdin() {
    return new Promise((resolve) => {
        let buf = '';
        if (process.stdin.isTTY) return resolve('');
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (c) => { buf += c; });
        process.stdin.on('end', () => resolve(buf));
    });
}

function loadCtx() {
    const cwd = process.cwd();
    const root = getProjectRoot(cwd);
    const id = getProjectId(cwd);
    return { cwd, root, id };
}

function newId() {
    return crypto.randomBytes(6).toString('hex');
}

function cmdProjectId() {
    const { id, root } = loadCtx();
    process.stdout.write(`${id}\n${root}\n`);
}

function cmdList() {
    const { id, root } = loadCtx();
    const store = readStore(id, root);
    for (const r of store.reminders) {
        // Tab-separated; titles are sanitised at write-time to be single-line.
        process.stdout.write(`${r.id}\t${r.title}\t${r.created_at}\n`);
    }
}

function cmdCount() {
    const { id, root } = loadCtx();
    const store = readStore(id, root);
    process.stdout.write(`${store.reminders.length}\n`);
}

function cmdDump(reminderId) {
    if (!reminderId) die(2, 'dump requires a reminder id');
    const { id, root } = loadCtx();
    const store = readStore(id, root);
    const r = store.reminders.find((x) => x.id === reminderId);
    if (!r) die(3, `no reminder with id ${reminderId}`);
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
}

async function cmdAdd() {
    const raw = await readStdin();
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        die(2, 'add: stdin must be JSON {title, description, prompt}');
    }
    const title = String(payload.title || '').replace(/\s+/g, ' ').trim();
    const description = String(payload.description || '').trim();
    const prompt = String(payload.prompt || '').trim();
    if (!title || !description || !prompt) {
        die(2, 'add: title, description, and prompt are all required');
    }

    const { id, root } = loadCtx();
    const store = readStore(id, root);
    // Always anchor project_path to the current resolved root so a missing /
    // freshly-defaulted file is repaired on first write.
    store.project_path = root;

    const reminder = {
        id: newId(),
        title,
        description,
        prompt,
        created_at: new Date().toISOString(),
    };
    store.reminders.push(reminder);

    if (!writeStore(id, store)) die(1, 'failed to write store');
    process.stdout.write(`${reminder.id}\n`);
}

async function cmdUpdate(reminderId) {
    if (!reminderId) die(2, 'update requires a reminder id');
    const prompt = (await readStdin()).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
    if (!prompt) die(2, 'update: stdin prompt was empty');

    const { id, root } = loadCtx();
    const store = readStore(id, root);
    const idx = store.reminders.findIndex((x) => x.id === reminderId);
    if (idx === -1) die(3, `no reminder with id ${reminderId}`);
    store.reminders[idx].prompt = prompt;
    store.project_path = root;

    if (!writeStore(id, store)) die(1, 'failed to write store');
}

function cmdDelete(reminderId) {
    if (!reminderId) die(2, 'delete requires a reminder id');
    const { id, root } = loadCtx();
    const store = readStore(id, root);
    const before = store.reminders.length;
    store.reminders = store.reminders.filter((x) => x.id !== reminderId);
    if (store.reminders.length === before) die(3, `no reminder with id ${reminderId}`);
    store.project_path = root;

    if (!writeStore(id, store)) die(1, 'failed to write store');
}

async function main() {
    const [sub, ...args] = process.argv.slice(2);
    switch (sub) {
        case 'project-id':  return cmdProjectId();
        case 'list':        return cmdList();
        case 'count':       return cmdCount();
        case 'dump':        return cmdDump(args[0]);
        case 'add':         return cmdAdd();
        case 'update':      return cmdUpdate(args[0]);
        case 'delete':      return cmdDelete(args[0]);
        default:
            die(2, `unknown subcommand: ${sub || '(none)'}\n` +
                   'usage: remind-me-store.js {project-id|list|count|dump <id>|add|update <id>|delete <id>}');
    }
}

main().catch((err) => die(1, err && err.message ? err.message : String(err)));
