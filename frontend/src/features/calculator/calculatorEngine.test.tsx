import { describe, expect, test } from "vitest";
import {
  applyClear,
  applyConstant,
  applyDigit,
  applyEquals,
  applyOperator,
  applyToggleMode,
  applyUnaryFunction,
  formatDisplay,
  initialState,
  type CalculatorState,
} from "./calculatorEngine";

/** Applies a sequence of digit/operator/equals presses starting from `initialState`. */
function type(...presses: Array<string>): CalculatorState {
  return presses.reduce<CalculatorState>((state, press) => {
    switch (press) {
      case "+":
      case "-":
      case "×":
      case "÷":
      case "^":
        return applyOperator(state, press);
      case "=":
        return applyEquals(state);
      default:
        return applyDigit(state, press);
    }
  }, initialState);
}

describe("REQ-1: basic arithmetic", () => {
  test("2 + 3 = 5", () => {
    expect(type("2", "+", "3", "=").display).toBe("5");
  });

  test("9 - 4 = 5", () => {
    expect(type("9", "-", "4", "=").display).toBe("5");
  });

  test("6 × 7 = 42", () => {
    expect(type("6", "×", "7", "=").display).toBe("42");
  });

  test("8 ÷ 2 = 4", () => {
    expect(type("8", "÷", "2", "=").display).toBe("4");
  });

  test("D-1: chained 3 + 4 × 2 = 14 (left-to-right, not PEMDAS 11)", () => {
    expect(type("3", "+", "4", "×", "2", "=").display).toBe("14");
  });

  test("pressing an operator twice replaces the pending operator", () => {
    const state = type("3", "+", "×", "2", "=");
    // 3 (× replaces the +) 2 = 6, not 5.
    expect(state.display).toBe("6");
    expect(state.pendingOperator).toBeNull();
  });
});

describe("REQ-2: decimal-point entry", () => {
  test("1 . 5 -> 1.5", () => {
    expect(type("1", ".", "5").display).toBe("1.5");
  });

  test("1 . 5 . 2 -> 1.52 (second '.' ignored)", () => {
    expect(type("1", ".", "5", ".", "2").display).toBe("1.52");
  });

  test(". 5 -> 0.5 (leading '.' becomes '0.')", () => {
    expect(type(".", "5").display).toBe("0.5");
  });

  test("1.5 + 2.25 = 3.75", () => {
    expect(type("1", ".", "5", "+", "2", ".", "2", "5", "=").display).toBe("3.75");
  });
});

describe("REQ-3: clear / AC and D-2 divide-by-zero", () => {
  test("AC after 7+8 returns display to 0 with no pending operator", () => {
    const state = applyClear(type("7", "+", "8"));
    expect(state.display).toBe("0");
    expect(state.pendingOperator).toBeNull();
    expect(state.storedOperand).toBeNull();
  });

  test("5 ÷ 0 = -> Error", () => {
    const state = type("5", "÷", "0", "=");
    expect(state.display).toBe("Error");
    expect(state.error).toBe(true);
  });

  test("digits after Error are ignored", () => {
    const errored = type("5", "÷", "0", "=");
    const afterDigit = applyDigit(errored, "7");
    const afterOperator = applyOperator(errored, "+");
    const afterEquals = applyEquals(errored);
    expect(afterDigit).toEqual(errored);
    expect(afterOperator).toEqual(errored);
    expect(afterEquals).toEqual(errored);
  });

  test("AC clears the error and calculation resumes", () => {
    const errored = type("5", "÷", "0", "=");
    const cleared = applyClear(errored);
    expect(cleared).toEqual(initialState);
    expect(applyDigit(cleared, "2").display).toBe("2");
  });
});

describe("REQ-8 / D-3: formatDisplay", () => {
  test("0.1 + 0.2 = 0.3 (no float artefacts)", () => {
    expect(type("0", ".", "1", "+", "0", ".", "2", "=").display).toBe("0.3");
  });

  test("a very large product renders in exponential form and stays within the display cap", () => {
    const huge = formatDisplay(999999999999 * 999999999999);
    expect(huge).toMatch(/e\+/);
    expect(huge.length).toBeLessThanOrEqual(20);
  });
});

