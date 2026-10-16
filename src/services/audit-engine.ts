/**
 * BillBridge Deterministic Audit Engine
 *
 * Implements strict, deterministic, and explainable audit rules for healthcare bills:
 * 1. Line item math (quantity × rate versus line amount)
 * 2. Financial totals reconciliation (line items sum vs subtotal/total with taxes, discounts, advances, and explicit rounding)
 * 3. Missing required billing fields (patient, provider, statement date, line fields)
 * 4. Encounter chronology (discharge date before admission date)
 * 5. Duplicate-like items (repeated procedure codes or identical descriptions & amounts)
 * 6. Low-confidence OCR fields (< 70% confidence)
 *
 * IMPORTANT CONSTRAINTS:
 * - Never use accusatory terminology like "fraud"; use neutral terms like "arithmetic discrepancy", "billing variance", or "duplicate entry".
 * - Unknown values remain null rather than guessed.
 * - Completeness score is labeled a transparent completeness indicator with its weighted rule documented; never implies insurer approval.
 * - Deterministic audit diffing shows what changed after human edits.
 */

import type {
  Claim,
  AuditIssue,
  LineItem,
  ExtractionField,
} from "@/types/contracts";

/**
 * Rounds a number to exactly 2 decimal places to avoid IEEE 754 floating point drift.
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Result of running the deterministic audit engine on a claim.
 */
export interface AuditExecutionResult {
  issues: AuditIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  isCompliant: boolean;
  completenessIndicator: CompletenessReport;
  reconciledTotals: {
    itemizedSum: number;
    subtotal: number | null;
    tax: number;
    discount: number;
    advancePaid: number;
    expectedTotal: number;
    statedTotal: number | null;
    variance: number;
    hasVariance: boolean;
  };
}

/**
 * Transparent Completeness Indicator report.
 */
export interface CompletenessReport {
  score: number; // 0 to 100
  label:
    | "Complete & Validated"
    | "Substantial Completeness"
    | "Incomplete - Requires Review"
    | "Critical Blockers Present";
  badgeVariant: "success" | "warning" | "destructive" | "default";
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalIssuesCount: number;
  weightedRuleDocumentation: string;
  disclaimer: string;
}

/**
 * Diff result when re-running audit checks after edits.
 */
export interface AuditDiff {
  previousIssues: AuditIssue[];
  currentIssues: AuditIssue[];
  resolvedIssues: AuditIssue[];
  newIssues: AuditIssue[];
  unchangedIssues: AuditIssue[];
  hasChanges: boolean;
  summary: string;
}

/**
 * Computes a unique signature for an issue to accurately track resolved vs new issues across runs.
 */
export function getIssueSignature(issue: AuditIssue): string {
  return `${issue.code}:${issue.fieldKey || ""}:${issue.lineItemId || ""}`;
}

/**
 * Compares two audit issue lists and returns what changed (resolved vs newly introduced issues).
 */
export function diffAuditIssues(
  previous: AuditIssue[],
  current: AuditIssue[],
): AuditDiff {
  const previousMap = new Map<string, AuditIssue>();
  for (const iss of previous) {
    previousMap.set(getIssueSignature(iss), iss);
  }

  const currentMap = new Map<string, AuditIssue>();
  for (const iss of current) {
    currentMap.set(getIssueSignature(iss), iss);
  }

  const resolvedIssues: AuditIssue[] = [];
  const newIssues: AuditIssue[] = [];
  const unchangedIssues: AuditIssue[] = [];

  for (const [sig, prevIssue] of previousMap.entries()) {
    if (!currentMap.has(sig)) {
      resolvedIssues.push(prevIssue);
    } else {
      unchangedIssues.push(currentMap.get(sig)!);
    }
  }

  for (const [sig, curIssue] of currentMap.entries()) {
    if (!previousMap.has(sig)) {
      newIssues.push(curIssue);
    }
  }

  const hasChanges = resolvedIssues.length > 0 || newIssues.length > 0;
  let summary = "Audit re-run: No changes in validation status.";

  if (resolvedIssues.length > 0 && newIssues.length > 0) {
    summary = `Audit re-run: ${resolvedIssues.length} issue(s) resolved, ${newIssues.length} new issue(s) detected.`;
  } else if (resolvedIssues.length > 0) {
    const names = resolvedIssues
      .map((i) => i.code)
      .slice(0, 2)
      .join(", ");
    summary = `Audit re-run: ${resolvedIssues.length} issue(s) resolved (${names}).`;
  } else if (newIssues.length > 0) {
    const names = newIssues
      .map((i) => i.code)
      .slice(0, 2)
      .join(", ");
    summary = `Audit re-run: ${newIssues.length} new issue(s) flagged (${names}).`;
  }

  return {
    previousIssues: previous,
    currentIssues: current,
    resolvedIssues,
    newIssues,
    unchangedIssues,
    hasChanges,
    summary,
  };
}

