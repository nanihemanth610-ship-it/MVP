import { describe, it, expect } from "vitest";
import {
  runDeterministicAudit,
  diffAuditIssues,
  calculateCompletenessIndicator,
  roundToCents,
  getIssueSignature,
} from "./audit-engine";
import type { Claim, LineItem, ExtractionField } from "@/types/contracts";

function createMockField<T>(
  value: T,
  confidence = 0.95,
  isUnreadable = false,
): ExtractionField<T> {
  return {
    value,
    rawText: value !== null ? String(value) : null,
    status: isUnreadable
      ? "unreadable"
      : confidence < 0.7
        ? "low_confidence"
        : "readable",
    confidence,
    isUnreadable,
    isFlagged: false,
  };
}

function createMockLineItem(
  id: string,
  lineNumber: number,
  code: string,
  description: string,
  qty: number,
  unitPrice: number,
  totalPrice?: number,
  confidence = 0.95,
  serviceDate = "2026-03-14",
): LineItem {
  const calculatedTotal = roundToCents(qty * unitPrice);
  const actualTotal = totalPrice !== undefined ? totalPrice : calculatedTotal;

  return {
    id,
    lineNumber,
    code: createMockField(code, confidence),
    codeType: "CPT",
    description: createMockField(description, confidence),
    serviceDate: createMockField(serviceDate, confidence),
    quantity: createMockField(qty, confidence),
    unitPrice: createMockField(unitPrice, confidence),
    totalPrice: createMockField(actualTotal, confidence),
    expectedTotal: calculatedTotal,
    isMathMismatch: Math.abs(calculatedTotal - actualTotal) > 0.01,
  };
}

function createBaseClaim(overrides?: Partial<Claim>): Claim {
  const lineItems: LineItem[] = [
    createMockLineItem(
      "li-1",
      1,
      "99285",
      "Emergency Dept High Severity",
      1,
      1250.0,
    ),
    createMockLineItem(
      "li-2",
      2,
      "70450",
      "CT Head/Brain Without Contrast",
      1,
      850.0,
    ),
    createMockLineItem(
      "li-3",
      3,
      "80053",
      "Comprehensive Metabolic Panel",
      1,
      145.0,
    ),
  ];

  const itemizedSum = roundToCents(
    lineItems.reduce((acc, it) => acc + (it.totalPrice.value || 0), 0),
  );

  const base: Claim = {
    id: "claim-test-001",
    claimNumber: "CLM-TEST-2026",
    document: {
      id: "doc-1",
      fileName: "hospital_statement.pdf",
      fileSizeBytes: 245000,
      mimeType: "application/pdf",
      uploadedAt: "2026-03-15T10:00:00Z",
      previewUrl: "/mock/doc.pdf",
      pageCount: 1,
      documentType: "ITEMIZED_STATEMENT",
      checksumSha256: "sha256-abc123",
    },
    patient: {
      id: "pat-1",
      fullName: createMockField("Eleanor Vance"),
      dateOfBirth: createMockField("1984-06-22"),
      memberId: createMockField("MEM-987654"),
      accountNumber: createMockField("ACC-12345"),
    },
    hospital: {
      providerName: createMockField("Memorial Regional Medical Center"),
      facilityType: "emergency",
      npi: createMockField("1982736450"),
      billingAddress: createMockField("100 Hospital Way, Austin, TX"),
      statementDate: createMockField("2026-03-15"),
      admissionDate: createMockField("2026-03-14"),
      dischargeDate: createMockField("2026-03-15"),
    },
    lineItems,
    totals: {
      statedBilledTotal: createMockField(itemizedSum),
      itemizedSumTotal: itemizedSum,
      variance: 0,
      hasVariance: false,
    },
    issues: [],
    status: "extracted",
    auditLog: [],
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-15T10:00:00Z",
    isSyntheticDemo: true,
  };

  return { ...base, ...overrides };
}

