---
change: EP-124
stage: design
status: approved
derived_from: intent.md
created: 2026-09-04
---

# Specification — EP-124

## Requirements
| ID     | Requirement | Source (intent §) | Verified by (test / Xray key) |
|--------|-------------|--------------------|--------------------------------|
| REQ-1  | Provide sin, cos, and tan as unary scientific functions applied to the current display value | Constraints (Must — function set) | TBD |
| REQ-2  | Provide log (base 10) and ln (natural log) as unary scientific functions | Constraints (Must — function set) | TBD |
| REQ-3  | Provide √ (square root) as a unary scientific function | Constraints (Must — function set) | TBD |
| REQ-4  | Provide x² (square) as a unary scientific function | Constraints (Must — function set) | TBD |
| REQ-5  | Provide xʸ (power) as a binary scientific function, chaining left-to-right like the existing four operators (engine `D-1`) | Constraints (Must — function set) | TBD |
| REQ-6  | Provide π and e as one-tap constants that insert their value into the display | Constraints (Must — function set) | TBD |
| REQ-7  | Provide 1/x (reciprocal) as a unary scientific function | Constraints (Must — function set) | TBD |
| REQ-8  | A Basic/Scientific mode toggle is present on the existing `Calculator` component and switches the visible button layout | Constraints (Must — mode toggle) | TBD |
| REQ-9  | Toggling mode does not reset or alter the current display value, pending operator, or stored operand | Constraints (Must — mode toggle) | TBD |
| REQ-10 | All new scientific calculations are implemented as pure functions added to `calculatorEngine.ts`, reusing the existing `CalculatorState`/reducer pattern rather than duplicating logic | Constraints (Must — reuse engine) | TBD |
| REQ-11 | No scientific calculation makes a network/backend call; all computation stays client-side | Constraints (Must not) | TBD |
| REQ-12 | The expanded (scientific) layout remains usable and readable across desktop and mobile viewport widths | Constraints (Non-functional) | TBD |
| REQ-13 | A user can toggle into scientific mode, perform a scientific calculation, get a correct result, and toggle back to basic mode without losing the current value | Success signal | TBD |

## Design
### Data model
Extend `CalculatorState` (`calculatorEngine.ts`) with one new field:
- `mode: "basic" | "scientific"` — defaults to `"basic"`, toggled independently of every other field so `display`, `pendingOperator`, `storedOperand`, `error`, and `awaitingOperand` are untouched by mode changes (REQ-9).

No other state shape changes — scientific functions read and write the same `display`/`pendingOperator`/`storedOperand` fields the basic engine already uses.

### API / interfaces
- `applyToggleMode(state): CalculatorState` — flips `mode`, changes nothing else.
- `applyUnaryFunction(state, fn): CalculatorState` — for sin/cos/tan/log/ln/√/x²/1/x (REQ-1–4, REQ-7). Parses `display` as the operand, computes the result, and writes it back to `display` via the existing `formatDisplay`. Per **F-1** below, `pendingOperator`/`storedOperand` are left untouched and `awaitingOperand` is set to `true`, so a unary function behaves like a completed sub-result: `5 + 9 √ =` → `8`.
- `applyConstant(state, value): CalculatorState` — for π/e (REQ-6). Same F-1 semantics as a unary function: replaces `display` with the constant's formatted value, sets `awaitingOperand: true`, leaves any pending operator/operand alone.
- `Operator` type extended with `"^"` (xʸ, REQ-5), handled by the existing `applyOperator`/`compute` path so it inherits the current left-to-right chaining (D-1) and divide-by-zero-style error handling (D-2) for free.
- Domain errors (asin/acos-style out-of-domain inputs don't apply to sin/cos/tan/x² which are total functions, but log/ln of a non-positive number, √ of a negative number, and 1/0 are undefined) route through the **same error state** `compute` already uses for divide-by-zero (D-2): `display: "Error"`, `error: true`, frozen until `applyClear`. See open question below for confirmation.

### UI (if any)
`Calculator.tsx` gains:
- A mode toggle button (e.g. "Basic" / "Scientific" pill) above or beside the display, calling `applyToggleMode`.
- A second button row/panel (sin, cos, tan, log, ln, √, x², xʸ, π, e, 1/x) rendered only when `state.mode === "scientific"`, reusing the existing `calculator__button` styling with a new `calculator__button--scientific` modifier for `Calculator.css`.
- The existing digit/operator/clear/equals grid is unchanged and always visible in both modes.

### Integration points
No new integration points — still mounted the same way in `frontend/src/App.tsx`; no new files outside `frontend/src/features/calculator/`.

## Risks & open questions
- **Angle unit (deg vs rad) — needs confirmation before build.** Intent explicitly deferred this to the spec and scoped deg/rad *switching* out, but sin/cos/tan still need a fixed default. `Math.sin`/`cos`/`tan` are radians-native, but most calculator-app users expect degrees by default. **Proposed default: degrees** (convert to radians internally before calling `Math`), since that matches common calculator UX more closely than JS's native unit — flagging for confirmation, not locking in as a business rule.
- **Domain-error handling — needs confirmation.** Proposing that log/ln of a non-positive number, √ of a negative number, and 1/0 all route to the existing error state (D-2 pattern) rather than a distinct message. Flagging in case a different UX (e.g. "undefined" vs generic "Error") is wanted.
- **F-1 (unary-function/constant result semantics) — needs confirmation.** Proposing that applying a unary function or inserting a constant behaves like a completed sub-result (updates `display`, sets `awaitingOperand: true`, preserves any pending operator/operand) so it can participate in a chained calculation. An alternative reading of intent would treat it as a terminal action equivalent to pressing `=`. Flagging for confirmation before build.
- **Keyboard input for scientific functions.** Intent's original keyboard requirement (EP-123 REQ-4) only covers digits/operators/Enter/Escape. Intent for this change doesn't mention keyboard shortcuts for the new scientific functions, so none are added — scientific functions are mouse/touch-only via the new buttons. Flagging in case keyboard parity is expected.
- **Precision of irrational results.** Existing `formatDisplay` (D-3) caps at 12 significant digits / falls back to exponential notation; scientific results (e.g. `sin(30°)` in floating point) reuse this unchanged. No new precision rule proposed.

## Approval
- [x] Tech lead: wuttichaisrisuk  date: 2026-09-04
