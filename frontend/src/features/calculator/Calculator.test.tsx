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

/** Accessible names of the 11 scientific-panel buttons (step 7), on-screen order. */
const EXPECTED_SCIENTIFIC_BUTTON_NAMES = [
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "√",
  "x²",
  "xʸ",
  "π",
  "e",
  "1/x",
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
  // EP-124 note: basic mode now also renders the always-visible Basic/Scientific mode toggle
  // (plan step 6), so the total button count is the EP-123 grid plus that one toggle button. The
  // EP-123 arithmetic grid itself (17 buttons, unchanged names) is still asserted unmodified below.
  test("renders exactly the expected buttons with accessible names", () => {
    render(<Calculator />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(EXPECTED_BUTTON_NAMES.length + 1);
    for (const name of EXPECTED_BUTTON_NAMES) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Scientific" })).toBeInTheDocument();
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

  // Step 8 (REQ-11): extend the fetch-spy coverage to a scientific-mode session.
  test("a scientific session (toggle -> sin -> pi -> xy -> = -> AC) never calls fetch", () => {
    render(<Calculator />);

    click("Scientific");
    click("3");
    click("0");
    click("sin");
    click("+");
    click("π");
    click("=");
    click("xʸ");
    click("2");
    click("=");
    click("AC");
    expect(display()).toBe("0");

    expect(fetchSpy).not.toHaveBeenCalled();
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

describe("REQ-8 / REQ-9: Basic/Scientific mode toggle (step 6)", () => {
  test("the toggle renders with the calculator", () => {
    render(<Calculator />);
    expect(screen.getByRole("button", { name: "Scientific" })).toBeInTheDocument();
  });

  test("has an accessible name and aria-pressed reflecting state.mode", () => {
    render(<Calculator />);
    const toggle = screen.getByRole("button", { name: "Scientific" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("clicking it reveals the scientific panel and clicking again hides it", () => {
    render(<Calculator />);
    expect(screen.queryByRole("button", { name: "sin" })).not.toBeInTheDocument();

    click("Scientific");
    expect(screen.getByRole("button", { name: "sin" })).toBeInTheDocument();

    click("Scientific");
    expect(screen.queryByRole("button", { name: "sin" })).not.toBeInTheDocument();
  });

  test("entering 12+ then toggling twice leaves the display at 12 and + 3 = still yields 15 (REQ-9)", () => {
    render(<Calculator />);
    click("1");
    click("2");
    click("+");
    expect(display()).toBe("12");

    click("Scientific");
    click("Scientific");
    expect(display()).toBe("12");

    click("3");
    click("=");
    expect(display()).toBe("15");
  });
});

describe("REQ-1 / REQ-2 / REQ-3 / REQ-4 / REQ-5 / REQ-6 / REQ-7 / REQ-8: scientific button panel (step 7)", () => {
  test("in basic mode none of the 11 scientific buttons are in the DOM and the original 17 buttons still are", () => {
    render(<Calculator />);
    for (const name of EXPECTED_SCIENTIFIC_BUTTON_NAMES) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    for (const name of EXPECTED_BUTTON_NAMES) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("after toggling, each of the 11 scientific buttons is reachable via getByRole", () => {
    render(<Calculator />);
    click("Scientific");
    for (const name of EXPECTED_SCIENTIFIC_BUTTON_NAMES) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("clicking 9 then √ shows 3", () => {
    render(<Calculator />);
    click("Scientific");
    click("9");
    click("√");
    expect(display()).toBe("3");
  });

  test("3 xʸ 4 = shows 81", () => {
    render(<Calculator />);
    click("Scientific");
    click("3");
    click("xʸ");
    click("4");
    click("=");
    expect(display()).toBe("81");
  });

  test("π shows 3.14159265359", () => {
    render(<Calculator />);
    click("Scientific");
    click("π");
    expect(display()).toBe("3.14159265359");
  });

  test("S-4 negative test: typing ^ on the focused root leaves the display unchanged", () => {
    const { container } = render(<Calculator />);
    const root = container.querySelector(".calculator") as HTMLElement;
    click("Scientific");
    click("3");
    expect(display()).toBe("3");
    pressKey(root, "^");
    expect(display()).toBe("3");
  });
});

describe("REQ-12: scientific panel styling and responsiveness (step 9)", () => {
  test("every scientific button carries both calculator__button and calculator__button--scientific", () => {
    render(<Calculator />);
    click("Scientific");
    for (const name of EXPECTED_SCIENTIFIC_BUTTON_NAMES) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("calculator__button");
      expect(button).toHaveClass("calculator__button--scientific");
    }
  });

  test("the scientific panel carries the responsive container class and no inline fixed width", () => {
    const { container } = render(<Calculator />);
    click("Scientific");
    const panel = container.querySelector(".calculator__panel--scientific") as HTMLElement;
    expect(panel).toBeInTheDocument();
    expect(panel.style.width).toBe("");
  });
});

describe("REQ-13 / REQ-9 / REQ-1 / REQ-6: end-to-end success signal (step 10)", () => {
  test("basic -> toggle to scientific -> sin(30) + π = -> toggle back to basic, value persists, panel hidden", () => {
    render(<Calculator />);

    click("3");
    click("0");
    expect(display()).toBe("30");

    click("Scientific");
    click("sin");
    expect(display()).toBe("0.5");

    click("+");
    click("π");
    click("=");
    expect(display()).toBe("3.64159265359");

    click("Scientific");
    expect(display()).toBe("3.64159265359");
    expect(screen.queryByRole("button", { name: "sin" })).not.toBeInTheDocument();

    click("AC");
    expect(display()).toBe("0");
  });
});
