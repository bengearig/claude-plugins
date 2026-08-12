#!/usr/bin/env node
// conscientious / fastidious — shared flag-file I/O for the thoroughness feature.
//
// Mirrors clarify-config.js: symlink-safe atomic temp+rename writes, 0600 perms,
// parent-dir ownership check, O_NOFOLLOW where available, size-capped reads with
// whitelist validation. See clarify-config.js for rationale on each guard.
//
// The flag lives at $CLAUDE_CONFIG_DIR/.fastidious-active (default
// ~/.claude/.fastidious-active). Valid contents: "on" or "off".
// Missing/invalid is treated as OFF by readers.
//
// Like taciturn there is no AUTO state, but for the opposite reason: OFF here
// injects no directive at all, so it already *is* the neutral middle state.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_STATES = ['on', 'off'];

// Longest legitimate value is "off" (3 bytes). 64 leaves slack for a trailing
// newline without enabling exfil through an attacker-planted symlink.
const MAX_FLAG_BYTES = 64;

function getFlagPath() {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    return path.join(claudeDir, '.fastidious-active');
}

// Symlink-safe flag write.
// Atomic via temp+rename; 0600 perms; O_NOFOLLOW where available.
// Parent dir is allowed to be a symlink (legitimate pattern when ~/.claude is
// symlinked to a shared config dir) but only when the resolved target is owned
// by the current user. The flag file itself must never be a symlink.
// Silent-fails on any filesystem error — the flag is best-effort.
function safeWriteFlag(content) {
    const debug = process.env.CONSCIENTIOUS_DEBUG === '1';
    const flagPath = getFlagPath();
    try {
        const flagDir = path.dirname(flagPath);
        fs.mkdirSync(flagDir, { recursive: true });

        let realFlagDir;
        try {
            const lstat = fs.lstatSync(flagDir);
            if (lstat.isSymbolicLink()) {
                realFlagDir = fs.realpathSync(flagDir);
                const realStat = fs.statSync(realFlagDir);
                if (!realStat.isDirectory()) {
                    if (debug) process.stderr.write(`[conscientious] safeWriteFlag: ${realFlagDir} is not a directory\n`);
                    return false;
                }
                if (typeof process.getuid === 'function') {
                    if (realStat.uid !== process.getuid()) {
                        if (debug) process.stderr.write(`[conscientious] safeWriteFlag: ${realFlagDir} owned by uid ${realStat.uid}, not ${process.getuid()}\n`);
                        return false;
                    }
                } else {
                    const home = os.homedir();
                    const normalizedReal = path.resolve(realFlagDir);
                    const normalizedHome = path.resolve(home);
                    if (!normalizedReal.toLowerCase().startsWith(normalizedHome.toLowerCase() + path.sep) &&
                        normalizedReal.toLowerCase() !== normalizedHome.toLowerCase()) {
                        if (debug) process.stderr.write(`[conscientious] safeWriteFlag: ${normalizedReal} is outside ${normalizedHome}\n`);
                        return false;
                    }
                }
            } else {
                realFlagDir = flagDir;
            }
        } catch {
            return false;
        }

        const realFlagPath = path.join(realFlagDir, path.basename(flagPath));
        try {
            if (fs.lstatSync(realFlagPath).isSymbolicLink()) return false;
        } catch (e) {
            if (e.code !== 'ENOENT') return false;
        }

        const tempPath = path.join(realFlagDir, `.fastidious-active.${process.pid}.${Date.now()}`);
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
        fs.renameSync(tempPath, realFlagPath);
        return true;
    } catch {
        return false;
    }
}

// Symlink-safe, size-capped, whitelist-validated read.
// Returns 'on' / 'off' on success, null on any anomaly (missing, symlink,
// oversized, unknown value). Callers default to OFF when null.
function readFlag() {
    const flagPath = getFlagPath();
    try {
        let st;
        try {
            st = fs.lstatSync(flagPath);
        } catch {
            return null;
        }
        if (st.isSymbolicLink() || !st.isFile()) return null;
        if (st.size > MAX_FLAG_BYTES) return null;

        const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
        const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
        let fd;
        let out;
        try {
            fd = fs.openSync(flagPath, flags);
            const buf = Buffer.alloc(MAX_FLAG_BYTES);
            const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
            out = buf.slice(0, n).toString('utf8');
        } finally {
            if (fd !== undefined) fs.closeSync(fd);
        }

        const raw = out.trim().toLowerCase();
        if (!VALID_STATES.includes(raw)) return null;
        return raw;
    } catch {
        return null;
    }
}

module.exports = { getFlagPath, safeWriteFlag, readFlag, VALID_STATES };
