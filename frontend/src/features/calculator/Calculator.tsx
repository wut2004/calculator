import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyClear,
  applyDigit,
  applyEquals,
  applyOperator,
  initialState,
  type CalculatorState,
  type Operator,
} from "./calculatorEngine";
import "./Calculator.css";

interface DigitButton {
  kind: "digit";
  label: string;
  value: string;
}

interface OperatorButton {
  kind: "operator";
  label: string;
  value: Operator;
}

interface ActionButton {
  kind: "equals" | "clear";
  label: string;
}

type CalculatorButton = DigitButton | OperatorButton | ActionButton;

const BUTTON_LAYOUT: ReadonlyArray<CalculatorButton> = [
  { kind: "digit", label: "7", value: "7" },
  { kind: "digit", label: "8", value: "8" },
  { kind: "digit", label: "9", value: "9" },
  { kind: "operator", label: "÷", value: "÷" },
  { kind: "digit", label: "4", value: "4" },
  { kind: "digit", label: "5", value: "5" },
  { kind: "digit", label: "6", value: "6" },
  { kind: "operator", label: "×", value: "×" },
  { kind: "digit", label: "1", value: "1" },
  { kind: "digit", label: "2", value: "2" },
  { kind: "digit", label: "3", value: "3" },
  { kind: "operator", label: "−", value: "-" },
  { kind: "clear", label: "AC" },
  { kind: "digit", label: "0", value: "0" },
  { kind: "digit", label: ".", value: "." },
  { kind: "operator", label: "+", value: "+" },
  { kind: "equals", label: "=" },
];

/** Maps a keyboard `key` to the digit/decimal-point character the engine expects, if any. */
function digitFromKey(key: string): string | null {
  if (/^[0-9]$/.test(key) || key === ".") {
    return key;
  }
  return null;
}

/** Maps a keyboard `key` to the engine operator it represents, if any. */
function operatorFromKey(key: string): Operator | null {
  switch (key) {
    case "+":
      return "+";
    case "-":
      return "-";
    case "*":
      return "×";
    case "/":
      return "÷";
    default:
      return null;
  }
}

/** Self-contained four-function calculator. No props, no network calls (REQ-5). */
export function Calculator() {
  const [state, setState] = useState<CalculatorState>(initialState);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleDigit = useCallback((digit: string): void => {
    setState((current) => applyDigit(current, digit));
  }, []);

  const handleOperator = useCallback((operator: Operator): void => {
    setState((current) => applyOperator(current, operator));
  }, []);

  const handleEquals = useCallback((): void => {
    setState((current) => applyEquals(current));
  }, []);

  const handleClear = useCallback((): void => {
    setState((current) => applyClear(current));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      const { key } = event;

      if (key === "Escape" || key === "Backspace") {
        event.preventDefault();
        handleClear();
        return;
      }
      if (key === "Enter" || key === "=") {
        event.preventDefault();
        handleEquals();
        return;
      }

      const operator = operatorFromKey(key);
      if (operator) {
        event.preventDefault();
        handleOperator(operator);
        return;
      }

      const digit = digitFromKey(key);
      if (digit !== null) {
        event.preventDefault();
        handleDigit(digit);
      }
    }

    root.addEventListener("keydown", onKeyDown);
    root.focus();
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [handleClear, handleDigit, handleEquals, handleOperator]);

  return (
    <div className="calculator" ref={rootRef} tabIndex={0}>
      <div className="calculator__display" data-testid="calculator-display" aria-live="polite">
        {state.display}
      </div>
      <div className="calculator__grid">
        {BUTTON_LAYOUT.map((button) => {
          if (button.kind === "digit") {
            return (
              <button
                key={button.label}
                type="button"
                className="calculator__button calculator__button--digit"
                onClick={() => handleDigit(button.value)}
              >
                {button.label}
              </button>
            );
          }
          if (button.kind === "operator") {
            return (
              <button
                key={button.label}
                type="button"
                className="calculator__button calculator__button--operator"
                onClick={() => handleOperator(button.value)}
              >
                {button.label}
              </button>
            );
          }
          if (button.kind === "clear") {
            return (
              <button
                key={button.label}
                type="button"
                className="calculator__button calculator__button--clear"
                onClick={handleClear}
              >
                {button.label}
              </button>
            );
          }
          return (
            <button
              key={button.label}
              type="button"
              className="calculator__button calculator__button--equals"
              onClick={handleEquals}
            >
              {button.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
