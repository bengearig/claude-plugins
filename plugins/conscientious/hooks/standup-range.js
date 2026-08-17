#!/usr/bin/env node
// conscientious / standup — CLI used by the /standup command markdown.
// Resolves a target day, collects that day's commits by the configured user,
// and prints one JSON object. Turning that into bullets is the markdown's job;
// nothing here writes prose.
//
// Usage:
//   standup-range.js ["<args>"]
//
// Args are order-independent and each kind may appear at most once:
//   TODAY | PREVIOUS | YYYY-MM-DD   the day to report on   (default TODAY)
//   1-20                            maximum bullets        (default 5)
//
// PREVIOUS means the most recent day *before today that has commits*, so a day
// off is skipped rather than reported as empty.
//
// Exit codes match remind-me-store.js, where 3 means "the thing you asked about
// does not exist" — a missing reminder there, a missing repository here:
//   0 success (a legitimately empty day included), 2 usage or missing git
//   identity, 3 not a git repo / git unavailable, 1 other failure.

const { execFileSync } = require('child_process');

const DEFAULT_MAX_BULLETS = 5;
const MAX_BULLETS_LIMIT = 20;
const LOOKBACK_DAYS = 90;
// Committer dates drift from author dates under rebase, amend, and cherry-pick,
// so the git-side window is deliberately wider than the day being asked about.
// The exact match happens later, on author date. The forward bound keeps an
// old explicit date from walking the entire repository.
const EXPLICIT_DATE_BACK_DAYS = 3;
const EXPLICIT_DATE_FORWARD_DAYS = 30;
const UNCOMMITTED_PATH_CAP = 20;

const UNIT = '\x1f';
const RECORD = '\x1e';
const LOG_FIELDS = ['%H', '%aI', '%ae', '%P', '%s', '%b'];
const LOG_FORMAT = LOG_FIELDS.join(UNIT) + RECORD;

const WEEKDAYS = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// Attribution trailers carry no account of the work, and a body consisting only
// of one would otherwise reach the summarizer as if it were the rationale.
const TRAILER = /^(?:co-authored-by|signed-off-by|reviewed-by|acked-by|tested-by|reported-by|suggested-by|helped-by|cc):/i;

const USAGE =
    `usage: standup-range.js ["[TODAY|PREVIOUS|YYYY-MM-DD] [1-${MAX_BULLETS_LIMIT}]"]`;

function die(code, msg) {
    if (msg) process.stderr.write(`standup-range: ${msg}\n`);
    process.exit(code);
}

function git(root, args) {
    return execFileSync('git', root ? ['-C', root, ...args] : args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 15000,
        maxBuffer: 64 * 1024 * 1024,
        // Purely read-only calls; never contend with a concurrent index.lock.
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    }).toString();
}

function gitError(err, fallback) {
    const stderr = err && err.stderr ? err.stderr.toString().trim() : '';
    if (stderr) return stderr.split('\n')[0];
    if (err && err.code === 'ETIMEDOUT') return `${fallback} (timed out)`;
    return err && err.message ? err.message.split('\n')[0] : fallback;
}

