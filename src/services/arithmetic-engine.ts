/**
 * BillBridge Arithmetic Reconciliation Engine
 * Pure mathematical reconciliation functions to detect billing discrepancies,
 * calculation mismatches, and code validation issues with zero floating point drift.
 */

import type { LineItem, Discrepancy } from "@/types/claim";

/**
 * Rounds a number to exactly 2 decimal places to avoid IEEE 754 floating point issues.
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface ReconciliationResult {
  claimedTotal: number;
  calculatedTotal: number;
  variance: number; // calculatedTotal - claimedTotal
  isReconciled: boolean;
  discrepancies: Discrepancy[];
  itemCount: number;
}

/**
 * Reconciles a list of line items against a claimed total from the bill.
 */
export function reconcileBill(
  claimedTotal: number,
  lineItems: LineItem[],
): ReconciliationResult {
  const roundedClaimed = roundToCents(claimedTotal);
  const discrepancies: Discrepancy[] = [];

  let runningSum = 0;
  const seenCodes = new Map<string, number>();

  for (const item of lineItems) {
    const itemRoundedTotal = roundToCents(item.totalPrice);
    const expectedItemTotal = roundToCents(item.quantity * item.unitPrice);

    // 1. Check line-item level arithmetic (qty * rate === total)
    if (Math.abs(expectedItemTotal - itemRoundedTotal) > 0.01) {
      discrepancies.push({
        id: `disc-math-${item.id}`,
        type: "line_item_math_error",
        severity: "error",
        lineItemId: item.id,
        field: "totalPrice",
        message: `Line item "${item.description}" math mismatch: ${item.quantity} × $${item.unitPrice.toFixed(
          2,
        )} = $${expectedItemTotal.toFixed(2)}, but billed as $${itemRoundedTotal.toFixed(2)}.`,
        expectedValue: expectedItemTotal,
        actualValue: itemRoundedTotal,
        suggestedFix: `Update total to $${expectedItemTotal.toFixed(2)} or check unit price.`,
      });
    }

    // 2. Check for missing or unknown medical codes
    if (
      !item.code ||
      item.code.trim() === "" ||
      item.code.toUpperCase() === "UNKNOWN"
    ) {
      discrepancies.push({
        id: `disc-code-${item.id}`,
        type: "missing_code",
        severity: "warning",
        lineItemId: item.id,
        field: "code",
        message: `Line item "${item.description}" is missing an official CPT/HCPCS procedure code.`,
        suggestedFix:
          "Assign appropriate CPT-4 or HCPCS code before insurer submission.",
      });
    }

    // 3. Track duplicates for unbundling / repeat charges
    if (item.code && item.code.trim() !== "") {
      const normalizedCode = item.code.trim().toUpperCase();
      const priorCount = seenCodes.get(normalizedCode) ?? 0;
      seenCodes.set(normalizedCode, priorCount + 1);

      if (priorCount > 0) {
        discrepancies.push({
          id: `disc-dup-${item.id}`,
          type: "duplicate_item",
          severity: "info",
          lineItemId: item.id,
          field: "code",
          message: `Code ${item.code} appears multiple times on this claim. Verify this is not duplicate billing.`,
          suggestedFix:
            "Review medical records to confirm distinct sessions or append appropriate modifier (e.g. -59).",
        });
      }
    }

    runningSum += itemRoundedTotal;
  }

  const calculatedTotal = roundToCents(runningSum);
  const variance = roundToCents(calculatedTotal - roundedClaimed);
  const isReconciled = Math.abs(variance) < 0.01;

  // 4. Overall arithmetic variance check
  if (!isReconciled) {
    const isHigher = variance > 0;
    const diffAbs = Math.abs(variance).toFixed(2);
    discrepancies.unshift({
      id: `disc-variance-${Date.now()}`,
      type: "arithmetic_mismatch",
      severity: "error",
      message: `Billed statement total ($${roundedClaimed.toFixed(
        2,
      )}) does not match the sum of itemized charges ($${calculatedTotal.toFixed(
        2,
      )}). Variance of $${diffAbs} ${isHigher ? "overcharge" : "undercharge"} detected.`,
      expectedValue: roundedClaimed,
      actualValue: calculatedTotal,
      suggestedFix: isHigher
        ? `Itemized charges exceed stated bill total by $${diffAbs}. Review line items for erroneous entries.`
        : `Bill total exceeds itemized charges by $${diffAbs}. A line item may have been omitted during OCR extraction.`,
    });
  }

  return {
    claimedTotal: roundedClaimed,
    calculatedTotal,
    variance,
    isReconciled,
    discrepancies,
    itemCount: lineItems.length,
  };
}
