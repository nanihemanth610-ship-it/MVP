import { describe, it, expect } from "vitest";
import { reconcileBill, roundToCents } from "./arithmetic-engine";
import type { LineItem } from "@/types/claim";

describe("roundToCents", () => {
  it("rounds floating point values accurately without IEEE 754 drift", () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    expect(roundToCents(10.005)).toBe(10.01);
    expect(roundToCents(123.456)).toBe(123.46);
  });
});

describe("reconcileBill", () => {
  const cleanLineItems: LineItem[] = [
    {
      id: "item-1",
      code: "99285",
      description: "Emergency dept visit, high severity",
      quantity: 1,
      unitPrice: 1250.0,
      totalPrice: 1250.0,
      confidence: "high",
      confidenceScore: 0.98,
    },
    {
      id: "item-2",
      code: "70450",
      description: "CT head/brain without contrast",
      quantity: 1,
      unitPrice: 850.5,
      totalPrice: 850.5,
      confidence: "high",
      confidenceScore: 0.96,
    },
    {
      id: "item-3",
      code: "80053",
      description: "Comprehensive metabolic panel",
      quantity: 2,
      unitPrice: 45.0,
      totalPrice: 90.0,
      confidence: "high",
      confidenceScore: 0.99,
    },
  ];

  it("reconciles cleanly when itemized sum matches claimed total exactly", () => {
    // 1250.00 + 850.50 + 90.00 = 2190.50
    const result = reconcileBill(2190.5, cleanLineItems);

    expect(result.isReconciled).toBe(true);
    expect(result.calculatedTotal).toBe(2190.5);
    expect(result.claimedTotal).toBe(2190.5);
    expect(result.variance).toBe(0);
    expect(result.discrepancies.length).toBe(0);
  });

  it("flags variance discrepancy when claimed total does not match line item sum", () => {
    // Stated bill total is $2340.50 (an extra $150 discrepancy)
    const result = reconcileBill(2340.5, cleanLineItems);

    expect(result.isReconciled).toBe(false);
    expect(result.calculatedTotal).toBe(2190.5);
    expect(result.claimedTotal).toBe(2340.5);
    expect(result.variance).toBe(-150.0);
    expect(
      result.discrepancies.some((d) => d.type === "arithmetic_mismatch"),
    ).toBe(true);
  });

  it("detects line item level arithmetic mismatch (quantity * unitPrice !== totalPrice)", () => {
    const erroneousItem: LineItem = {
      id: "item-bad-math",
      code: "99214",
      description: "Office visit level 4",
      quantity: 3,
      unitPrice: 100.0,
      totalPrice: 350.0, // 3 * 100 = 300, not 350
      confidence: "medium",
      confidenceScore: 0.75,
    };

    const result = reconcileBill(350.0, [erroneousItem]);

    const mathError = result.discrepancies.find(
      (d) =>
        d.type === "line_item_math_error" && d.lineItemId === "item-bad-math",
    );
    expect(mathError).toBeDefined();
    expect(mathError?.severity).toBe("error");
    expect(mathError?.expectedValue).toBe(300.0);
    expect(mathError?.actualValue).toBe(350.0);
  });

  it("flags warning for missing or unmapped medical procedure codes", () => {
    const unmappedItem: LineItem[] = [
      {
        id: "item-no-code",
        code: "",
        description: "Miscellaneous medical supply kit",
        quantity: 1,
        unitPrice: 75.0,
        totalPrice: 75.0,
        confidence: "low",
        confidenceScore: 0.45,
      },
    ];

    const result = reconcileBill(75.0, unmappedItem);
    const codeError = result.discrepancies.find(
      (d) => d.type === "missing_code",
    );
    expect(codeError).toBeDefined();
    expect(codeError?.severity).toBe("warning");
  });

  it("flags duplicate procedure codes for unbundling verification", () => {
    const duplicateItems: LineItem[] = [
      {
        id: "item-dup-1",
        code: "99285",
        description: "ED visit initial evaluation",
        quantity: 1,
        unitPrice: 500.0,
        totalPrice: 500.0,
        confidence: "high",
        confidenceScore: 0.95,
      },
      {
        id: "item-dup-2",
        code: "99285",
        description: "ED visit re-evaluation",
        quantity: 1,
        unitPrice: 500.0,
        totalPrice: 500.0,
        confidence: "high",
        confidenceScore: 0.95,
      },
    ];

    const result = reconcileBill(1000.0, duplicateItems);
    const dupWarning = result.discrepancies.find(
      (d) => d.type === "duplicate_item",
    );
    expect(dupWarning).toBeDefined();
    expect(dupWarning?.severity).toBe("info");
  });
});
