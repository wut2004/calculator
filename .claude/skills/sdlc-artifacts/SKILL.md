---
name: sdlc-artifacts
description: How changes, branches, and intent/spec/plan artifacts work in this repo. Use whenever a task touches docs/sdlc/ or starts/continues a change.
---
# SDLC artifacts

- One change = one folder `docs/sdlc/changes/<KEY>-<slug>/` = one branch `feat/<KEY>-<slug>`.
- Locate the current change with `scripts/current-change.sh`. If it fails, you are not on a
  change branch — ask the user, or start one with `scripts/new-change.sh`.
- Frontmatter `status` must be `approved` before the next stage starts. Never skip a stage.
- Merged changes (`status: done`) are immutable. Revisiting = new change with `supersedes:`.
- Trace IDs: intent § → REQ-n → plan step → test → MR finding. Keep them stable.
- Validate with `scripts/check-artifacts.sh --current`.
