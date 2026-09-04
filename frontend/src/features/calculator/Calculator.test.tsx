import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Calculator } from "./Calculator";
// Raw source text, for the static "no backend imports" check below (step 10).
import engineSource from "./calculatorEngine.ts?raw";
import componentSource from "./Calculator.tsx?raw";

/** Button labels in on-screen order (step 7: expected accessible names). */
const EXPECTED_BUTTON_NAMES = [
  "7",
  "8",
  "9",
  "÷",
  "4",
  "5",
  "6",
  "×",
  "1",
  "2",
  "3",
  "−",
  "AC",
  "0",
  ".",
  "+",
  "=",
];

function display(): string {
  return screen.getByTestId("calculator-display").textContent ?? "";
}

function click(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function pressKey(root: HTMLElement, key: string): void {
  fireEvent.keyDown(root, { key });
}

describe("REQ-5 / REQ-1 / REQ-2 / REQ-3: rendering and mouse interaction", () => {
  test("clicking 7 × 8 = shows 56", () => {
    render(<Calculator />);
    click("7");
    click("×");
    click("8");
    click("=");
    expect(display()).toBe("56");
  });

  test("clicking 1 . 5 + 1 . 5 = shows 3", () => {
    render(<Calculator />);
    click("1");
    click(".");
    click("5");
    click("+");
    click("1");
    click(".");
    click("5");
    click("=");
    expect(display()).toBe("3");
  });

  test("clicking AC mid-entry returns display to 0", () => {
    render(<Calculator />);
    click("1");
    click("2");
    click("+");
    click("AC");
    expect(display()).toBe("0");
  });
});

describe("REQ-4: keyboard interaction", () => {
  test("typing 12+3 then Enter shows 15", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    pressKey(root, "1");
    pressKey(root, "2");
    pressKey(root, "+");
    pressKey(root, "3");
    pressKey(root, "Enter");
    expect(display()).toBe("15");
  });

  test("Escape resets to 0", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    pressKey(root, "5");
    pressKey(root, "Escape");
    expect(display()).toBe("0");
  });

  test("Backspace resets to 0", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    pressKey(root, "7");
    pressKey(root, "Backspace");
    expect(display()).toBe("0");
  });

  test("unrelated keys (e.g. 'a') leave the display unchanged", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    pressKey(root, "9");
    expect(display()).toBe("9");
    pressKey(root, "a");
    expect(display()).toBe("9");
  });

  test("keydown listener is removed on unmount", () => {
    const { container, unmount } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    const removeSpy = vi.spyOn(root, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});

describe("REQ-7: button grid", () => {
  test("renders exactly the expected buttons with accessible names", () => {
    render(<Calculator />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(EXPECTED_BUTTON_NAMES.length);
    for (const name of EXPECTED_BUTTON_NAMES) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});

describe("REQ-6: responsive layout", () => {
  test("root element carries the responsive container class and no inline fixed width", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.style.width).toBe("");
  });
});

describe("REQ-5: no backend calls", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("a full session (mouse and keyboard) never calls fetch", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;

    click("8");
    click("÷");
    click("2");
    click("=");
    expect(display()).toBe("4");

    click("AC");
    expect(display()).toBe("0");

    pressKey(root, "9");
    pressKey(root, "+");
    pressKey(root, "1");
    pressKey(root, "Enter");
    expect(display()).toBe("10");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("no source file in the calculator feature imports from frontend/src/api or calls fetch/XMLHttpRequest directly", () => {
    for (const source of [engineSource, componentSource]) {
      expect(source).not.toMatch(/from\s+["'].*\/api/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
    }
  });
});

describe("REQ-8 / REQ-1 / REQ-4: end-to-end chained calculation (mouse + keyboard)", () => {
  test("2 + 3 × 4 = (buttons, left-to-right) -> 20, then keyboard ÷ 4 = -> 5, then AC -> 0", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;

    click("2");
    click("+");
    click("3");
    click("×");
    click("4");
    click("=");
    expect(display()).toBe("20");

    pressKey(root, "/");
    pressKey(root, "4");
    pressKey(root, "=");
    expect(display()).toBe("5");

    click("AC");
    expect(display()).toBe("0");
  });
});