describe("BillBridge Deterministic Audit Engine", () => {
  // =========================================================================
  // RULE 1: Line Item Math (quantity × rate versus line amount)
  // =========================================================================
  describe("Rule 1: Line Item Math (quantity × rate versus line amount)", () => {
    it("flags critical blocker when quantity × unitPrice does not match totalPrice", () => {
      const claim = createBaseClaim();
      // Introduce math mismatch: 2 x $400.00 = $800.00, but billed as $1,200.00
      claim.lineItems[0] = createMockLineItem(
        "li-err",
        1,
        "99285",
        "ER Level 5 Encounter",
        2,
        400.0,
        1200.0, // Mismatch!
      );

      const result = runDeterministicAudit(claim);
      const mathIssue = result.issues.find((i) => i.code === "ERR_LINE_MATH");

      expect(mathIssue).toBeDefined();
      expect(mathIssue?.severity).toBe("critical");
      expect(mathIssue?.category).toBe("line_item_math_error");
      expect(mathIssue?.fieldKey).toBe("lineItems[0].totalPrice");
      expect(mathIssue?.lineItemId).toBe("li-err");
      expect(mathIssue?.expectedValue).toBe(800.0);
      expect(mathIssue?.actualValue).toBe(1200.0);
      expect(mathIssue?.message).toContain(
        "2 × $400.00 = $800.00, but billed as $1200.00",
      );
      expect(mathIssue?.suggestedAction).toContain(
        "Update line total to $800.00",
      );
      expect(result.criticalCount).toBeGreaterThanOrEqual(1);
      expect(result.isCompliant).toBe(false);
    });

    it("passes with zero math errors when all line items multiply correctly", () => {
      const claim = createBaseClaim();
      const result = runDeterministicAudit(claim);

      const mathIssues = result.issues.filter(
        (i) => i.code === "ERR_LINE_MATH",
      );
      expect(mathIssues).toHaveLength(0);
    });

    it("handles explicit penny rounding tolerance correctly without false errors", () => {
      const claim = createBaseClaim();
      // 3 items @ $33.333... rounded to $33.33 = $99.99 billed as $99.99
      claim.lineItems[0] = createMockLineItem(
        "li-round",
        1,
        "99213",
        "Office Visit",
        3,
        33.33,
        99.99,
      );
      const result = runDeterministicAudit(claim);

      const mathIssues = result.issues.filter(
        (i) => i.code === "ERR_LINE_MATH",
      );
      expect(mathIssues).toHaveLength(0);
    });
  });

  // =========================================================================
  // RULE 2: Line-Item Sum vs Subtotal/Total with Taxes, Discounts, Advances & Explicit Rounding
  // =========================================================================
  describe("Rule 2: Financial Totals Reconciliation", () => {
    it("flags subtotal mismatch when stated subtotal does not equal itemized line sum", () => {
      const claim = createBaseClaim();
      const itemizedSum = claim.totals.itemizedSumTotal; // 2245.00
      claim.totals.subtotal = createMockField(itemizedSum + 200); // 2445.00 (mismatch)

      const result = runDeterministicAudit(claim);
      const subtotalIssue = result.issues.find(
        (i) => i.code === "ERR_SUBTOTAL_MISMATCH",
      );

      expect(subtotalIssue).toBeDefined();
      expect(subtotalIssue?.severity).toBe("critical");
      expect(subtotalIssue?.expectedValue).toBe(itemizedSum);
      expect(subtotalIssue?.actualValue).toBe(itemizedSum + 200);
      expect(subtotalIssue?.message).toContain(
        "Stated subtotal ($2445.00) does not match the sum of itemized line items ($2245.00)",
      );
      expect(subtotalIssue?.suggestedAction).toContain(
        "Audit itemized charges",
      );
    });

    it("flags stated total mismatch when printed total differs from itemized sum", () => {
      const claim = createBaseClaim();
      // Bill stated total is $2,500, but itemized sum is $2,245
      claim.totals.statedBilledTotal = createMockField(2500.0);

      const result = runDeterministicAudit(claim);
      const totalIssue = result.issues.find(
        (i) => i.code === "ERR_TOTAL_MISMATCH",
      );

      expect(totalIssue).toBeDefined();
      expect(totalIssue?.severity).toBe("critical");
      expect(totalIssue?.expectedValue).toBe(2245.0);
      expect(totalIssue?.actualValue).toBe(2500.0);
      expect(totalIssue?.message).toContain(
        "Billed statement total ($2500.00) differs from calculated total ($2245.00)",
      );
      expect(totalIssue?.suggestedAction).toContain(
        "Check for unitemized fees",
      );
    });

    it("reconciles perfectly when taxes, discounts, and advance payments are applied", () => {
      const claim = createBaseClaim();
      // Line sum: 2245.00
      // Tax: +50.00
      // Discount: -100.00
      // Advance Paid: -195.00
      // Expected Total = 2245 + 50 - 100 - 195 = 2000.00
      claim.totals.taxAmount = createMockField(50.0);
      claim.totals.discountAmount = createMockField(100.0);
      claim.totals.advancePaid = createMockField(195.0);
      claim.totals.statedBilledTotal = createMockField(2000.0);

      const result = runDeterministicAudit(claim);
      const totalIssue = result.issues.find(
        (i) => i.code === "ERR_TOTAL_MISMATCH",
      );

      expect(totalIssue).toBeUndefined();
      expect(result.reconciledTotals.expectedTotal).toBe(2000.0);
      expect(result.reconciledTotals.statedTotal).toBe(2000.0);
      expect(result.reconciledTotals.variance).toBe(0);
      expect(result.reconciledTotals.hasVariance).toBe(false);
    });

    it("explicitly handles 1-cent rounding difference as informational without false critical error", () => {
      const claim = createBaseClaim();
      // Stated total has a 1-cent penny rounding difference ($2,245.01 vs $2,245.00)
      claim.totals.statedBilledTotal = createMockField(2245.01);

      const result = runDeterministicAudit(claim);
      const criticalMismatch = result.issues.find(
        (i) => i.code === "ERR_TOTAL_MISMATCH",
      );
      const roundingInfo = result.issues.find(
        (i) => i.code === "INFO_ROUNDING_ADJUSTMENT",
      );

      expect(criticalMismatch).toBeUndefined();
      expect(roundingInfo).toBeDefined();
      expect(roundingInfo?.severity).toBe("info");
      expect(roundingInfo?.message).toContain("1-cent variance");
    });
  });

  // =========================================================================
  // RULE 3: Missing Required Fields
  // =========================================================================
  describe("Rule 3: Missing Required Fields", () => {
    it("flags missing patient name as a critical blocker", () => {
      const claim = createBaseClaim();
      claim.patient.fullName = createMockField("");

      const result = runDeterministicAudit(claim);
      const nameIssue = result.issues.find(
        (i) => i.code === "ERR_MISSING_PATIENT_NAME",
      );

      expect(nameIssue).toBeDefined();
      expect(nameIssue?.severity).toBe("critical");
      expect(nameIssue?.actualValue).toBeNull();
      expect(nameIssue?.suggestedAction).toContain(
        "Enter the patient's full legal name",
      );
    });

    it("flags missing patient DOB as a critical blocker", () => {
      const claim = createBaseClaim();
      claim.patient.dateOfBirth = createMockField("");

      const result = runDeterministicAudit(claim);
      const dobIssue = result.issues.find(
        (i) => i.code === "ERR_MISSING_PATIENT_DOB",
      );

      expect(dobIssue).toBeDefined();
      expect(dobIssue?.severity).toBe("critical");
      expect(dobIssue?.fieldKey).toBe("patient.dateOfBirth");
    });

    it("flags missing provider name and statement date as critical blockers", () => {
      const claim = createBaseClaim();
      claim.hospital.providerName = createMockField("");
      claim.hospital.statementDate = createMockField("");

      const result = runDeterministicAudit(claim);
      const providerIssue = result.issues.find(
        (i) => i.code === "ERR_MISSING_PROVIDER_NAME",
      );
      const dateIssue = result.issues.find(
        (i) => i.code === "ERR_MISSING_STATEMENT_DATE",
      );

      expect(providerIssue?.severity).toBe("critical");
      expect(dateIssue?.severity).toBe("critical");
    });

    it("flags missing line item description, quantity, and procedure code", () => {
      const claim = createBaseClaim();
      claim.lineItems[0] = {
        ...claim.lineItems[0]!,
        description: createMockField(""),
        quantity: createMockField(0),
        code: createMockField(""),
      };

      const result = runDeterministicAudit(claim);
      expect(
        result.issues.some((i) => i.code === "ERR_MISSING_LINE_DESC"),
      ).toBe(true);
      expect(result.issues.some((i) => i.code === "ERR_MISSING_LINE_QTY")).toBe(
        true,
      );
      expect(
        result.issues.some((i) => i.code === "WARN_MISSING_PROCEDURE_CODE"),
      ).toBe(true);
    });
  });

  // =========================================================================
  // RULE 4: Encounter Chronology (Discharge Date before Admission Date)
  // =========================================================================
  describe("Rule 4: Encounter Chronology", () => {
    it("flags critical blocker when discharge date is chronologically before admission date", () => {
      const claim = createBaseClaim();
      claim.hospital.admissionDate = createMockField("2026-03-15");
      claim.hospital.dischargeDate = createMockField("2026-03-12"); // 3 days before admission!

      const result = runDeterministicAudit(claim);
      const chronologyIssue = result.issues.find(
        (i) => i.code === "ERR_CHRONOLOGY_INVALID",
      );

      expect(chronologyIssue).toBeDefined();
      expect(chronologyIssue?.severity).toBe("critical");
      expect(chronologyIssue?.fieldKey).toBe("hospital.dischargeDate");
      expect(chronologyIssue?.expectedValue).toBe(">= 2026-03-15");
      expect(chronologyIssue?.actualValue).toBe("2026-03-12");
      expect(chronologyIssue?.message).toContain(
        "occurs chronologically prior to admission date",
      );
      expect(chronologyIssue?.suggestedAction).toContain(
        "Correct the discharge or admission date",
      );
      expect(result.isCompliant).toBe(false);
    });

    it("passes when discharge date is equal to or after admission date", () => {
      const claim = createBaseClaim();
      claim.hospital.admissionDate = createMockField("2026-03-14");
      claim.hospital.dischargeDate = createMockField("2026-03-15");

      const result = runDeterministicAudit(claim);
      expect(
        result.issues.some((i) => i.code === "ERR_CHRONOLOGY_INVALID"),
      ).toBe(false);
    });
  });

  // =========================================================================
  // RULE 5: Duplicate-Like Items
  // =========================================================================
  describe("Rule 5: Duplicate-Like Items", () => {
    it("flags warning when the same procedure code appears multiple times on the same date", () => {
      const claim = createBaseClaim();
      // Add two items with the same code "99285" on the same service date
      claim.lineItems.push(
        createMockLineItem(
          "li-dup",
          4,
          "99285",
          "Duplicate ER Visit",
          1,
          1250.0,
          1250.0,
          0.95,
          "2026-03-14",
        ),
      );

      const result = runDeterministicAudit(claim);
      const dupIssue = result.issues.find(
        (i) => i.code === "WARN_DUPLICATE_ITEM",
      );

      expect(dupIssue).toBeDefined();
      expect(dupIssue?.severity).toBe("warning");
      expect(dupIssue?.category).toBe("duplicate_item");
      expect(dupIssue?.lineItemId).toBe("li-dup");
      expect(dupIssue?.message).toContain("appears to duplicate line item #1");
      expect(dupIssue?.suggestedAction).toContain(
        "Confirm whether this is a distinct encounter/session",
      );
    });

    it("flags warning when identical description and charged amount appear repeatedly", () => {
      const claim = createBaseClaim();
      claim.lineItems.push(
        createMockLineItem(
          "li-desc-dup",
          4,
          "",
          "Comprehensive Metabolic Panel",
          1,
          145.0,
          145.0,
        ),
      );

      const result = runDeterministicAudit(claim);
      const dupIssue = result.issues.find(
        (i) => i.code === "WARN_DUPLICATE_ITEM",
      );
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.message).toContain("appears to duplicate line item #3");
    });
  });

  // =========================================================================
  // RULE 6: Low-Confidence Fields
  // =========================================================================
  describe("Rule 6: Low-Confidence OCR Fields", () => {
    it("flags informational check when field confidence is below 70%", () => {
      const claim = createBaseClaim();
      claim.patient.fullName = createMockField("Eleanor Vance", 0.62); // 62% confidence

      const result = runDeterministicAudit(claim);
      const lowConfIssue = result.issues.find(
        (i) =>
          i.code === "INFO_LOW_CONFIDENCE" && i.fieldKey === "patient.fullName",
      );

      expect(lowConfIssue).toBeDefined();
      expect(lowConfIssue?.severity).toBe("info");
      expect(lowConfIssue?.category).toBe("low_confidence_field");
      expect(lowConfIssue?.actualValue).toBe("62%");
      expect(lowConfIssue?.suggestedAction).toContain(
        "Compare extracted value against the original document scan",
      );
    });

    it("does not flag fields with confidence >= 70%", () => {
      const claim = createBaseClaim();
      claim.patient.fullName = createMockField("Eleanor Vance", 0.95);

      const result = runDeterministicAudit(claim);
      const lowConfIssue = result.issues.find(
        (i) =>
          i.code === "INFO_LOW_CONFIDENCE" && i.fieldKey === "patient.fullName",
      );
      expect(lowConfIssue).toBeUndefined();
    });
  });

  // =========================================================================
  // STRICT CONSTRAINT: Never Call a Mismatch Fraud
  // =========================================================================
  describe("Language and Tone Neutrality", () => {
    it("never contains the word 'fraud' or 'scam' in any issue code, message, or suggested action", () => {
      const claim = createBaseClaim();
      // Introduce every type of issue
      claim.lineItems[0] = createMockLineItem(
        "li-err",
        1,
        "99285",
        "ER Visit",
        2,
        400.0,
        1200.0,
      );
      claim.hospital.admissionDate = createMockField("2026-03-15");
      claim.hospital.dischargeDate = createMockField("2026-03-10");
      claim.lineItems.push(
        createMockLineItem("li-dup", 4, "99285", "ER Visit", 1, 1250.0, 1250.0),
      );
      claim.patient.fullName = createMockField("Test", 0.55);
      claim.totals.statedBilledTotal = createMockField(9999.0);

      const result = runDeterministicAudit(claim);
      expect(result.issues.length).toBeGreaterThan(0);

      for (const issue of result.issues) {
        expect(issue.code.toLowerCase()).not.toContain("fraud");
        expect(issue.category.toLowerCase()).not.toContain("fraud");
        expect(issue.message.toLowerCase()).not.toContain("fraud");
        expect(issue.suggestedAction.toLowerCase()).not.toContain("fraud");
        expect(issue.message.toLowerCase()).not.toContain("scam");
      }

      expect(
        result.completenessIndicator.weightedRuleDocumentation.toLowerCase(),
      ).not.toContain("fraud");
      expect(
        result.completenessIndicator.disclaimer.toLowerCase(),
      ).not.toContain("fraud");
    });
  });

  // =========================================================================
  // TRANSPARENT COMPLETENESS INDICATOR (READINESS SCORE)
  // =========================================================================
  describe("Transparent Completeness Indicator", () => {
    it("scores 100 with zero issues and documents the weighted rule", () => {
      const report = calculateCompletenessIndicator([]);
      expect(report.score).toBe(100);
      expect(report.label).toBe("Complete & Validated");
      expect(report.badgeVariant).toBe("success");
      expect(report.weightedRuleDocumentation).toContain(
        "100 base points minus 25 points per critical blocker",
      );
      expect(report.disclaimer).toContain(
        "does NOT model, predict, or guarantee insurer approval",
      );
    });

    it("deducts 25 per critical blocker and 10 per warning", () => {
      const issues = [
        {
          id: "1",
          code: "ERR_LINE_MATH",
          category: "line_item_math_error" as const,
          severity: "critical" as const,
          message: "Math error",
          suggestedAction: "Fix math",
          isResolved: false,
        },
        {
          id: "2",
          code: "WARN_DUPLICATE_ITEM",
          category: "duplicate_item" as const,
          severity: "warning" as const,
          message: "Duplicate item",
          suggestedAction: "Check item",
          isResolved: false,
        },
      ];

      const report = calculateCompletenessIndicator(issues);
      // 100 - (1 * 25) - (1 * 10) = 65
      expect(report.score).toBe(65);
      expect(report.label).toBe("Critical Blockers Present");
      expect(report.badgeVariant).toBe("destructive");
      expect(report.criticalCount).toBe(1);
      expect(report.warningCount).toBe(1);
    });

    it("floors score at 0 when excessive issues exist", () => {
      const issues = Array.from({ length: 10 }, (_, i) => ({
        id: `err-${i}`,
        code: "ERR_CRITICAL",
        category: "arithmetic_mismatch" as const,
        severity: "critical" as const,
        message: "Error",
        suggestedAction: "Fix",
        isResolved: false,
      }));

      const report = calculateCompletenessIndicator(issues);
      expect(report.score).toBe(0);
    });
  });

  // =========================================================================
  // RE-RUN CHECKS AFTER EDITS & SHOW WHAT CHANGED
  // =========================================================================
  describe("Audit Diffing (Re-run checks after human edits)", () => {
    it("tracks resolved issues and reports human fix verification", () => {
      const previousClaim = createBaseClaim();
      // Previous state had a line math error
      previousClaim.lineItems[0] = createMockLineItem(
        "li-1",
        1,
        "99285",
        "ER Visit",
        2,
        400.0,
        1200.0,
      );
      const prevAudit = runDeterministicAudit(previousClaim);
      expect(prevAudit.issues.some((i) => i.code === "ERR_LINE_MATH")).toBe(
        true,
      );

      // Human user edits line item total from $1,200 to $800
      const currentClaim = createBaseClaim();
      currentClaim.lineItems[0] = createMockLineItem(
        "li-1",
        1,
        "99285",
        "ER Visit",
        2,
        400.0,
        800.0,
      );
      const currentAudit = runDeterministicAudit(currentClaim);

      const diff = diffAuditIssues(prevAudit.issues, currentAudit.issues);

      expect(diff.hasChanges).toBe(true);
      expect(diff.resolvedIssues.some((i) => i.code === "ERR_LINE_MATH")).toBe(
        true,
      );
      expect(diff.newIssues).toHaveLength(0);
      expect(diff.summary).toContain("1 issue(s) resolved");
    });

    it("tracks newly introduced issues if an edit causes a discrepancy", () => {
      const initialClaim = createBaseClaim();
      const initialAudit = runDeterministicAudit(initialClaim);

      // Human introduces a discharge date before admission date
      const modifiedClaim = createBaseClaim();
      modifiedClaim.hospital.admissionDate = createMockField("2026-03-20");
      modifiedClaim.hospital.dischargeDate = createMockField("2026-03-10");
      const modifiedAudit = runDeterministicAudit(modifiedClaim);

      const diff = diffAuditIssues(initialAudit.issues, modifiedAudit.issues);

      expect(diff.hasChanges).toBe(true);
      expect(
        diff.newIssues.some((i) => i.code === "ERR_CHRONOLOGY_INVALID"),
      ).toBe(true);
      expect(diff.summary).toContain("new issue(s) flagged");
    });

    it("generates deterministic composite signatures for accurate issue identity tracking", () => {
      const issue = {
        id: "issue-123",
        code: "ERR_LINE_MATH",
        category: "line_item_math_error" as const,
        severity: "critical" as const,
        fieldKey: "lineItems[0].totalPrice",
        lineItemId: "li-1",
        message: "Math error",
        suggestedAction: "Fix",
        isResolved: false,
      };

      expect(getIssueSignature(issue)).toBe(
        "ERR_LINE_MATH:lineItems[0].totalPrice:li-1",
      );
    });
  });
});
