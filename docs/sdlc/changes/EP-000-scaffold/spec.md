---
change: EP-000
stage: design
status: done
derived_from: intent.md
created: 2026-09-04
---

# Specification — EP-000 Platform skeleton

## Requirements
| ID    | Requirement                                              | Source (intent §) | Verified by |
|-------|----------------------------------------------------------|-------------------|-------------|
| REQ-1 | Backend exposes GET /healthz returning 200               | What              | TestHealth  |
| REQ-2 | Standard EP layout for the chosen stack (see CLAUDE.md §Repository layout) | What | tree |
| REQ-3 | Frontend workspace with an app shell and unit-test runner configured | What | frontend tests |
| REQ-4 | CI runs tests on every MR                                | Why               | .gitlab-ci.yml |

## Design
Standard EP layout — see CLAUDE.md §Stack. No business logic.

## Approval
- [x] Platform team (via template) — 2026-09-04