function toIsoDay(date) {
    const y = String(date.getFullYear()).padStart(4, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function shiftDays(isoDay, delta) {
    const [y, m, d] = isoDay.split('-').map(Number);
    return toIsoDay(new Date(y, m - 1, d + delta));
}

function weekdayOf(isoDay) {
    const [y, m, d] = isoDay.split('-').map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// Rejects impossible calendar dates (2026-02-30), which Date's constructor
// would otherwise roll forward silently.
function isRealDate(y, m, d) {
    const probe = new Date(y, m - 1, d);
    return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

function stripTrailers(body) {
    const lines = body.split('\n');
    while (lines.length && (TRAILER.test(lines[lines.length - 1].trim()) || !lines[lines.length - 1].trim())) {
        lines.pop();
    }
    return lines.join('\n').trim();
}

function parseArgs(argv, today) {
    const tokens = argv.join(' ').trim().split(/\s+/).filter(Boolean);
    let day = null;
    let maxBullets = null;

    for (const token of tokens) {
        const upper = token.toUpperCase();

        if (upper === 'TODAY' || upper === 'PREVIOUS') {
            if (day) die(2, `more than one day given: "${day}" and "${upper}"\n${USAGE}`);
            day = upper;
            continue;
        }

        const dated = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token);
        if (dated) {
            const [, ys, ms, ds] = dated;
            const [y, m, d] = [ys, ms, ds].map(Number);
            if (ms.length !== 2 || ds.length !== 2) {
                die(2, `date must be zero-padded YYYY-MM-DD, got "${token}"\n${USAGE}`);
            }
            if (!isRealDate(y, m, d)) die(2, `no such date on the calendar: "${token}"`);
            if (token > today) die(2, `date is in the future: "${token}"`);
            if (day) die(2, `more than one day given: "${day}" and "${token}"\n${USAGE}`);
            day = token;
            continue;
        }

        if (/^\d+$/.test(token)) {
            const n = Number(token);
            if (n > MAX_BULLETS_LIMIT && /^\d{4}$/.test(token)) {
                die(2, `"${token}" looks like a year; give a full date as YYYY-MM-DD\n${USAGE}`);
            }
            if (n < 1 || n > MAX_BULLETS_LIMIT) {
                die(2, `bullet count must be between 1 and ${MAX_BULLETS_LIMIT}, got ${token}`);
            }
            if (maxBullets !== null) {
                die(2, `more than one bullet count given: ${maxBullets} and ${n}\n${USAGE}`);
            }
            maxBullets = n;
            continue;
        }

        die(2, `unrecognized argument: "${token}"\n${USAGE}`);
    }

    return {
        requested: day || 'TODAY',
        maxBullets: maxBullets === null ? DEFAULT_MAX_BULLETS : maxBullets,
    };
}

// Deliberately not remind-me-config's getProjectRoot: that helper swallows
// failure and returns cwd, so it can never signal "not a repository", which is
// exactly the distinction this command needs.
function resolveRepo() {
    try {
        const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
        if (root) return root;
    } catch (err) {
        die(3, gitError(err, 'not a git repository (or git is unavailable)'));
    }
    die(3, 'could not resolve the repository root');
}

// user.email is the usual source, but git will commit happily using
// GIT_AUTHOR_EMAIL, EMAIL, or an auto-detected user@host; GIT_AUTHOR_IDENT
// resolves whichever of those would actually be recorded.
function resolveAuthor(root) {
    try {
        const email = git(root, ['config', 'user.email']).trim();
        if (email) return { email, configured: true };
    } catch {
        // Unset config exits non-zero; fall through to the ident probe.
    }
    try {
        const ident = git(root, ['var', 'GIT_AUTHOR_IDENT']).trim();
        const match = /<([^>]*)>/.exec(ident);
        // Auto-detection yields user@hostname, which usually matches nothing
        // that was actually committed, so the caller announces what it used.
        if (match && match[1]) return { email: match[1], configured: false };
    } catch {
        // Fall through to the usage error below.
    }
    die(2, 'no git author email is configured, so there is no way to tell which commits are yours');
}

function collectCommits(root, email, since, until) {
    // --no-use-mailmap is required: log.mailmap defaults to true, and a repo
    // whose .mailmap rewrites this address makes --author match nothing at all.
    // --fixed-strings matters too, since --author is a substring regex and an
    // address containing "." or "+" would otherwise match more authors than
    // intended. Explicit ref globs replace --all so that refs/stash and
    // refs/notes cannot contribute their own machine-generated commits.
    const args = [
        'log', '--branches', '--tags', '--remotes', 'HEAD',
        '--no-use-mailmap', '--fixed-strings',
        `--author=${email}`,
        `--since=${since}`,
        ...(until ? [`--until=${until}`] : []),
        `--pretty=format:${LOG_FORMAT}`,
    ];

    let raw;
    try {
        raw = git(root, args);
    } catch (err) {
        die(1, gitError(err, 'git log failed'));
    }

    const wanted = email.toLowerCase();
    const malformed = [];
    const commits = [];

    for (const record of raw.split(RECORD)) {
        const trimmed = record.replace(/^\n/, '');
        if (!trimmed.trim()) continue;
        const fields = trimmed.split(UNIT);
        if (fields.length !== LOG_FIELDS.length) {
            // A separator byte inside a subject or body would mis-slice the
            // record; drop it loudly rather than emit a scrambled commit.
            malformed.push(fields[0] ? fields[0].slice(0, 7) : '(unknown)');
            continue;
        }
        const [sha, time, authorEmail, parents, subject, body] = fields;
        if (!sha || !time) continue;
        if (authorEmail.trim().toLowerCase() !== wanted) continue;
        commits.push({
            sha,
            time,
            subject: subject || '',
            body: stripTrailers(body || ''),
            isMerge: parents.trim().split(/\s+/).filter(Boolean).length > 1,
        });
    }

    return { commits, malformed };
}

// Buckets by the machine's local day rather than the offset recorded in the
// commit. "Today" is a local-clock notion, so grouping the same way keeps the
// two consistent — otherwise evening work committed in a UTC container (as in
// most devcontainers and CI) lands on tomorrow and disappears from both TODAY
// and PREVIOUS.
function groupByLocalDay(commits) {
    const byDay = new Map();
    for (const commit of commits) {
        const day = toIsoDay(new Date(commit.time));
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(commit);
    }
    for (const list of byDay.values()) {
        list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return byDay;
}

function readUncommitted(root, notes) {
    let raw;
    try {
        raw = git(root, ['status', '--porcelain', '-z', '-uall']);
    } catch (err) {
        notes.push(`Could not read the working tree: ${gitError(err, 'git status failed')}`);
        return null;
    }

    const fields = raw.split('\0');
    const paths = [];
    for (let i = 0; i < fields.length; i += 1) {
        const entry = fields[i];
        if (!entry) continue;
        const status = entry.slice(0, 2);
        paths.push(entry.slice(3));
        // Renames and copies emit the origin path as its own NUL-terminated
        // field; consume it so it is not counted as a second changed file.
        if (status.includes('R') || status.includes('C')) i += 1;
    }

    if (!paths.length) return null;
    return {
        fileCount: paths.length,
        paths: paths.slice(0, UNCOMMITTED_PATH_CAP),
        truncated: paths.length > UNCOMMITTED_PATH_CAP,
    };
}

function main() {
    const today = toIsoDay(new Date());
    const { requested, maxBullets } = parseArgs(process.argv.slice(2), today);

    const root = resolveRepo();
    const { email, configured } = resolveAuthor(root);

    const keyword = requested === 'TODAY' || requested === 'PREVIOUS';
    const since = keyword
        ? `${LOOKBACK_DAYS} days ago`
        : shiftDays(requested, -EXPLICIT_DATE_BACK_DAYS);
    const until = keyword ? null : shiftDays(requested, EXPLICIT_DATE_FORWARD_DAYS);

    const notes = [];
    if (!configured) {
        notes.push(`git config user.email is not set; falling back to the auto-detected ${email}, which may match none of your commits.`);
    }
    const { commits: all, malformed } = collectCommits(root, email, since, until);
    if (malformed.length) {
        notes.push(`Skipped ${malformed.length} commit(s) whose message could not be parsed cleanly: ${malformed.join(', ')}.`);
    }

    const future = all.filter((c) => toIsoDay(new Date(c.time)) > today);
    if (future.length) {
        notes.push(`${future.length} commit(s) carry an author date in the future and are excluded; check the clock on the machine that made them.`);
    }

    const byDay = groupByLocalDay(all.filter((c) => toIsoDay(new Date(c.time)) <= today));

    let date;
    if (requested === 'TODAY') {
        date = today;
    } else if (requested === 'PREVIOUS') {
        date = [...byDay.keys()]
            .sort()
            .reverse()
            .find((d) => d < today && byDay.get(d).some((c) => !c.isMerge)) || null;
        if (!date) {
            notes.push(`No commits by ${email} in the last ${LOOKBACK_DAYS} days before ${today}.`);
        }
    } else {
        date = requested;
    }

    const dayCommits = date ? (byDay.get(date) || []) : [];
    const commits = dayCommits.filter((c) => !c.isMerge);
    const merges = dayCommits.length - commits.length;
    if (!commits.length && merges) {
        notes.push(`${merges} merge commit(s) on this day are not summarized; the day's work may have gone in through a merge.`);
    }

    const uncommitted = date === today ? readUncommitted(root, notes) : null;

    process.stdout.write(JSON.stringify({
        requested,
        date,
        weekday: date ? weekdayOf(date) : null,
        maxBullets,
        author: email,
        repoRoot: root,
        commitCount: commits.length,
        commits: commits.map(({ isMerge, ...rest }) => rest),
        uncommitted,
        notes,
    }, null, 2) + '\n');
}

try {
    main();
} catch (err) {
    die(1, err && err.message ? err.message.split('\n')[0] : String(err));
}
