import { describe, expect, test } from "vitest";
import {
  applyClear,
  applyDigit,
  applyEquals,
  applyOperator,
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
