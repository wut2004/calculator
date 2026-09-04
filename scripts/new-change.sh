#!/usr/bin/env bash
# Start a new loop: scripts/new-change.sh EP-123 short-slug [--type feat|fix] [--source ticket|idea|alert|incident] [--from INC-042|EP-101]
set -euo pipefail
KEY="${1:?usage: new-change.sh <JIRA-KEY> <slug> [--type feat|fix] [--source ...] [--from ...]}"
SLUG="${2:?slug required}"
TYPE="feat"; SOURCE="ticket"; FROM=""
shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)   TYPE="$2"; shift 2 ;;
    --source) SOURCE="$2"; shift 2 ;;
    --from)   FROM="$2"; shift 2 ;;
    *) echo "unknown option $1"; exit 1 ;;
  esac
done
NAME="$KEY-$SLUG"
DIR="docs/sdlc/changes/$NAME"
BRANCH="$TYPE/$NAME"
[[ -e "$DIR" ]] && { echo "✗ $DIR exists"; exit 1; }

git checkout -q -b "$BRANCH"
mkdir -p "$DIR"
AUTHOR="$(git config user.name 2>/dev/null || echo "${USER:-unknown}")"
for f in intent spec plan; do
  sed -e "s/__KEY__/$KEY/g" -e "s/__DATE__/$(date +%Y-%m-%d)/g" -e "s/__AUTHOR__/$AUTHOR/g" \
      "docs/sdlc/templates/$f.md" > "$DIR/$f.md"
done
sed -i -e "s/^source: .*/source: $SOURCE/" "$DIR/intent.md"
if [[ -n "$FROM" ]]; then
  sed -i -e "s/^supersedes: .*/supersedes: $FROM/" "$DIR/intent.md"
  inc="docs/sdlc/incidents/$FROM.md"
  [[ -f "$inc" ]] && sed -i -e "s/^follow_up_change: .*/follow_up_change: $KEY/" "$inc"
fi
git add "$DIR"
git commit -qm "$KEY: start change $NAME" -m "intent/spec/plan scaffolded from templates" 2>/dev/null || true
echo "✓ branch $BRANCH, folder $DIR"
echo "  next: claude → /intent, get approval, /spec, /plan, build"
