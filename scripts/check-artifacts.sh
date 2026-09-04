#!/usr/bin/env bash
# Validate the artifact chain for every change folder (CI) or the current one (--current).
set -e
fail=0
st() { grep -E '^status:' "$1" 2>/dev/null | awk '{print $2}'; }
check() {
  d="$1"; n="$(basename "$d")"
  for f in intent spec plan; do
    [[ -f "$d/$f.md" ]] || { echo "✗ $n: missing $f.md"; fail=1; }
  done
  i="$(st "$d/intent.md")"; s="$(st "$d/spec.md")"; p="$(st "$d/plan.md")"
  [[ "$s" =~ ^(approved|done)$ && ! "$i" =~ ^(approved|done)$ ]] && { echo "✗ $n: spec approved before intent"; fail=1; }
  [[ "$p" =~ ^(approved|done)$ && ! "$s" =~ ^(approved|done)$ ]] && { echo "✗ $n: plan approved before spec"; fail=1; }
  return 0
}
if [[ "${1:-}" == "--current" ]]; then
  d="$(scripts/current-change.sh)" || { echo "✗ not on a change branch (feat/EP-123-slug)"; exit 1; }
  check "$d"
else
  for d in docs/sdlc/changes/*/; do [[ -d "$d" ]] && check "${d%/}"; done
fi
[[ $fail -eq 0 ]] && echo "✓ artifact chain OK"
exit $fail