describe("REQ-8 / REQ-9 / REQ-10: mode toggle (step 1)", () => {
  test("initialState defaults to basic mode", () => {
    expect(initialState.mode).toBe("basic");
  });

  test("applyToggleMode round-trips basic -> scientific -> basic", () => {
    const scientific = applyToggleMode(initialState);
    expect(scientific.mode).toBe("scientific");
    const basic = applyToggleMode(scientific);
    expect(basic.mode).toBe("basic");
  });

  test("toggling mid-calculation leaves every other field untouched (REQ-9)", () => {
    const midCalculation = type("5", "+");
    expect(midCalculation.display).toBe("5");
    expect(midCalculation.pendingOperator).toBe("+");
    const toggled = applyToggleMode(midCalculation);
    expect(toggled.display).toBe(midCalculation.display);
    expect(toggled.pendingOperator).toBe(midCalculation.pendingOperator);
    expect(toggled.storedOperand).toBe(midCalculation.storedOperand);
    expect(toggled.error).toBe(midCalculation.error);
    expect(toggled.awaitingOperand).toBe(midCalculation.awaitingOperand);
    expect(toggled.mode).toBe("scientific");
  });

  test("applyClear on a scientific-mode state resets values but keeps mode: scientific", () => {
    const scientific = applyToggleMode(type("5", "+", "8"));
    const cleared = applyClear(scientific);
    expect(cleared.display).toBe("0");
    expect(cleared.pendingOperator).toBeNull();
    expect(cleared.storedOperand).toBeNull();
    expect(cleared.mode).toBe("scientific");
  });
});

describe("REQ-5 / REQ-10: xʸ (power) operator (step 2)", () => {
  test("2 ^ 10 = 1024", () => {
    expect(type("2", "^", "1", "0", "=").display).toBe("1024");
  });

  test("9 ^ 0.5 = 3", () => {
    expect(type("9", "^", ".", "5", "=").display).toBe("3");
  });

  test("2 ^ -2 = 0.25", () => {
    // This engine has no unary-minus button, so a negative right-hand operand for xʸ is set
    // directly on `display` (the same technique used for the domain-error tests below), rather
    // than via a keypress sequence the UI cannot actually produce.
    const withPendingPower = applyOperator(applyDigit(initialState, "2"), "^");
    const negativeExponent = { ...withPendingPower, display: "-2" };
    expect(applyEquals(negativeExponent).display).toBe("0.25");
  });

  test("chained 2 ^ 3 ^ 2 = 64 (left-to-right, D-1, not 512)", () => {
    expect(type("2", "^", "3", "^", "2", "=").display).toBe("64");
  });

  test("2 ^ 3 + 1 = 9", () => {
    expect(type("2", "^", "3", "+", "1", "=").display).toBe("9");
  });

  test("0 ^ -1 = Error (non-finite, S-2)", () => {
    const withPendingPower = applyOperator(applyDigit(initialState, "0"), "^");
    const negativeExponent = { ...withPendingPower, display: "-1" };
    const result = applyEquals(negativeExponent);
    expect(result.display).toBe("Error");
    expect(result.error).toBe(true);
  });
});

describe("REQ-1 / REQ-2 / REQ-3 / REQ-4 / REQ-7 / REQ-10: unary scientific functions (step 3)", () => {
  test("sin(30) = 0.5 (degrees, S-1)", () => {
    const state = applyUnaryFunction(type("3", "0"), "sin");
    expect(state.display).toBe("0.5");
  });

  test("cos(60) = 0.5 (degrees, S-1)", () => {
    const state = applyUnaryFunction(type("6", "0"), "cos");
    expect(state.display).toBe("0.5");
  });

  test("tan(45) = 1 (degrees, S-1)", () => {
    const state = applyUnaryFunction(type("4", "5"), "tan");
    expect(state.display).toBe("1");
  });

  test("sin(90) = 1, not 0.893... (a silent switch to radians must fail this)", () => {
    const state = applyUnaryFunction(type("9", "0"), "sin");
    expect(state.display).toBe("1");
  });

  test("log(1000) = 3", () => {
    expect(applyUnaryFunction(type("1", "0", "0", "0"), "log").display).toBe("3");
  });

  test("ln(1) = 0", () => {
    expect(applyUnaryFunction(type("1"), "ln").display).toBe("0");
  });

  test("sqrt(9) = 3", () => {
    expect(applyUnaryFunction(type("9"), "sqrt").display).toBe("3");
  });

  test("square(7) = 49", () => {
    expect(applyUnaryFunction(type("7"), "square").display).toBe("49");
  });

  test("reciprocal(4) = 0.25", () => {
    expect(applyUnaryFunction(type("4"), "reciprocal").display).toBe("0.25");
  });

  test("chaining 5 + 9 then sqrt then = -> 8 (S-3: sqrt is a sub-result, not equivalent to =)", () => {
    const midCalculation = type("5", "+", "9");
    const afterSqrt = applyUnaryFunction(midCalculation, "sqrt");
    expect(afterSqrt.display).toBe("3");
    expect(afterSqrt.pendingOperator).toBe("+");
    expect(afterSqrt.storedOperand).toBe(5);
    expect(applyEquals(afterSqrt).display).toBe("8");
  });

  test("a unary press while in error state is a no-op", () => {
    const errored = type("5", "÷", "0", "=");
    expect(applyUnaryFunction(errored, "sin")).toEqual(errored);
  });
});

