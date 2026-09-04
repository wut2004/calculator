/**
 * Pure calculator engine.
 *
 * No React, no DOM, no I/O — just state in, state out. All arithmetic rules
 * (REQ-1, REQ-2, REQ-3, REQ-8) live here so they can be exhaustively unit
 * tested independently of rendering. Scientific rules added in EP-124
 * (REQ-1–REQ-10) follow the same pattern.
 *
 * D-1: chained operations evaluate strictly left-to-right (classic
 * four-function desk calculator), not by mathematical operator precedence.
 * xʸ (`"^"`) reuses this path unchanged.
 * D-2: dividing by zero puts the engine into an error state; every input
 * other than `applyClear` is then ignored until the engine is reset. Domain
 * errors from scientific functions (S-2) route through the same state shape.
 * D-3: `formatDisplay` caps rendered results at 12 significant digits and
 * falls back to exponential notation beyond that, purely so the display
 * never overflows — not a precision/rounding business rule.
 * S-1: `sin`/`cos`/`tan` treat their operand as **degrees**, converting to
 * radians internally before calling `Math`, since `Math` is radians-native
 * but calculator-app users expect degrees by default.
 * S-2: scientific domain errors (log/ln of a non-positive number, √ of a
 * negative number, 1/0, or any other non-finite result) reuse the D-2 error
 * state rather than a distinct "undefined" message.
 * S-3: a unary function or constant press behaves like a completed
 * sub-result — it updates `display` and sets `awaitingOperand: true`, but
 * leaves `pendingOperator`/`storedOperand` untouched, so it can chain into an
 * in-progress calculation (`5 + 9 √ =` -> `8`). It is not equivalent to `=`.
 */

export type Operator = "+" | "-" | "×" | "÷" | "^";

/** Scientific unary functions (REQ-1–4, REQ-7), applied to the current display value. */
export type UnaryFunction =
  | "sin"
  | "cos"
  | "tan"
  | "log"
  | "ln"
  | "sqrt"
  | "square"
  | "reciprocal";

/** One-tap scientific constants (REQ-6). */
export type Constant = "pi" | "e";

export interface CalculatorState {
  /** The current on-screen value, as a string (so partial entries like "1." can be represented). */
  display: string;
  /** The operator waiting to be applied once the next operand is complete, if any. */
  pendingOperator: Operator | null;
  /** The left-hand operand accumulated so far for the pending operator, if any. */
  storedOperand: number | null;
  /** True once a divide-by-zero (or other invalid) result has occurred; input is frozen until `applyClear`. */
  error: boolean;
  /**
   * Internal bookkeeping: true when the next digit/decimal press should start a brand-new
   * operand (e.g. right after an operator or after `=`) rather than append to `display`.
   */
  awaitingOperand: boolean;
  /** Which button layout is visible: the EP-123 four-function grid, or that grid plus the scientific panel. */
  mode: "basic" | "scientific";
}

export const initialState: CalculatorState = {
  display: "0",
  pendingOperator: null,
  storedOperand: null,
  error: false,
  awaitingOperand: false,
  mode: "basic",
};

const MAX_SIGNIFICANT_DIGITS = 12;

/** Applies one binary arithmetic operation. Returns `null` on divide-by-zero or a non-finite result (D-2, S-2). */
function compute(a: number, b: number, operator: Operator): number | null {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? null : a / b;
    case "^": {
      const result = Math.pow(a, b);
      return Number.isFinite(result) ? result : null;
    }
  }
}

/** Converts degrees to radians for trig functions (S-1). */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Applies one scientific unary function. Returns `null` for out-of-domain or non-finite results (S-2). */
function computeUnary(operand: number, fn: UnaryFunction): number | null {
  let result: number;

  switch (fn) {
    case "sin":
      result = Math.sin(toRadians(operand));
      break;
    case "cos":
      result = Math.cos(toRadians(operand));
      break;
    case "tan":
      result = Math.tan(toRadians(operand));
      break;
    case "log":
      if (operand <= 0) {
        return null;
      }
      result = Math.log10(operand);
      break;
    case "ln":
      if (operand <= 0) {
        return null;
      }
      result = Math.log(operand);
      break;
    case "sqrt":
      if (operand < 0) {
        return null;
      }
      result = Math.sqrt(operand);
      break;
    case "square":
      result = operand * operand;
      break;
    case "reciprocal":
      if (operand === 0) {
        return null;
      }
      result = 1 / operand;
      break;
  }

  return Number.isFinite(result) ? result : null;
}

/**
 * Formats a numeric result for display: trims binary floating-point artefacts
 * (`0.1 + 0.2` renders as `"0.3"`, not `"0.30000000000000004"`), and caps the
 * output at `MAX_SIGNIFICANT_DIGITS` significant digits, falling back to
 * exponential notation for values that would otherwise exceed that cap (D-3).
 */
