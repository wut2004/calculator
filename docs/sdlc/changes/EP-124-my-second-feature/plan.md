---
change: EP-124
stage: build
status: approved
derived_from: spec.md
created: 2026-09-04
---

# Implementation plan — EP-124

> Written by the agent BEFORE editing code. Approved by a human BEFORE the first diff.

## Approach (one paragraph)
Extend, don't fork. All new maths lands as pure reducers in the existing
`frontend/src/features/calculator/calculatorEngine.ts` (REQ-10), so every scientific rule is unit
tested without React; `Calculator.tsx` stays a thin view that renders engine state and gains a mode
toggle plus a conditionally rendered scientific button panel; `Calculator.css` gains one modifier
class and keeps the fluid grid from EP-123. Work is sequenced engine → UI → styling so each
increment is independently reviewable and green: steps 1–5 are pure-function changes with no
rendering impact, steps 6–8 wire the UI to them, steps 9–10 cover layout and the end-to-end
success signal. No new files, no new directories, no backend (REQ-11) — the change is confined to
the four files EP-123 created.

## Decisions carried in from spec.md (reviewer: please confirm at approval)
spec.md § Risks & open questions flagged four items as *proposed defaults awaiting confirmation*.
Per the approved spec they are treated as the accepted design and are encoded in the steps below —
but they are **proposals promoted to implementation choices**, not business rules a human stated.
Each step that implements one is tagged with the S-n id so a reviewer can see exactly where the
promotion happens. If the reviewer disagrees with any row, the tagged steps change and this plan
must be re-approved.

| # | Open question (spec § Risks) | Behaviour planned | Steps affected |
|---|------------------------------|-------------------|----------------|
| S-1 | Angle unit for sin/cos/tan (deg vs rad) | **Degrees**: the operand is converted to radians (`x * Math.PI / 180`) before calling `Math.sin/cos/tan`. `Math` is radians-native, so this is a deliberate wrapper, isolated in one helper for easy reversal. | 3, 10 |
| S-2 | Domain errors (log/ln of ≤ 0, √ of a negative, 1/0, non-finite power) | Route through the **existing D-2 error state**: `display: "Error"`, `error: true`, all input except `applyClear` ignored. No distinct "undefined" message. | 2, 4 |
| S-3 | F-1: result semantics of a unary function / constant | Treated as a **completed sub-result**: writes `display`, sets `awaitingOperand: true`, leaves `pendingOperator`/`storedOperand` untouched, so it chains (`5 + 9 √ =` → `8`). Not equivalent to pressing `=`. | 3, 5, 10 |
| S-4 | Keyboard shortcuts for scientific functions | **None added.** `operatorFromKey`/`digitFromKey` in `Calculator.tsx` are deliberately left unchanged (including no `^` key for xʸ); scientific functions are pointer/touch-only via the new buttons. | 7 (explicit negative test) |

