#!/usr/bin/env bash
input="$(cat)"
cmd="$(echo "$input" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p')"
if echo "$cmd" | grep -qE 'git push .*(main|master)|rm -rf /|git reset --hard|DROP TABLE'; then
  echo "BLOCKED by governance hook: $cmd" >&2; exit 2
fi