export function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) {
    return "Error";
  }
  if (value === 0) {
    return "0";
  }

  const rounded = Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS));
  const magnitude = Math.abs(rounded);

  const tooLarge = magnitude >= 10 ** MAX_SIGNIFICANT_DIGITS;
  const tooSmall = magnitude < 1e-6;

  if (tooLarge || tooSmall) {
    return rounded.toExponential(6);
  }

  return rounded.toString();
}

/** Enters a single digit ("0"-"9") or a decimal point ("."). All other input is ignored while in error state. */
export function applyDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.error) {
    return state;
  }

  if (digit === ".") {
    if (state.awaitingOperand) {
      return { ...state, display: "0.", awaitingOperand: false };
    }
    if (state.display.includes(".")) {
      return state;
    }
    return { ...state, display: `${state.display}.` };
  }

  if (state.awaitingOperand) {
    return { ...state, display: digit, awaitingOperand: false };
  }
  if (state.display === "0") {
    return { ...state, display: digit };
  }
  return { ...state, display: state.display + digit };
}

/**
 * Applies an operator. If another operator is already pending and the user has entered a new
 * operand since (`!awaitingOperand`), the pending calculation is resolved first, left-to-right
 * (D-1), before the new operator is queued. Pressing an operator twice in a row (no operand typed
 * in between) simply replaces the pending operator.
 */
export function applyOperator(state: CalculatorState, operator: Operator): CalculatorState {
  if (state.error) {
    return state;
  }

  const currentValue = Number.parseFloat(state.display);

  if (state.pendingOperator !== null && state.storedOperand !== null && !state.awaitingOperand) {
    const result = compute(state.storedOperand, currentValue, state.pendingOperator);
    if (result === null) {
      return {
        display: "Error",
        pendingOperator: null,
        storedOperand: null,
        error: true,
        awaitingOperand: false,
        mode: state.mode,
      };
    }
    return {
      display: formatDisplay(result),
      pendingOperator: operator,
      storedOperand: result,
      error: false,
      awaitingOperand: true,
      mode: state.mode,
    };
  }

  return {
    ...state,
    pendingOperator: operator,
    storedOperand: currentValue,
    awaitingOperand: true,
  };
}

/** Resolves the pending operation, if any, and shows the result. Divide-by-zero sets the error state (D-2). */
export function applyEquals(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }
  if (state.pendingOperator === null || state.storedOperand === null) {
    return state;
  }

  const currentValue = Number.parseFloat(state.display);
  const result = compute(state.storedOperand, currentValue, state.pendingOperator);

  if (result === null) {
    return {
      display: "Error",
      pendingOperator: null,
      storedOperand: null,
      error: true,
      awaitingOperand: false,
      mode: state.mode,
    };
  }

  return {
    display: formatDisplay(result),
    pendingOperator: null,
    storedOperand: null,
    error: false,
    awaitingOperand: true,
    mode: state.mode,
  };
}

/**
 * Resets the engine to its initial state (AC / all-clear). Always allowed, even while in error.
 * The current `mode` is preserved — AC clears the maths, not the visible button layout.
 */
export function applyClear(state: CalculatorState): CalculatorState {
  return { ...initialState, mode: state.mode };
}

/** Flips between "basic" and "scientific" mode. Changes nothing else (REQ-8, REQ-9). */
export function applyToggleMode(state: CalculatorState): CalculatorState {
  return { ...state, mode: state.mode === "basic" ? "scientific" : "basic" };
}

/**
 * Applies a scientific unary function (sin/cos/tan/log/ln/√/x²/1/x) to the current display value
 * (REQ-1, REQ-2, REQ-3, REQ-4, REQ-7). Per S-3, the result is a completed sub-result: `display` is
 * replaced and `awaitingOperand` is set to `true`, while any `pendingOperator`/`storedOperand` are
 * left untouched so the result can chain into an in-progress calculation. A no-op while `error` is
 * true (D-2 freeze). Domain errors (S-2) produce the same error-state shape `compute` already uses
 * for divide-by-zero.
 */
export function applyUnaryFunction(state: CalculatorState, fn: UnaryFunction): CalculatorState {
  if (state.error) {
    return state;
  }

  const operand = Number.parseFloat(state.display);
  const result = computeUnary(operand, fn);

  if (result === null) {
    return {
      ...state,
      display: "Error",
      pendingOperator: null,
      storedOperand: null,
      error: true,
      awaitingOperand: false,
    };
  }

  return {
    ...state,
    display: formatDisplay(result),
    awaitingOperand: true,
  };
}

/**
 * Inserts the π or e constant into the display (REQ-6), with the same S-3 semantics as
 * `applyUnaryFunction`: replaces the current entry, sets `awaitingOperand: true`, and leaves any
 * pending operator/operand untouched so the constant can be used as an operand in a chained
 * calculation (`2 × π =`). A no-op while `error` is true (D-2 freeze).
 */
export function applyConstant(state: CalculatorState, constant: Constant): CalculatorState {
  if (state.error) {
    return state;
  }

  const value = constant === "pi" ? Math.PI : Math.E;

  return {
    ...state,
    display: formatDisplay(value),
    awaitingOperand: true,
  };
}