/**
 * Calculates the transparent completeness indicator based on deterministic weights.
 */
export function calculateCompletenessIndicator(
  issues: AuditIssue[],
): CompletenessReport {
  const criticalCount = issues.filter(
    (i) => i.severity === "critical" || i.severity === "error",
  ).length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  // Transparent weighted deduction formula:
  // 100 base - (25 per critical blocker) - (10 per warning) - (3 per low-confidence/info)
  const deductions = criticalCount * 25 + warningCount * 10 + infoCount * 3;
  const score = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  let label: CompletenessReport["label"] = "Complete & Validated";
  let badgeVariant: CompletenessReport["badgeVariant"] = "success";

  if (criticalCount > 0) {
    label = "Critical Blockers Present";
    badgeVariant = "destructive";
  } else if (warningCount > 0 || score < 80) {
    label = "Incomplete - Requires Review";
    badgeVariant = "warning";
  } else if (score < 100) {
    label = "Substantial Completeness";
    badgeVariant = "default";
  }

  return {
    score,
    label,
    badgeVariant,
    criticalCount,
    warningCount,
    infoCount,
    totalIssuesCount: issues.length,
    weightedRuleDocumentation:
      "Calculated deterministically: 100 base points minus 25 points per critical blocker, 10 points per warning flag, and 3 points per low-confidence/informational check (floored at 0).",
    disclaimer:
      "Completeness & Validation Indicator: This metric reflects deterministic field completeness and arithmetic validation rules only. It does NOT model, predict, or guarantee insurer approval, claim coverage, or reimbursement.",
  };
}

/**
 * Normalizes text for comparison (lowercase, trimmed, collapsed whitespace).
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Checks if a string is a valid ISO date or parseable date string.
 */
function parseDateOrNull(dateStr: string | null | undefined): number | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? null : ts;
}

/**
 * Checks a field for low confidence (< 0.70).
 */
function checkFieldConfidence<T>(
  field: ExtractionField<T> | undefined,
  fieldKey: string,
  fieldDisplayName: string,
  issues: AuditIssue[],
  lineItemId?: string,
): void {
  if (!field) return;

  // Only flag confidence if value was extracted but confidence is below 0.70
  if (field.value !== null && field.confidence < 0.7 && !field.isUnreadable) {
    const pct = Math.round(field.confidence * 100);
    issues.push({
      id: `issue-conf-${fieldKey.replace(/[^a-zA-Z0-9]/g, "-")}-${lineItemId || "claim"}`,
      code: "INFO_LOW_CONFIDENCE",
      category: "low_confidence_field",
      severity: "info",
      fieldKey,
      lineItemId,
      expectedValue: ">= 70% OCR confidence",
      actualValue: `${pct}%`,
      message: `Field "${fieldDisplayName}" was extracted with low OCR confidence (${pct}%). Please inspect the document scan to verify accuracy.`,
      suggestedAction:
        "Compare extracted value against the original document scan and edit if necessary.",
      isResolved: false,
    });
  }
}

/**
 * Executes all deterministic audit rules on a claim aggregate.
 */
