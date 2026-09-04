---
change: EP-123
stage: build
status: approved
derived_from: spec.md
created: 2026-09-04
---

# Implementation plan — EP-123

> Written by the agent BEFORE editing code. Approved by a human BEFORE the first diff.

## Approach (one paragraph)
Split the work into a pure TypeScript calculation engine (`calculatorEngine.ts`) and a thin
React view (`Calculator.tsx`) that renders the engine state. All calculation rules are unit
tested against the engine (fast, exhaustive); the component tests cover rendering, clicks,
keyboard input and the "no backend calls" constraint. New code lives only in
`frontend/src/features/calculator/`, plus one mount line in the existing `frontend/src/App.tsx`
(per spec § Integration points). Tests are co-located as `*.test.tsx` per CLAUDE.md and run with
`npm test` (vitest).

## Decisions carried in from spec.md (reviewer: please confirm at approval)
spec.md § Risks & open questions proposed these but explicitly flagged them "for confirmation
before build". They are encoded as steps below; if the reviewer disagrees, steps 1, 3 and 4
change and the plan must be re-approved.

| # | Question | Behaviour planned | Steps affected |
|---|----------|-------------------|----------------|
| D-1 | Order of operations for chained input (`3 + 4 × 2`) | Strict **left-to-right** evaluation (classic four-function desk calculator) → `14`, not PEMDAS `11` | 1 |
| D-2 | Divide by zero | Display `Error`; input other than clear/AC is ignored until reset (no crash, no `Infinity`/`NaN` on screen) | 3 |
| D-3 | Very large / long results (left open in spec) | Minimal guard only: results are rendered with up to 12 significant digits and fall back to exponential notation beyond that, so the display never overflows its box. **Not a business rule** — if precision/rounding matters, a human must specify it. | 4 |

## Steps
| # | Change | Files touched | Requirement | Test to add | Est. |
|---|--------|---------------|-------------|-------------|------|
| 1 | Pure engine: state shape (`display`, `pendingOperator`, `storedOperand`, `error`) + `applyDigit` / `applyOperator` / `applyEquals` reducer; chained operations evaluate **left-to-right** (D-1) | `frontend/src/features/calculator/calculatorEngine.ts` (new) | REQ-1 | `calculatorEngine.test.tsx` (new): `2+3=5`, `9-4=5`, `6×7=42`, `8÷2=4`; chained `3+4×2=14` (left-to-right, per D-1); operator pressed twice replaces the pending operator | M |
| 2 | Decimal-point entry in the engine: `.` appends to the current operand, is ignored if the operand already has one, and a leading `.` becomes `0.` | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-2 | `calculatorEngine.test.tsx`: `1 . 5` → `1.5`; `1 . 5 . 2` → `1.52` (second `.` ignored); `. 5` → `0.5`; `1.5 + 2.25 = 3.75` | S |
| 3 | Clear/AC action resets engine to initial state; divide-by-zero sets the error state and displays `Error`, and all input except clear is ignored while in error (D-2) | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-3 | `calculatorEngine.test.tsx`: AC after `7+8` returns display to `0` with no pending operator; `5 ÷ 0 =` → `Error`; digits after `Error` are ignored; AC clears the error and calculation resumes | S |
| 4 | `formatDisplay()` helper: trims float artefacts, caps at 12 significant digits, switches to exponential notation past that (D-3) | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-8 | `calculatorEngine.test.tsx`: `0.1 + 0.2 = 0.3` (no `0.30000000000000004`); a very large product renders in exponential form and is ≤ the display cap in length | S |
| 5 | `Calculator` component: display area + button grid (`0`–`9`, `.`, `+ − × ÷`, `=`, `AC`), local `useState` over the engine, no props, named export | `frontend/src/features/calculator/Calculator.tsx` (new) | REQ-5, REQ-1, REQ-2, REQ-3 | `Calculator.test.tsx` (new): clicking `7 × 8 =` shows `56`; clicking `1 . 5 + 1 . 5 =` shows `3`; clicking `AC` mid-entry returns display to `0` | M |
| 6 | Keyboard handling via a `keydown` listener on the component root: digits, `.`, `+ - * /`, `Enter` and `=` (equals), `Escape` (all-clear), `Backspace` (all-clear per spec REQ-4); listener cleaned up on unmount | `frontend/src/features/calculator/Calculator.tsx` | REQ-4 | `Calculator.test.tsx`: typing `12+3` then `Enter` shows `15`; `Escape` resets to `0`; `Backspace` resets to `0`; unrelated keys (e.g. `a`) leave the display unchanged | M |
| 7 | Styling: clean modern look — high-contrast display, consistent spacing/radii, hover/active/focus-visible states on buttons; plain CSS imported by the component | `frontend/src/features/calculator/Calculator.css` (new), `frontend/src/features/calculator/Calculator.tsx` | REQ-7 | `Calculator.test.tsx`: the grid renders exactly the expected 18 buttons with accessible names, and every button is reachable by `getByRole("button", { name })` (visual polish itself verified by the manual check in the feedback loop) | S |
| 8 | Responsive layout: CSS grid button pad with fluid sizing (`clamp()` / `min()` width, no fixed pixel width), display font scales, single-column layout holds at narrow widths | `frontend/src/features/calculator/Calculator.css` | REQ-6 | `Calculator.test.tsx`: the root element carries the responsive container class and no inline fixed `width` style (real breakpoint behaviour verified by the manual viewport check in the feedback loop) | S |
| 9 | Mount `Calculator` as the app's primary view inside the existing `app` shell | `frontend/src/App.tsx`, `frontend/src/App.test.tsx` | REQ-5, REQ-8 | `App.test.tsx` (update): app shell still renders **and** the calculator display is present, so the component is proven mountable from the root | S |
| 10 | Verify the no-backend constraint: no import from `frontend/src/api`, no `fetch`/`XMLHttpRequest` in the feature | `frontend/src/features/calculator/*` (assertion only, no new source) | REQ-5 | `Calculator.test.tsx`: spy on `globalThis.fetch` and run a full session (`8 ÷ 2 =`, `AC`, keyboard entry) asserting the spy was never called | S |
| 11 | End-to-end sequence through the UI: multi-step chained calculation using both mouse and keyboard | — (test only) | REQ-8, REQ-1, REQ-4 | `Calculator.test.tsx`: `2 + 3 × 4 =` via buttons → `20` (left-to-right, D-1); then keyboard `÷ 4 =` → `5`; then `AC` → `0` | S |

