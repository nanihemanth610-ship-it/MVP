import { describe, it, expect } from "vitest";
import { LineItemSchema, ClaimRecordSchema } from "./bill-schema";
import { MOCK_CLAIM_CLEAN } from "@/data/mock-claims";

describe("bill-schema validation", () => {
  it("validates a well-formed line item successfully", () => {
    const validItem = {
      id: "item-valid-1",
      code: "99213",
      codeType: "CPT",
      description: "Office visit level 3",
      quantity: 1,
      unitPrice: 150.0,
      totalPrice: 150.0,
      confidence: "high",
      confidenceScore: 0.95,
    };

    const parsed = LineItemSchema.safeParse(validItem);
    expect(parsed.success).toBe(true);
  });

  it("fails validation if line item quantity is negative or zero", () => {
    const invalidItem = {
      id: "item-bad-qty",
      code: "99213",
      description: "Office visit",
      quantity: 0, // Must be positive
      unitPrice: 150.0,
      totalPrice: 0.0,
      confidence: "high",
      confidenceScore: 0.9,
    };

    const parsed = LineItemSchema.safeParse(invalidItem);
    expect(parsed.success).toBe(false);
  });

  it("validates a full synthetic claim record structure", () => {
    const parsed = ClaimRecordSchema.safeParse(MOCK_CLAIM_CLEAN);
    expect(parsed.success).toBe(true);
  });
});