## Steps
| # | Change | Files touched | Requirement | Test to add | Est. |
|---|--------|---------------|-------------|-------------|------|
| 1 | Add `mode: "basic" \| "scientific"` to `CalculatorState` (default `"basic"` in `initialState`) and `applyToggleMode(state)` which flips only `mode`; every existing reducer preserves `mode` via its `...state` spread, and `applyClear` returns to `initialState` **keeping the current mode** (AC clears maths, not the layout) | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-8, REQ-9, REQ-10 | `calculatorEngine.test.tsx`: `initialState.mode === "basic"`; `applyToggleMode` round-trips basic→scientific→basic; toggling mid-calculation (`5 +` pending, display `9`) leaves `display`/`pendingOperator`/`storedOperand`/`error`/`awaitingOperand` byte-identical (REQ-9); `applyClear` on a scientific-mode state resets values but keeps `mode: "scientific"` | S |
| 2 | Extend `Operator` with `"^"` and add the case to `compute` (`Math.pow`), returning `null` when the result is not finite so it lands in the existing error state (**S-2**); no change to `applyOperator`/`applyEquals`, so xʸ inherits D-1 left-to-right chaining for free | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-5, REQ-10 | `calculatorEngine.test.tsx`: `2 ^ 10 =` → `1024`; `9 ^ 0.5 =` → `3`; `2 ^ -2 =` → `0.25`; chained `2 ^ 3 ^ 2 =` → `64` (left-to-right, D-1, not `512`); `2 ^ 3 + 1 =` → `9`; `0 ^ -1 =` → `Error` (non-finite, S-2) | S |
| 3 | `applyUnaryFunction(state, fn)` for `sin \| cos \| tan \| log \| ln \| sqrt \| square \| reciprocal`: parses `display`, computes, writes back through `formatDisplay`; **S-3** semantics (sets `awaitingOperand: true`, leaves `pendingOperator`/`storedOperand` alone); returns `state` unchanged while `error` is true (D-2 freeze). Trig converts degrees→radians in a single `toRadians` helper (**S-1**) | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-1, REQ-2, REQ-3, REQ-4, REQ-7, REQ-10 | `calculatorEngine.test.tsx`: `sin(30)` → `0.5`, `cos(60)` → `0.5`, `tan(45)` → `1` (degrees, S-1) and an explicit assertion that `sin(90)` → `1` not `0.893…` so a silent switch to radians fails the suite; `log(1000)` → `3`, `ln(1)` → `0`; `sqrt(9)` → `3`; `square(7)` → `49`; `reciprocal(4)` → `0.25`; chaining `5 + 9` then `sqrt` then `=` → `8` (S-3); a unary press while in error state is a no-op | M |
| 4 | Domain-error routing for the unary set (**S-2**): `log`/`ln` of a value ≤ 0, `sqrt` of a negative, `reciprocal` of 0, and any non-finite/NaN result set `display: "Error"`, `error: true`, and clear `pendingOperator`/`storedOperand` — the same shape `compute` already produces for divide-by-zero | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-2, REQ-3, REQ-7, REQ-10 | `calculatorEngine.test.tsx`: `sqrt(-4)` → `Error` with `error: true`; `log(0)`, `log(-5)`, `ln(0)`, `ln(-1)` → `Error`; `reciprocal(0)` → `Error`; after any of these, `applyDigit` is ignored and `applyClear` restores `display: "0"` with `error: false`; sin/cos/tan/square never error (total functions) | S |
| 5 | `applyConstant(state, value)` for π and e: replaces `display` with `formatDisplay(Math.PI \| Math.E)`, **S-3** semantics (`awaitingOperand: true`, pending operator/operand preserved), no-op while in error | `frontend/src/features/calculator/calculatorEngine.ts` | REQ-6, REQ-10 | `calculatorEngine.test.tsx`: π gives `3.14159265359` (12 significant digits per D-3) and e gives `2.71828182846`; pressing π replaces an in-progress entry rather than appending to it; `2 × π =` uses the constant as the right-hand operand (S-3 chaining); constant press while in error is a no-op | S |
| 6 | UI: Basic/Scientific toggle control above the display, wired to `applyToggleMode`, with an accessible name and `aria-pressed` reflecting `state.mode` | `frontend/src/features/calculator/Calculator.tsx` | REQ-8, REQ-9 | `Calculator.test.tsx`: the toggle renders with the calculator; clicking it reveals the scientific panel and clicking again hides it; entering `1 2 +` then toggling twice leaves the display at `12` and `+ 3 =` still yields `15` (REQ-9 through the UI) | M |
| 7 | UI: scientific button panel (`sin cos tan log ln √ x² xʸ π e 1/x`) rendered **only** when `state.mode === "scientific"`, dispatching to `applyUnaryFunction`/`applyConstant`/`applyOperator("^")`; the EP-123 digit/operator/clear/equals grid is untouched and visible in both modes; keyboard handler deliberately unchanged (**S-4**) | `frontend/src/features/calculator/Calculator.tsx` | REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8 | `Calculator.test.tsx`: in basic mode none of the 11 scientific buttons are in the DOM and the original 17 buttons still are; after toggling, each of the 11 is reachable via `getByRole("button", { name })`; clicking `9` then `√` shows `3`, `3 xʸ 4 =` shows `81`, `π` shows `3.14159265359`; **S-4 negative test**: typing `^` on the focused root leaves the display unchanged | M |
| 8 | Verify the no-backend constraint still holds for the scientific path (no `frontend/src/api` import, no `fetch`/`XMLHttpRequest` added) | `frontend/src/features/calculator/*` (assertion only, no new source) | REQ-11 | `Calculator.test.tsx`: extend the existing `globalThis.fetch` spy test to run a scientific session (toggle → `sin` → `π` → `xʸ` → `=` → `AC`) and assert the spy was never called; extend the existing static source check so the feature files contain no `fetch(`/`XMLHttpRequest`/`../../api` reference | S |
| 9 | Styling: `calculator__button--scientific` modifier plus a `calculator__panel--scientific` grid for the new row, reusing the EP-123 tokens (radii, spacing, hover/active/focus-visible); fluid sizing only (`clamp()`/`min()`, no fixed px width) so the wider layout reflows to a narrower per-button size on small viewports instead of overflowing | `frontend/src/features/calculator/Calculator.css`, `frontend/src/features/calculator/Calculator.tsx` | REQ-12 | `Calculator.test.tsx`: every scientific button carries both `calculator__button` and `calculator__button--scientific`; the scientific panel carries the responsive container class and no inline fixed `width` (real breakpoint behaviour verified by the manual viewport check in the feedback loop) | S |
| 10 | End-to-end success-signal sequence through the UI | — (test only) | REQ-13, REQ-9, REQ-1, REQ-6 | `Calculator.test.tsx`: start basic, enter `30`, toggle to scientific, press `sin` → `0.5` (degrees, S-1), press `+`, press `π`, press `=` → `3.64159265359`, toggle back to basic → display still `3.64159265359` and the scientific panel is gone (REQ-13); then `AC` → `0` | S |