Est. key: S ≈ under 30 min, M ≈ 30–90 min.

**Tooling side-effects, called out per reviewer request (docs/sdlc/REVIEW.md hunk-mapping check):**
these three hunks don't map to a "feature" step above, but are necessary consequences of the steps
they're attached to, not scope creep:
- `frontend/tsconfig.json` (step 10): adds `"vite/client"` to `types` so the `?raw` source
  imports used by step 10's static no-backend-import check typecheck.
- `frontend/.gitignore` (steps 1–11): ignores `*.tsbuildinfo`, an artifact `tsc -b` (the
  Feedback-loop build check below) produces once TypeScript project references are built.
- `frontend/package-lock.json` (steps 1–11): first `npm install` in this scaffold generated it;
  committed for reproducible installs, standard practice.

## Feedback loop (what the agent checks itself against)
- [ ] Unit tests pass — `cd frontend && npm test` (vitest), all new `calculatorEngine.test.tsx` / `Calculator.test.tsx` cases green and the existing `App.test.tsx` still green
- [ ] Lint clean — `cd frontend && npm run lint` (eslint, zero warnings)
- [ ] Build succeeds — `cd frontend && npm run typecheck` and `npm run build` both pass (strict TS, no `any`, no unused exports)
- [ ] Contract / integration check: no backend contract exists for this change (spec § API/interfaces = none), so the equivalent check is **frontend-only**: (a) the `fetch` spy test in step 10 proves no network call, (b) `App.test.tsx` proves the component mounts from the app root, and (c) a manual `npm run dev` pass — run one chained calculation with the mouse and one with the keyboard, confirm `AC` and divide-by-zero (`Error`) behave per D-2, and eyeball the layout at ~375px and ~1280px widths for REQ-6/REQ-7

## Institutional knowledge to update
**None.** This change adds one self-contained feature under `frontend/src/features/`, which is
already the documented location in CLAUDE.md § Repository layout; it introduces no new top-level
directory, no new tool or command (`npm test` / `npm run lint` / `npm run typecheck` are already
documented), no new review tier for `REVIEW.md` (it falls under "everything else" → standard,
1 human reviewer), no ADR-worthy architectural decision, and no new skill. So: CLAUDE.md,
docs/sdlc/REVIEW.md, skills and ADRs are all **N/A — nothing goes stale**.

One follow-up that is *not* part of this change: D-3 (display precision/overflow) is still an
open product question in spec.md. If a human later fixes a real rule for it, that belongs in a
new change, not here.

## Rollback
Additive and frontend-only: no database, no migration, no schema, no API contract, no config or
feature flag, and no consumer outside this repo — so rollback is a pure code revert with no data
or compatibility cleanup.

1. Preferred: `git revert -m 1 <merge-commit>` on `main` and open the revert as its own MR.
2. Equivalent manual undo: delete `frontend/src/features/calculator/` (`calculatorEngine.ts`,
   `calculatorEngine.test.tsx`, `Calculator.tsx`, `Calculator.test.tsx`, `Calculator.css`) and
   revert `frontend/src/App.tsx` + `frontend/src/App.test.tsx` to the EP-000-scaffold versions
   (the placeholder `<main data-testid="app">calculator</main>` shell).
3. Verify after either path: `cd frontend && npm test && npm run lint && npm run build`.

Blast radius if the feature misbehaves in production: the calculator view only. No other feature
imports it, so a broken calculator cannot degrade anything else.

## Approval
- [x] Reviewer: wuttichaisrisuk  date: 2026-09-04
