#!/bin/bash
# conscientious — combined statusline badge.
# Reads both clarify and biblio flag files and prints:
#   "Clarify: <STATE> | Biblio: <STATE>"
# with each half independently colored:
#   on   → green (active, encouraging)
#   auto → grey  (neutral default)
#   off  → red   (active suppression)
# Separator is plain grey.
#
# Security posture mirrors clarify-statusline.sh: refuses symlinks, caps reads
# at 8 bytes, lowercases, restricts to [a-z] before matching.

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CLARIFY_FLAG="$CLAUDE_DIR/.clarify-active"
BIBLIO_FLAG="$CLAUDE_DIR/.biblio-active"

GREEN=$'\033[38;5;42m'
GREY=$'\033[38;5;244m'
RED=$'\033[38;5;196m'
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

render_badge "Clarify" "$CLARIFY_STATE"
printf '%s | %s' "$GREY" "$RESET"
render_badge "Biblio" "$BIBLIO_STATE"
