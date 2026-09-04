#!/usr/bin/env bash
# PreToolUse gate: block source edits unless the CURRENT CHANGE's plan is approved.
input="$(cat)"
file="$(echo "$input" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p')"
case "$file" in
  ""|*/docs/sdlc/*|*/docs/adr/*|*/.claude/*|*.md) exit 0 ;;
esac
dir="$(scripts/current-change.sh 2>/dev/null)" || {
  echo "BLOCKED: not on a change branch (feat/EP-123-slug). Run scripts/new-change.sh first." >&2; exit 2; }
if ! grep -lqE '^status: *approved' "$dir"/plan*.md 2>/dev/null; then
  echo "BLOCKED: no approved plan in $dir. Get plan approval before editing $file." >&2; exit 2
fi
