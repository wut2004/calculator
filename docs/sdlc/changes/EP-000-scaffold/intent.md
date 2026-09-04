---
change: EP-000
stage: plan
status: done
author: platform-team (template)
created: 2026-09-04
jira: EP-000
source: idea
supersedes:
---

# Intent — EP-000 Platform skeleton

## What do we want?
A buildable, testable, lintable repository skeleton that follows EP Digital Platform conventions,
so that the first feature change starts with a green feedback loop and a structure CLAUDE.md can refer to.

## Why?
Agents need something to check their work against from the first diff (build, tests, lint).
A shared skeleton keeps every squad's repo shaped the same way.

## Constraints
- Must: compile and pass tests with zero features
- Must not: contain any domain / feature code — that belongs to later changes

## Out of scope
- Any business capability

## Success signal
`make test` / `nx test` green on main before EP-001 starts.

## Approval
- [x] Platform team (via template) — 2026-09-04
