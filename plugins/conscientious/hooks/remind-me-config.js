#!/usr/bin/env node
// conscientious / remind-me — shared utilities.
//   * Per-project JSON store under $CLAUDE_CONFIG_DIR/.remind-me/<projectId>.json
//   * Propose-mode flag file at $CLAUDE_CONFIG_DIR/.remind-me-propose-active
//
// Same hardening as clarify-config.js / biblio-config.js: symlink-safe atomic
// writes (temp+rename), 0600 perms, O_NOFOLLOW where available, parent-dir
// ownership check. Reads refuse symlinks, cap at a documented byte limit,
// and validate structure before returning data.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VALID_PROPOSE_STATES = ['on', 'auto', 'off'];

// Flag-file cap matches clarify/biblio: longest legitimate value is "auto" (4
// bytes); 64 leaves slack for a trailing newline without enabling exfil via
// attacker-planted symlinks.
const MAX_FLAG_BYTES = 64;

// Per-project store cap. Each reminder is a few hundred bytes of prose plus
// some JSON overhead; 256 KB comfortably holds hundreds of reminders without
// allowing a planted symlink to slurp arbitrary file contents.
const MAX_STORE_BYTES = 256 * 1024;

function getClaudeDir() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function getStoreDir() {
    return path.join(getClaudeDir(), '.remind-me');
}

function getProposeFlagPath() {
    return path.join(getClaudeDir(), '.remind-me-propose-active');
}

function getProjectRoot(cwd) {
    const target = cwd || process.cwd();
    let root = target;
    try {
        const out = execFileSync('git', ['-C', target, 'rev-parse', '--show-toplevel'], {
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 1500,
        }).toString().trim();
        if (out) root = out;
    } catch {
        // Not a git repo, or git unavailable — keep cwd.
    }
    try {
        return fs.realpathSync(root);
    } catch {
        return path.resolve(root);
    }
}

function getProjectId(cwd) {
    const root = getProjectRoot(cwd);
    const hash = crypto.createHash('sha256').update(root).digest('hex');
    return hash.slice(0, 16);
}

function getStorePath(projectId) {
    return path.join(getStoreDir(), `${projectId}.json`);
}