describe("REQ-2 / REQ-3 / REQ-7 / REQ-10: scientific domain errors (step 4, S-2)", () => {
  test("sqrt(-4) -> Error", () => {
    const negativeFour = type("0", "-", "4", "="); // 0 - 4 = -4
    const result = applyUnaryFunction(negativeFour, "sqrt");
    expect(result.display).toBe("Error");
    expect(result.error).toBe(true);
  });

  test("log(0) and log(-5) -> Error", () => {
    expect(applyUnaryFunction(type("0"), "log").display).toBe("Error");
    const negativeFive = type("0", "-", "5", "="); // 0 - 5 = -5
    expect(applyUnaryFunction(negativeFive, "log").display).toBe("Error");
  });

  test("ln(0) and ln(-1) -> Error", () => {
    expect(applyUnaryFunction(type("0"), "ln").display).toBe("Error");
    const negativeOne = type("0", "-", "1", "="); // 0 - 1 = -1
    expect(applyUnaryFunction(negativeOne, "ln").display).toBe("Error");
  });

  test("reciprocal(0) -> Error", () => {
    const result = applyUnaryFunction(type("0"), "reciprocal");
    expect(result.display).toBe("Error");
    expect(result.error).toBe(true);
  });

  test("after a domain error, applyDigit is ignored and applyClear restores display: 0, error: false", () => {
    const errored = applyUnaryFunction(type("0"), "reciprocal");
    expect(applyDigit(errored, "7")).toEqual(errored);
    const cleared = applyClear(errored);
    expect(cleared.display).toBe("0");
    expect(cleared.error).toBe(false);
  });

  test("sin/cos/tan/square never error (total functions)", () => {
    const negativeFour = type("0", "-", "4", "="); // 0 - 4 = -4
    expect(applyUnaryFunction(negativeFour, "sin").error).toBe(false);
    expect(applyUnaryFunction(negativeFour, "cos").error).toBe(false);
    expect(applyUnaryFunction(negativeFour, "tan").error).toBe(false);
    expect(applyUnaryFunction(negativeFour, "square").error).toBe(false);
  });
});

describe("REQ-6 / REQ-10: constants (step 5)", () => {
  test("pi gives 3.14159265359 (12 significant digits, D-3)", () => {
    expect(applyConstant(initialState, "pi").display).toBe("3.14159265359");
  });

  test("e gives 2.71828182846 (12 significant digits, D-3)", () => {
    expect(applyConstant(initialState, "e").display).toBe("2.71828182846");
  });

  test("pressing pi replaces an in-progress entry rather than appending to it", () => {
    const inProgress = type("1", "2");
    expect(applyConstant(inProgress, "pi").display).toBe("3.14159265359");
  });

  test("2 x pi = uses the constant as the right-hand operand (S-3 chaining)", () => {
    const withPi = applyConstant(type("2", "×"), "pi");
    expect(applyEquals(withPi).display).toBe("6.28318530718");
  });

  test("a constant press while in error state is a no-op", () => {
    const errored = type("5", "÷", "0", "=");
    expect(applyConstant(errored, "pi")).toEqual(errored);
  });
});
