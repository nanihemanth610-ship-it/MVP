import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("resolves Tailwind conflicts in favor of the last class", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles undefined and false values", () => {
    expect(cn("base", undefined, false, "end")).toBe("base end");
  });
});

describe("formatCurrency", () => {
  it("formats a positive number as INR", () => {
    expect(formatCurrency(1500.5)).toBe("₹1,500.50");
  });

  it("formats zero as INR", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("formats a number with no decimals as whole rupees", () => {
    expect(formatCurrency(250)).toBe("₹250");
  });

  it("formats large numbers using Indian numbering system", () => {
    expect(formatCurrency(125000)).toBe("₹1,25,000");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});
