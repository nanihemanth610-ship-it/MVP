import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-theme-val">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("toggles theme and applies class to document.documentElement", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await userEvent.click(screen.getByText("Set Dark"));

    expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await userEvent.click(screen.getByText("Set Light"));
    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