// Hardened write primitive shared by flag-file writes and store-file writes.
// Atomic via temp+rename; 0600 perms; O_NOFOLLOW where available. Parent dir
// is allowed to be a symlink only when the resolved target is owned by the
// current user. The target file itself must never be a symlink.
// Silent-fails on any filesystem error — callers must check the return value.
function safeWriteFile(filePath, content, options) {
    const debug = process.env.CONSCIENTIOUS_DEBUG === '1';
    const opts = options || {};
    const dirMode = typeof opts.dirMode === 'number' ? opts.dirMode : 0o700;
    try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true, mode: dirMode });

        let realDir;
        try {
            const lstat = fs.lstatSync(dir);
            if (lstat.isSymbolicLink()) {
                realDir = fs.realpathSync(dir);
                const realStat = fs.statSync(realDir);
                if (!realStat.isDirectory()) {
                    if (debug) process.stderr.write(`[conscientious] safeWriteFile: ${realDir} is not a directory\n`);
                    return false;
                }
                if (typeof process.getuid === 'function') {
                    if (realStat.uid !== process.getuid()) {
                        if (debug) process.stderr.write(`[conscientious] safeWriteFile: ${realDir} owned by uid ${realStat.uid}, not ${process.getuid()}\n`);
                        return false;
                    }
                } else {
                    const home = os.homedir();
                    const normalizedReal = path.resolve(realDir);
                    const normalizedHome = path.resolve(home);
                    if (!normalizedReal.toLowerCase().startsWith(normalizedHome.toLowerCase() + path.sep) &&
                        normalizedReal.toLowerCase() !== normalizedHome.toLowerCase()) {
                        if (debug) process.stderr.write(`[conscientious] safeWriteFile: ${normalizedReal} is outside ${normalizedHome}\n`);
                        return false;
                    }
                }
            } else {
                realDir = dir;
            }
        } catch {
            return false;
        }

        const realFilePath = path.join(realDir, path.basename(filePath));
        try {
            if (fs.lstatSync(realFilePath).isSymbolicLink()) return false;
        } catch (e) {
            if (e.code !== 'ENOENT') return false;
        }

        const tempPath = path.join(realDir, `${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
        const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
        const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
        let fd;
        try {
            fd = fs.openSync(tempPath, flags, 0o600);
            fs.writeSync(fd, String(content));
            try { fs.fchmodSync(fd, 0o600); } catch { /* best-effort on Windows */ }
        } finally {
            if (fd !== undefined) fs.closeSync(fd);
        }
        fs.renameSync(tempPath, realFilePath);
        return true;
    } catch {
        return false;
    }
}

// Hardened read primitive: refuses symlinks, caps size, returns the bytes as
// a utf8 string or null on any anomaly. Callers layer validation on top.
function safeReadFile(filePath, maxBytes) {
    try {
        let st;
        try {
            st = fs.lstatSync(filePath);
        } catch {
            return null;
        }
        if (st.isSymbolicLink() || !st.isFile()) return null;
        if (st.size > maxBytes) return null;

        const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
        const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
        let fd;
        let out;
        try {
            fd = fs.openSync(filePath, flags);
            const buf = Buffer.alloc(maxBytes);
            const n = fs.readSync(fd, buf, 0, maxBytes, 0);
            out = buf.slice(0, n).toString('utf8');
        } finally {
            if (fd !== undefined) fs.closeSync(fd);
        }
        return out;
    } catch {
        return null;
    }
}

function safeWriteProposeFlag(content) {
    if (!VALID_PROPOSE_STATES.includes(String(content))) return false;
    return safeWriteFile(getProposeFlagPath(), content);
}

function readProposeFlag() {
    const out = safeReadFile(getProposeFlagPath(), MAX_FLAG_BYTES);
    if (out == null) return null;
    const raw = out.trim().toLowerCase();
    if (!VALID_PROPOSE_STATES.includes(raw)) return null;
    return raw;
}

function emptyStore(projectPath) {
    return { version: 1, project_path: projectPath || null, reminders: [] };
}

function validateStore(obj, projectPath) {
    if (!obj || typeof obj !== 'object') return emptyStore(projectPath);
    if (obj.version !== 1) return emptyStore(projectPath);
    if (!Array.isArray(obj.reminders)) return emptyStore(projectPath);
    const reminders = [];
    for (const r of obj.reminders) {
        if (!r || typeof r !== 'object') continue;
        if (typeof r.id !== 'string' ||
            typeof r.title !== 'string' ||
            typeof r.description !== 'string' ||
            typeof r.prompt !== 'string' ||
            typeof r.created_at !== 'string') continue;
        reminders.push({
            id: r.id,
            title: r.title,
            description: r.description,
            prompt: r.prompt,
            created_at: r.created_at,
        });
    }
    return {
        version: 1,
        project_path: typeof obj.project_path === 'string' ? obj.project_path : (projectPath || null),
        reminders,
    };
}

function readStore(projectId, projectPath) {
    const out = safeReadFile(getStorePath(projectId), MAX_STORE_BYTES);
    if (out == null) return emptyStore(projectPath);
    try {
        return validateStore(JSON.parse(out), projectPath);
    } catch {
        return emptyStore(projectPath);
    }
}

function writeStore(projectId, store) {
    return safeWriteFile(getStorePath(projectId), JSON.stringify(store, null, 2) + '\n');
}

module.exports = {
    getClaudeDir,
    getStoreDir,
    getProposeFlagPath,
    getProjectRoot,
    getProjectId,
    getStorePath,
    safeWriteFile,
    safeReadFile,
    safeWriteProposeFlag,
    readProposeFlag,
    readStore,
    writeStore,
    emptyStore,
    VALID_PROPOSE_STATES,
    MAX_FLAG_BYTES,
    MAX_STORE_BYTES,
};