export function runDeterministicAudit(claim: Claim): AuditExecutionResult {
  const issues: AuditIssue[] = [];

  // =========================================================================
  // RULE 1: Line Item Math (quantity × rate versus line amount)
  // =========================================================================
  claim.lineItems.forEach((item, index) => {
    const qty = item.quantity.value;
    const unitPrice = item.unitPrice.value;
    const billedTotal = item.totalPrice.value;

    if (qty !== null && unitPrice !== null && billedTotal !== null) {
      const expectedTotal = roundToCents(qty * unitPrice);
      const observedTotal = roundToCents(billedTotal);
      const mathDiff = Math.abs(expectedTotal - observedTotal);

      if (mathDiff > 0.01) {
        issues.push({
          id: `issue-math-${item.id}`,
          code: "ERR_LINE_MATH",
          category: "line_item_math_error",
          severity: "critical",
          lineItemId: item.id,
          fieldKey: `lineItems[${index}].totalPrice`,
          expectedValue: expectedTotal,
          actualValue: observedTotal,
          message: `Line item #${item.lineNumber} ("${
            item.description.value || "Item"
          }") calculation mismatch: ${qty} × $${unitPrice.toFixed(
            2,
          )} = $${expectedTotal.toFixed(2)}, but billed as $${observedTotal.toFixed(2)}.`,
          suggestedAction: `Update line total to $${expectedTotal.toFixed(
            2,
          )} or adjust quantity/unit rate to match the bill.`,
          isResolved: false,
        });
      }
    }
  });

  // =========================================================================
  // RULE 2: Line-Item Sum vs Subtotal/Total with Taxes, Discounts, Advances & Rounding
  // =========================================================================
  const sumOfLines = roundToCents(
    claim.lineItems.reduce((acc, it) => acc + (it.totalPrice.value || 0), 0),
  );

  // Subtotal validation
  const statedSubtotal =
    claim.totals.subtotal?.value !== null &&
    claim.totals.subtotal?.value !== undefined
      ? roundToCents(claim.totals.subtotal.value)
      : null;

  if (statedSubtotal !== null) {
    const subtotalDiff = roundToCents(statedSubtotal - sumOfLines);
    if (Math.abs(subtotalDiff) > 0.01) {
      issues.push({
        id: "issue-subtotal-mismatch",
        code: "ERR_SUBTOTAL_MISMATCH",
        category: "arithmetic_mismatch",
        severity: "critical",
        fieldKey: "totals.subtotal",
        expectedValue: sumOfLines,
        actualValue: statedSubtotal,
        message: `Stated subtotal ($${statedSubtotal.toFixed(
          2,
        )}) does not match the sum of itemized line items ($${sumOfLines.toFixed(
          2,
        )}). Variance of $${Math.abs(subtotalDiff).toFixed(2)} detected.`,
        suggestedAction:
          "Audit itemized charges to verify missing line items or correct the stated subtotal.",
        isResolved: false,
      });
    }
  }

  // Taxes, discounts, advances handling
  const tax =
    claim.totals.taxAmount?.value !== null &&
    claim.totals.taxAmount?.value !== undefined
      ? roundToCents(claim.totals.taxAmount.value)
      : 0;

  const discount =
    claim.totals.discountAmount?.value !== null &&
    claim.totals.discountAmount?.value !== undefined
      ? roundToCents(claim.totals.discountAmount.value)
      : 0;

  const advancePaid =
    claim.totals.advancePaid?.value !== null &&
    claim.totals.advancePaid?.value !== undefined
      ? roundToCents(claim.totals.advancePaid.value)
      : 0;

  // Base for total comparison is itemized sum (or verified subtotal) + tax - discount - advancePaid
  const expectedTotal = roundToCents(sumOfLines + tax - discount - advancePaid);
  const statedTotal =
    claim.totals.statedBilledTotal.value !== null
      ? roundToCents(claim.totals.statedBilledTotal.value)
      : null;

  let totalVariance = 0;
  let hasVariance = false;

  if (statedTotal !== null) {
    totalVariance = roundToCents(statedTotal - expectedTotal);
    hasVariance = Math.abs(totalVariance) > 0.01;

    if (hasVariance) {
      const isOver = totalVariance > 0;
      const absDiff = Math.abs(totalVariance).toFixed(2);
      issues.push({
        id: "issue-total-mismatch",
        code: "ERR_TOTAL_MISMATCH",
        category: "arithmetic_mismatch",
        severity: "critical",
        fieldKey: "totals.statedBilledTotal",
        expectedValue: expectedTotal,
        actualValue: statedTotal,
        message: `Billed statement total ($${statedTotal.toFixed(
          2,
        )}) differs from calculated total ($${expectedTotal.toFixed(
          2,
        )}) [Itemized sum: $${sumOfLines.toFixed(2)}${tax > 0 ? ` + Tax: $${tax.toFixed(2)}` : ""}${
          discount > 0 ? ` - Discount: $${discount.toFixed(2)}` : ""
        }${advancePaid > 0 ? ` - Advance: $${advancePaid.toFixed(2)}` : ""}]. Net variance: ${
          isOver ? "+" : "-"
        }$${absDiff}.`,
        suggestedAction: isOver
          ? `Stated total exceeds calculated total by $${absDiff}. Check for unitemized fees, taxes, or omitted line charges.`
          : `Calculated total exceeds stated total by $${absDiff}. Check for unlisted prompt-pay discounts, adjustments, or duplicate lines.`,
        isResolved: false,
      });
    } else if (Math.abs(totalVariance) > 0 && Math.abs(totalVariance) <= 0.01) {
      // One-cent rounding handled explicitly
      issues.push({
        id: "issue-rounding-adjustment",
        code: "INFO_ROUNDING_ADJUSTMENT",
        category: "arithmetic_mismatch",
        severity: "info",
        fieldKey: "totals.statedBilledTotal",
        expectedValue: expectedTotal,
        actualValue: statedTotal,
        message:
          "A 1-cent variance between line summation and billed header was identified and reconciled within standard fractional penny rounding tolerance.",
        suggestedAction:
          "No action required; fractional cent rounding within accepted threshold.",
        isResolved: false,
      });
    }
  }

  // =========================================================================
  // RULE 3: Missing Required Fields
  // =========================================================================
  // Patient fields
  if (
    !claim.patient.fullName.value ||
    claim.patient.fullName.value.trim() === ""
  ) {
    issues.push({
      id: "issue-missing-patient-name",
      code: "ERR_MISSING_PATIENT_NAME",
      category: "missing_required_field",
      severity: "critical",
      fieldKey: "patient.fullName",
      expectedValue: "Non-empty patient full name",
      actualValue: null,
      message:
        "Patient full name is missing. Identification is required for billing record reconciliation.",
      suggestedAction:
        "Enter the patient's full legal name as shown on their identification or hospital face sheet.",
      isResolved: false,
    });
  }

  if (
    !claim.patient.dateOfBirth.value ||
    claim.patient.dateOfBirth.value.trim() === ""
  ) {
    issues.push({
      id: "issue-missing-patient-dob",
      code: "ERR_MISSING_PATIENT_DOB",
      category: "missing_required_field",
      severity: "critical",
      fieldKey: "patient.dateOfBirth",
      expectedValue: "YYYY-MM-DD",
      actualValue: null,
      message:
        "Patient date of birth is missing. Date of birth is a required identifier for adjudication.",
      suggestedAction:
        "Enter the patient's date of birth in standard YYYY-MM-DD format.",
      isResolved: false,
    });
  }

  // Member ID (Warning if missing)
  if (
    !claim.patient.memberId.value ||
    claim.patient.memberId.value.trim() === ""
  ) {
    issues.push({
      id: "issue-missing-member-id",
      code: "WARN_MISSING_MEMBER_ID",
      category: "missing_required_field",
      severity: "warning",
      fieldKey: "patient.memberId",
      expectedValue: "Subscriber / Member ID",
      actualValue: null,
      message:
        "Insurance member ID was not detected. Required if submitting to a commercial or government health plan.",
      suggestedAction:
        "Enter the insurance subscriber or member ID from the patient's insurance card.",
      isResolved: false,
    });
  }

  // Hospital / Provider fields
  if (
    !claim.hospital.providerName.value ||
    claim.hospital.providerName.value.trim() === ""
  ) {
    issues.push({
      id: "issue-missing-provider-name",
      code: "ERR_MISSING_PROVIDER_NAME",
      category: "missing_required_field",
      severity: "critical",
      fieldKey: "hospital.providerName",
      expectedValue: "Healthcare Provider / Hospital Name",
      actualValue: null,
      message: "Healthcare facility or provider name is missing.",
      suggestedAction: "Enter the billing hospital or clinic provider name.",
      isResolved: false,
    });
  }

  if (
    !claim.hospital.statementDate.value ||
    claim.hospital.statementDate.value.trim() === ""
  ) {
    issues.push({
      id: "issue-missing-statement-date",
      code: "ERR_MISSING_STATEMENT_DATE",
      category: "missing_required_field",
      severity: "critical",
      fieldKey: "hospital.statementDate",
      expectedValue: "YYYY-MM-DD",
      actualValue: null,
      message: "Statement or invoice date is missing from document header.",
      suggestedAction:
        "Enter the statement date printed on the billing invoice.",
      isResolved: false,
    });
  }

  if (!claim.hospital.npi.value || claim.hospital.npi.value.trim() === "") {
    issues.push({
      id: "issue-missing-npi",
      code: "WARN_MISSING_NPI",
      category: "missing_required_field",
      severity: "warning",
      fieldKey: "hospital.npi",
      expectedValue: "10-digit National Provider Identifier (NPI)",
      actualValue: null,
      message:
        "Provider NPI number was not detected. Standard CMS-1500 and UB-04 forms require a 10-digit NPI.",
      suggestedAction:
        "Verify and enter the provider's 10-digit National Provider Identifier.",
      isResolved: false,
    });
  }

  // Line item required fields
  claim.lineItems.forEach((item, index) => {
    // Missing description
    if (!item.description.value || item.description.value.trim() === "") {
      issues.push({
        id: `issue-missing-desc-${item.id}`,
        code: "ERR_MISSING_LINE_DESC",
        category: "missing_required_field",
        severity: "critical",
        lineItemId: item.id,
        fieldKey: `lineItems[${index}].description`,
        expectedValue: "Procedure description",
        actualValue: null,
        message: `Line item #${item.lineNumber} is missing a clinical service description.`,
        suggestedAction:
          "Enter a descriptive procedure name or service description.",
        isResolved: false,
      });
    }

    // Missing quantity
    if (item.quantity.value === null || item.quantity.value <= 0) {
      issues.push({
        id: `issue-missing-qty-${item.id}`,
        code: "ERR_MISSING_LINE_QTY",
        category: "missing_required_field",
        severity: "critical",
        lineItemId: item.id,
        fieldKey: `lineItems[${index}].quantity`,
        expectedValue: "> 0",
        actualValue: item.quantity.value,
        message: `Line item #${item.lineNumber} ("${item.description.value || "Item"}") has an invalid or missing quantity (${item.quantity.value}).`,
        suggestedAction:
          "Enter a valid positive unit quantity for this service.",
        isResolved: false,
      });
    }

    // Missing total price
    if (item.totalPrice.value === null) {
      issues.push({
        id: `issue-missing-total-${item.id}`,
        code: "ERR_MISSING_LINE_TOTAL",
        category: "missing_required_field",
        severity: "critical",
        lineItemId: item.id,
        fieldKey: `lineItems[${index}].totalPrice`,
        expectedValue: "Numeric dollar amount",
        actualValue: null,
        message: `Line item #${item.lineNumber} is missing a line total charge amount.`,
        suggestedAction: "Enter the charged amount for this line item.",
        isResolved: false,
      });
    }

    // Missing procedure code (Warning)
    if (
      !item.code.value ||
      item.code.value.trim() === "" ||
      item.code.value.toUpperCase() === "UNKNOWN"
    ) {
      issues.push({
        id: `issue-missing-code-${item.id}`,
        code: "WARN_MISSING_PROCEDURE_CODE",
        category: "missing_procedure_code",
        severity: "warning",
        lineItemId: item.id,
        fieldKey: `lineItems[${index}].code`,
        expectedValue: "CPT / HCPCS / Revenue Code",
        actualValue: item.code.value || null,
        message: `Line item #${item.lineNumber} ("${item.description.value || "Item"}") does not have an official procedure code.`,
        suggestedAction:
          "Assign a standard CPT-4 or HCPCS procedure code to facilitate electronic adjudication.",
        isResolved: false,
      });
    }
  });

  // =========================================================================
  // RULE 4: Encounter Chronology (Discharge Date before Admission Date)
  // =========================================================================
  const admissionStr = claim.hospital.admissionDate?.value;
  const dischargeStr = claim.hospital.dischargeDate?.value;

  if (admissionStr && dischargeStr) {
    const admTs = parseDateOrNull(admissionStr);
    const disTs = parseDateOrNull(dischargeStr);

    if (admTs !== null && disTs !== null && disTs < admTs) {
      issues.push({
        id: "issue-invalid-chronology",
        code: "ERR_CHRONOLOGY_INVALID",
        category: "invalid_chronology",
        severity: "critical",
        fieldKey: "hospital.dischargeDate",
        expectedValue: `>= ${admissionStr}`,
        actualValue: dischargeStr,
        message: `Discharge date (${dischargeStr}) occurs chronologically prior to admission date (${admissionStr}). Inpatient encounters cannot conclude prior to intake.`,
        suggestedAction:
          "Correct the discharge or admission date to reflect the true chronological sequence of the patient's stay.",
        isResolved: false,
      });
    }
  }

  // =========================================================================
  // RULE 5: Duplicate-Like Items
  // =========================================================================
  const seenLineEntries: Array<{
    item: LineItem;
    index: number;
    normalizedCode: string;
    normalizedDesc: string;
    total: number;
    serviceDate?: string;
  }> = [];

  claim.lineItems.forEach((item, index) => {
    const codeVal = normalizeText(item.code.value);
    const descVal = normalizeText(item.description.value);
    const itemTotal = roundToCents(item.totalPrice.value || 0);
    const svcDate = item.serviceDate?.value || undefined;

    // Check against earlier items
    const match = seenLineEntries.find((prev) => {
      // 1. Same medical code on same date (or without date)
      if (codeVal && codeVal !== "unknown" && codeVal === prev.normalizedCode) {
        if (!svcDate || !prev.serviceDate || svcDate === prev.serviceDate) {
          return true;
        }
      }
      // 2. Identical description and identical billed charge amount
      if (
        descVal &&
        descVal === prev.normalizedDesc &&
        itemTotal === prev.total
      ) {
        return true;
      }
      return false;
    });

    if (match) {
      issues.push({
        id: `issue-duplicate-${item.id}`,
        code: "WARN_DUPLICATE_ITEM",
        category: "duplicate_item",
        severity: "warning",
        lineItemId: item.id,
        fieldKey: `lineItems[${index}].code`,
        expectedValue: "Unique service or procedure modifier",
        actualValue: item.code.value || item.description.value || null,
        message: `Line item #${item.lineNumber} ("${
          item.description.value || "Item"
        }") appears to duplicate line item #${match.item.lineNumber} (Code: ${
          item.code.value || "N/A"
        }, Amount: $${itemTotal.toFixed(2)}).`,
        suggestedAction:
          "Confirm whether this is a distinct encounter/session. If clinically justified, append modifier -59 or -76; otherwise remove duplicate charge.",
        isResolved: false,
      });
    }

    seenLineEntries.push({
      item,
      index,
      normalizedCode: codeVal,
      normalizedDesc: descVal,
      total: itemTotal,
      serviceDate: svcDate,
    });
  });

  // =========================================================================
  // RULE 6: Low-Confidence OCR Fields (< 70% confidence)
  // =========================================================================
  checkFieldConfidence(
    claim.patient.fullName,
    "patient.fullName",
    "Patient Full Name",
    issues,
  );
  checkFieldConfidence(
    claim.patient.dateOfBirth,
    "patient.dateOfBirth",
    "Patient Date of Birth",
    issues,
  );
  checkFieldConfidence(
    claim.patient.memberId,
    "patient.memberId",
    "Insurance Member ID",
    issues,
  );
  checkFieldConfidence(
    claim.hospital.providerName,
    "hospital.providerName",
    "Provider Name",
    issues,
  );
  checkFieldConfidence(
    claim.hospital.statementDate,
    "hospital.statementDate",
    "Statement Date",
    issues,
  );
  checkFieldConfidence(
    claim.hospital.npi,
    "hospital.npi",
    "Provider NPI",
    issues,
  );
  checkFieldConfidence(
    claim.totals.statedBilledTotal,
    "totals.statedBilledTotal",
    "Stated Header Total",
    issues,
  );

  claim.lineItems.forEach((item, index) => {
    checkFieldConfidence(
      item.code,
      `lineItems[${index}].code`,
      `Line #${item.lineNumber} Code`,
      issues,
      item.id,
    );
    checkFieldConfidence(
      item.description,
      `lineItems[${index}].description`,
      `Line #${item.lineNumber} Description`,
      issues,
      item.id,
    );
    checkFieldConfidence(
      item.quantity,
      `lineItems[${index}].quantity`,
      `Line #${item.lineNumber} Quantity`,
      issues,
      item.id,
    );
    checkFieldConfidence(
      item.unitPrice,
      `lineItems[${index}].unitPrice`,
      `Line #${item.lineNumber} Unit Rate`,
      issues,
      item.id,
    );
    checkFieldConfidence(
      item.totalPrice,
      `lineItems[${index}].totalPrice`,
      `Line #${item.lineNumber} Total Price`,
      issues,
      item.id,
    );
  });

  // Calculate completeness indicator & summary counts
  const criticalCount = issues.filter(
    (i) => i.severity === "critical" || i.severity === "error",
  ).length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  const completenessIndicator = calculateCompletenessIndicator(issues);

  return {
    issues,
    criticalCount,
    warningCount,
    infoCount,
    isCompliant: criticalCount === 0,
    completenessIndicator,
    reconciledTotals: {
      itemizedSum: sumOfLines,
      subtotal: statedSubtotal,
      tax,
      discount,
      advancePaid,
      expectedTotal,
      statedTotal,
      variance: totalVariance,
      hasVariance,
    },
  };
}
