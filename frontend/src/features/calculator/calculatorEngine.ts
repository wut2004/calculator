/**
 * Pure calculator engine.
 *
 * No React, no DOM, no I/O — just state in, state out. All arithmetic rules
 * (REQ-1, REQ-2, REQ-3, REQ-8) live here so they can be exhaustively unit
 * tested independently of rendering.
 *
 * D-1: chained operations evaluate strictly left-to-right (classic
 * four-function desk calculator), not by mathematical operator precedence.
 * D-2: dividing by zero puts the engine into an error state; every input
 * other than `applyClear` is then ignored until the engine is reset.
 * D-3: `formatDisplay` caps rendered results at 12 significant digits and
 * falls back to exponential notation beyond that, purely so the display
 * never overflows — not a precision/rounding business rule.
 */

export type Operator = "+" | "-" | "×" | "÷";

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
}

export const initialState: CalculatorState = {
  display: "0",
  pendingOperator: null,
  storedOperand: null,
  error: false,
  awaitingOperand: false,
};

const MAX_SIGNIFICANT_DIGITS = 12;

/** Applies one binary arithmetic operation. Returns `null` on divide-by-zero (D-2). */
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
  }
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
      };
    }
    return {
      display: formatDisplay(result),
      pendingOperator: operator,
      storedOperand: result,
      error: false,
      awaitingOperand: true,
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
    };
  }

  return {
    display: formatDisplay(result),
    pendingOperator: null,
    storedOperand: null,
    error: false,
    awaitingOperand: true,
  };
}

/**
 * Resets the engine to its initial state (AC / all-clear). Always allowed, even while in error;
 * takes the current state only for API symmetry with the other reducers (it is otherwise unused).
 */
export function applyClear(state: CalculatorState): CalculatorState {
  void state;
  return { ...initialState };
}
