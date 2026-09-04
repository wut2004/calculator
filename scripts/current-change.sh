#!/usr/bin/env bash
# Print the change folder for the current branch (feat/EP-123-slug → docs/sdlc/changes/EP-123-slug).
# Exit 1 if not on a change branch.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
key="$(echo "$branch" | sed -nE 's#^(feat|fix|chore|hotfix)/([A-Z]+-[0-9]+-[a-z0-9-]+)$#\2#p')"
[[ -n "$key" ]] || exit 1
echo "docs/sdlc/changes/$key"
