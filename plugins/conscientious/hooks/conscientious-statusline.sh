#!/bin/bash
# conscientious — combined statusline badge.
# Reads the clarify, biblio, and remind-me-propose flag files (plus the
# per-project reminder count) and prints:
#   "Clarify: <STATE> | Biblio: <STATE> | Reminders: <N> (Propose: <STATE>)"
# with each state half independently colored:
#   on   → green (active, encouraging)
#   auto → grey  (neutral default)
#   off  → red   (active suppression)
# Separator is plain grey. Count is rendered in blue so it stands apart
# visually from the on/auto/off semantics.
#
# Security posture mirrors clarify-statusline.sh: refuses symlinks, caps reads
# at 8 bytes, lowercases, restricts to [a-z] before matching. The reminder
# count is obtained via the remind-me-store.js CLI so the JSON store stays
# behind the same hardened reader used everywhere else.

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CLARIFY_FLAG="$CLAUDE_DIR/.clarify-active"
BIBLIO_FLAG="$CLAUDE_DIR/.biblio-active"
PROPOSE_FLAG="$CLAUDE_DIR/.remind-me-propose-active"

GREEN=$'\033[38;5;42m'
GREY=$'\033[38;5;244m'
RED=$'\033[38;5;196m'
BLUE=$'\033[38;5;39m'
RESET=$'\033[0m'

# read_state <flag_path> <default_state>
# Echoes a sanitised state ("on" / "auto" / "off") or the default if anything is wrong.
read_state() {
    local flag="$1"
    local default="$2"
    # Refuse symlinks — a local attacker could point the flag at sensitive files
    # and have the statusline render their bytes to the terminal.
    [ -L "$flag" ] && { printf '%s' "$default"; return; }
    [ ! -f "$flag" ] && { printf '%s' "$default"; return; }

    local state
    state=$(head -c 8 "$flag" 2>/dev/null | tr -d '\n\r' | tr '[:upper:]' '[:lower:]')
    state=$(printf '%s' "$state" | tr -cd 'a-z')

    case "$state" in
      on|auto|off) printf '%s' "$state" ;;
      *) printf '%s' "$default" ;;
    esac
}

# read_count
# Echoes a non-negative integer for the current project's reminder count.
# Falls back to 0 when node is unavailable or the CLI fails so the statusline
# never disrupts the prompt over a transient I/O issue.
read_count() {
    if ! command -v node >/dev/null 2>&1; then
        printf '0'
        return
    fi
    local count
    count=$(node "$SCRIPT_DIR/remind-me-store.js" count 2>/dev/null | tr -cd '0-9')
    [ -z "$count" ] && count='0'
    printf '%s' "$count"
}

# render_badge <label> <state>
render_badge() {
    local label="$1"
    local state="$2"
    local color
    case "$state" in
      on)   color="$GREEN" ;;
      auto) color="$GREY" ;;
      off)  color="$RED" ;;
      *)    return ;;
    esac
    local upper
    upper=$(printf '%s' "$state" | tr '[:lower:]' '[:upper:]')
    printf '%s%s: %s%s' "$color" "$label" "$upper" "$RESET"
}

CLARIFY_STATE=$(read_state "$CLARIFY_FLAG" "on")
BIBLIO_STATE=$(read_state "$BIBLIO_FLAG" "auto")
PROPOSE_STATE=$(read_state "$PROPOSE_FLAG" "on")
REMINDER_COUNT=$(read_count)

render_badge "Clarify" "$CLARIFY_STATE"
printf '%s | %s' "$GREY" "$RESET"
render_badge "Biblio" "$BIBLIO_STATE"
printf '%s | %sReminders: %s%s%s (' "$GREY" "$GREY" "$BLUE" "$REMINDER_COUNT" "$GREY"
render_badge "Propose" "$PROPOSE_STATE"
printf '%s)%s' "$GREY" "$RESET"
