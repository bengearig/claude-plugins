#!/bin/bash
# clarify — statusline badge. Reads the flag file and prints "Clarify: ON/OFF".
FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.clarify-active"

# Refuse symlinks — a local attacker could point the flag at sensitive files
# and have the statusline render their bytes to the terminal.
[ -L "$FLAG" ] && exit 0
[ ! -f "$FLAG" ] && { printf '\033[38;5;42mClarify: ON\033[0m'; exit 0; }

# Cap read, strip control chars and anything outside [a-z].
STATE=$(head -c 8 "$FLAG" 2>/dev/null | tr -d '\n\r' | tr '[:upper:]' '[:lower:]')
STATE=$(printf '%s' "$STATE" | tr -cd 'a-z')

case "$STATE" in
  on)  printf '\033[38;5;42mClarify: ON\033[0m' ;;
  off) printf '\033[38;5;244mClarify: OFF\033[0m' ;;
  *)   exit 0 ;;
esac
