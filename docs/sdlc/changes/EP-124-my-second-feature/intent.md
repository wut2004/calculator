---
change: EP-124
stage: plan
status: done             # draft | approved | done | superseded
author: wuttichaisrisuk
created: 2026-09-04
jira: EP-124
source: ticket
supersedes:              # e.g. EP-101 (leave blank if new)
---

# Intent — EP-124

## What do we want?
Extend the existing calculator (built in EP-123) with scientific calculation
functions, accessible via a mode toggle on the same component. Basic
arithmetic behavior from EP-123 is unchanged; scientific mode adds a second
row/panel of function buttons on top of it.

## Why?
EP-123 explicitly scoped out scientific functions to keep the first change
small. Now that the basic four-function calculator works end-to-end, this
change adds the scientific functions users expect from a calculator app,
without redoing the arithmetic core.

## Constraints
- Must: add a basic scientific function set: sin, cos, tan, log (base 10),
  ln (natural log), √ (square root), x² (square), xʸ (power), π and e
  constants, and 1/x (reciprocal).
- Must: add a Basic/Scientific mode toggle on the existing `Calculator`
  component (`frontend/src/features/calculator/`); toggling changes the
  visible button layout without losing the current entered value/state.
- Must: reuse and extend `calculatorEngine.ts` rather than duplicating
  calculation logic.
- Must not: call a backend API for calculation logic (frontend-only, same as
  EP-123).
- Non-functional: expanded layout remains usable and readable on both
  desktop and mobile viewport widths.

## Out of scope
- Memory functions (M+, M-, MR, MC)
- Advanced scientific functions (factorial, hyperbolic trig, permutations/
  combinations, statistics, unit conversion)
- Calculation history
- Angle unit switching (deg/rad) — default behavior to be settled in spec
- Backend persistence or logging of calculations

## Success signal
A user can toggle into scientific mode, perform a scientific calculation
(e.g. sin, log, power) and get a correct result, then toggle back to basic
mode without losing the current value — all covered by passing frontend
tests (`npm test`).

## Approval
- [x] Product owner: wuttichaisrisuk  date: 2026-09-04