Est. key: S ≈ under 30 min, M ≈ 30–90 min.

## Feedback loop (what the agent checks itself against)
- [ ] Unit tests pass — `cd frontend && npm test` (vitest): all new `calculatorEngine.test.tsx` / `Calculator.test.tsx` cases green **and** every EP-123 case still green unmodified (basic-mode behaviour is a regression surface for this change)
- [ ] Lint clean — `cd frontend && npm run lint` (eslint over `src`, zero warnings)
- [ ] Build succeeds — `cd frontend && npm run typecheck` and `npm run build` both pass (strict TS, no `any`; the `Operator` union widening in step 2 must not leave a non-exhaustive `switch`)
- [ ] Contract / integration check: no backend contract exists (spec § Integration points = none), so the equivalent checks are frontend-only: (a) the `fetch` spy + static source check in step 8 prove REQ-11, (b) the existing `App.test.tsx` still passes, proving the extended component mounts from the app root with no prop/API change, and (c) a manual `npm run dev` pass — toggle both ways mid-calculation (REQ-9), run `sin 30` / `log 1000` / `3 xʸ 4` / `π`, confirm `√ -4` and `ln 0` show `Error` and freeze until `AC` (S-2), and eyeball the scientific layout at ~375px and ~1280px (REQ-12)

## Institutional knowledge to update
**None — explicitly N/A, checked item by item:**
- `CLAUDE.md` § Repository layout — the change touches only existing files under
  `frontend/src/features/calculator/`, adds no file and no top-level directory, so no ADR and no
  layout note is needed.
- `CLAUDE.md` § Stack — no new tool, dependency or command; `npm test` / `npm run lint` /
  `npm run typecheck` / `npm run build` are already documented and unchanged.
- `docs/sdlc/REVIEW.md` — all touched paths fall under "everything else" → standard tier, agentic
  review required, 1 human reviewer. No new tier row, no `**/auth/**` or `**/migrations/**` path.
- Skills / ADRs — none exist for this feature and none becomes stale; D-1/D-2/D-3 from EP-123 are
  extended, not contradicted (xʸ reuses D-1 chaining, domain errors reuse D-2, irrational results
  reuse D-3 formatting unchanged).

Not part of this change, recorded so it is not silently lost: the four S-1…S-4 defaults above are
agent proposals the spec flagged for confirmation. If a human later fixes a different rule
(e.g. a deg/rad switch, or keyboard parity for scientific functions), that is a **new change**, not
an edit here — EP-124 is immutable once merged.

## Rollback
Additive and frontend-only: no database, no migration, no schema, no API contract, no config, no
feature flag, no consumer outside this repo. The one non-additive edit is the `CalculatorState`
shape (`mode` field) and the `Operator` union (`"^"`), both internal to
`frontend/src/features/calculator/` with no persisted or serialized form — nothing to migrate.

1. Preferred: `git revert -m 1 <merge-commit>` on `main`, opened as its own MR. This returns the
   calculator to the EP-123 four-function version, which is fully working on its own.
2. Partial mitigation if only the scientific surface misbehaves: the mode toggle is the kill
   switch — with `initialState.mode = "basic"` (step 1) the default view is byte-for-byte the
   EP-123 layout, so a one-line revert of the toggle button render (step 6) hides the entire
   scientific panel while leaving basic arithmetic untouched.
3. Verify after either path: `cd frontend && npm test && npm run lint && npm run build`.

Blast radius if the feature misbehaves in production: the calculator view only, and in the default
basic mode the behaviour is unchanged from EP-123. No other feature imports the engine.

## Approval
- [x] Reviewer: wuttichaisrisuk  date: 2026-09-04
