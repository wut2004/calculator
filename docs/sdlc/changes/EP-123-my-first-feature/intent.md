---
change: EP-123
stage: plan
status: done             # draft | approved | done | superseded
author: wuttichaisrisuk
created: 2026-09-04
jira: EP-123
source: ticket
supersedes:              # e.g. EP-101 (leave blank if new)
---

# Intent — EP-123

## What do we want?
A basic arithmetic calculator (add, subtract, multiply, divide, decimal point, clear)
as a standalone React component in the frontend, with a clean, modern visual design.
No backend involvement — all calculation logic runs client-side.

## Why?
This is the first feature built end-to-end through this repo's AI-native SDLC pipeline.
A small, self-contained calculator gives a low-risk way to exercise the full
intent → spec → plan → build → test → deploy loop and confirm the scaffold works
before larger features go through it.

## Constraints
- Must: support +, −, ×, ÷, decimal input, and clear/reset; keyboard input where reasonable.
- Must: be a frontend-only React/TypeScript component under `frontend/src/features/`.
- Must not: call a backend API for calculation logic.
- Non-functional: readable on both desktop and mobile viewport widths; visual styling is
  the agent's/designer's call (no existing design system to match).

## Out of scope
- Scientific functions (trig, log, exponents, etc.)
- Calculation history or memory
- Backend persistence or logging of calculations

## Success signal
A user can perform a sequence of basic arithmetic operations in the UI and get correct
results, with the component covered by passing frontend tests (`npm test`).

## Approval
- [x] Product owner: wuttichaisrisuk  date: 2026-09-04
