Start or refine a change. Input: $ARGUMENTS (a Jira key + description, or a ticket paste).

1. If `scripts/current-change.sh` fails, derive KEY and a short kebab slug from the input and run
   `scripts/new-change.sh KEY slug` (ask the user to confirm KEY/slug first).
2. Fill the change's intent.md. Keep the template structure. Ask up to 3 clarifying questions if
   "why" or constraints are missing. Do not set status: approved — a human does that.
