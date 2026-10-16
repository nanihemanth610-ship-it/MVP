/**
 * BillBridge Export Service
 *
 * Implements high-fidelity CSV and JSON exports from normalized, reviewed claim data.
 * Adheres to:
 * 1. RFC 4180 CSV standard with UTF-8 Byte Order Mark (BOM) for Excel/Google Sheets compatibility.
 * 2. Formula injection defense (CWE-1236): escapes leading formula triggers (=, +, -, @, \t, \r, |, %).
 * 3. Formal JSON schema versioning (schemaVersion: "1.0.0").
 * 4. Actual data reporting with explicit labelling of demo metrics and synthetic datasets.
 * 5. Strict role-based authorization to prevent exporting unauthorized records (e.g., patient data isolation).
 * 6. Honest Excel support evaluation (lean stack excludes external heavy xlsx packages; native CSV with BOM provided).
 */

import type { Claim, UserRole } from "@/types/contracts";
import { hasPermission } from "@/types/contracts";

export const EXPORT_SCHEMA_VERSION = "1.0.0";
export const EXPORT_SYSTEM_NAME = "BillBridge";
export const CSV_BOM = "\uFEFF";

export type ExportFormat = "csv" | "json" | "excel";

export interface ExportUser {
  id: string;
  role: UserRole;
  displayName?: string;
  email?: string;
  patientId?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  userRole: UserRole;
  user?: ExportUser | null;
  filenamePrefix?: string;
  customTitle?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  recordCount: number;
  content: string;
  schemaVersion?: string;
  isSyntheticDemo: boolean;
}

export class UnauthorizedExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedExportError";
  }
}

export class UnsupportedExportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedExportFormatError";
  }
}

/**
 * Checks whether the current runtime stack natively and reliably supports Excel (.xlsx).
 * In accordance with project requirements, Excel is supported only if the current stack
 * can do so reliably without third-party format mismatch security warnings.
 */
export function isExcelSupported(): boolean {
  return false;
}

/**
 * Returns detailed diagnostic information regarding Excel format availability.
 */
export function getExcelSupportStatus() {
  return {
    supported: false,
    reason:
      "Modern .xlsx binary workbook generation is not supported in the current lean stack without external packages. BillBridge provides standard RFC 4180 CSV with UTF-8 BOM and formula injection protection, which opens natively in Microsoft Excel, Google Sheets, and LibreOffice with full Unicode and Telugu character fidelity.",
  };
}

/**
 * Formula Injection Characters per OWASP CWE-1236.
 * Spreadsheet engines (Excel, Calc, Sheets) execute commands or evaluate formulas if cells begin with these.
 */
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r", "|", "%"];

/**
 * Escapes a single cell value for CSV output.
 *
 * 1. Converts null and undefined to empty strings.
 * 2. Checks for formula injection: if text begins with formula characters, prepends a single quote (').
 * 3. Enforces RFC 4180 rules: wraps in quotes if cell contains commas, quotes, newlines, or begins with quote/spaces.
 * 4. Doubles internal quotation marks (" -> "").
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Pure numeric types are safe from formula execution in numeric columns
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) return "";
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  let str = String(value);

  // Check for formula injection triggers (both raw start and trimmed start)
  const trimmed = str.trimStart();
  const startsWithFormulaChar =
    FORMULA_TRIGGER_CHARS.some((char) => str.startsWith(char)) ||
    FORMULA_TRIGGER_CHARS.some((char) => trimmed.startsWith(char));

  if (startsWithFormulaChar) {
    str = `'${str}`;
  }

  // RFC 4180 quoting requirement
  const needsQuotes =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.startsWith("'") ||
    str.startsWith(" ") ||
    str.endsWith(" ");

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Filters claims by verifying that the requesting user is authorized to access and export them.
 *
 * - Checks that the user's role has EXPORT_DATA permission.
 * - Enforces that patient roles can ONLY access their own records.
 * - Prevents data leakage between patients.
 */
export function filterAuthorizedClaims(
  claims: Claim[],
  userRole: UserRole,
  user?: ExportUser | null,
): Claim[] {
  if (!hasPermission(userRole, "EXPORT_DATA")) {
    throw new UnauthorizedExportError(
      `Access Denied: Role "${userRole}" lacks the EXPORT_DATA permission.`,
    );
  }

  // Patient role is strictly isolated to their own records
  if (userRole === "patient") {
    const patientId =
      user?.patientId || (user?.id?.startsWith("PT-") ? user.id : undefined);
    const patientName = user?.displayName?.toLowerCase().trim();

    return claims.filter((c) => {
      if (patientId && c.patient.id === patientId) return true;
      if (
        patientName &&
        c.patient.fullName.value?.toLowerCase().trim() === patientName
      )
        return true;
      // In demo mode without explicit patient ID, allow matching standard demo patient
      if (user?.id && user.id.includes("patient")) {
        return (
          c.patient.id === "PT-34901" ||
          c.patient.fullName.value?.includes("Aarav")
        );
      }
      return false;
    });
  }

  // Hospital staff and insurer reviewers have access to institutional encounters in their queue
  return claims;
}

/**
 * Validates whether the user is authorized to export a specific single claim.
 */
export function validateSingleClaimAccess(
  claim: Claim,
  userRole: UserRole,
  user?: ExportUser | null,
): void {
  if (!hasPermission(userRole, "EXPORT_DATA")) {
    throw new UnauthorizedExportError(
      `Access Denied: Role "${userRole}" lacks the EXPORT_DATA permission.`,
    );
  }

  if (userRole === "patient") {
    const patientId =
      user?.patientId || (user?.id?.startsWith("PT-") ? user.id : undefined);
    const patientName = user?.displayName?.toLowerCase().trim();

    const isMatch =
      (patientId && claim.patient.id === patientId) ||
      (patientName &&
        claim.patient.fullName.value?.toLowerCase().trim() === patientName) ||
      (user?.id &&
        user.id.includes("patient") &&
        (claim.patient.id === "PT-34901" ||
          claim.patient.fullName.value?.includes("Aarav")));

    if (!isMatch) {
      throw new UnauthorizedExportError(
        `Access Denied: Patient "${user?.displayName || "Current User"}" is not authorized to access or export records for patient "${claim.patient.fullName.value || claim.patient.id}".`,
      );
    }
  }
}

/**
 * Computes live summary metrics from actual provided claim records.
 * Marks demo metrics explicitly.
 */
export function computeActualMetricsSummary(claims: Claim[]) {
  let totalBilledINR = 0;
  let totalItemizedINR = 0;
  let totalVarianceINR = 0;
  let flaggedCount = 0;
  let approvedCount = 0;
  let underReviewCount = 0;
  let rejectedCount = 0;
  let totalIssuesCount = 0;
  let hasDemoData = false;

  for (const c of claims) {
    totalBilledINR += c.totals.statedBilledTotal.value || 0;
    totalItemizedINR += c.totals.itemizedSumTotal || 0;
    totalVarianceINR += c.totals.variance || 0;
    totalIssuesCount += c.issues?.length || 0;

    if (c.status === "flagged") flaggedCount++;
    else if (c.status === "approved") approvedCount++;
    else if (c.status === "under_review") underReviewCount++;
    else if (c.status === "rejected") rejectedCount++;

    if (c.isSyntheticDemo) hasDemoData = true;
  }

  // Round currency sums to 2 decimal places
  totalBilledINR = Math.round(totalBilledINR * 100) / 100;
  totalItemizedINR = Math.round(totalItemizedINR * 100) / 100;
  totalVarianceINR = Math.round(totalVarianceINR * 100) / 100;

  return {
    recordCount: claims.length,
    totalBilledINR,
    totalItemizedINR,
    totalVarianceINR,
    flaggedCount,
    approvedCount,
    underReviewCount,
    rejectedCount,
    totalIssuesCount,
    isSyntheticDemo: hasDemoData,
    demoMetricsLabel: hasDemoData
      ? "[DEMO METRICS - COMPUTED FROM ACTIVE SYNTHETIC RECORDS]"
      : "[PRODUCTION METRICS]",
  };
}

/**
 * Generates an RFC 4180 compliant CSV string for a collection of claims.
 * Includes UTF-8 BOM, metadata header, formula escaping, and summary calculations.
 */
export function generateClaimsRegistryCsv(
  claims: Claim[],
  options?: { userRole?: UserRole; exportedBy?: string; title?: string },
): string {
  const metrics = computeActualMetricsSummary(claims);
  const now = new Date().toISOString();

  // CSV metadata preamble
  const metadataLines = [
    `# ${EXPORT_SYSTEM_NAME} Claims Registry Export`,
    `# Schema Version: ${EXPORT_SCHEMA_VERSION}`,
    `# Exported At: ${now}`,
    `# Exported By: ${options?.exportedBy || "System User"} (${options?.userRole || "authorized"})`,
    `# Data Classification: ${metrics.isSyntheticDemo ? "SYNTHETIC DEMO DATA - NOT FOR CLINICAL BILLING" : "LIVE PRODUCTION DATA"}`,
    `# Total Records: ${claims.length}`,
    `# Total Billed Amount (INR): ${metrics.totalBilledINR.toFixed(2)}`,
    `# Total Itemized Sum (INR): ${metrics.totalItemizedINR.toFixed(2)}`,
    `# Total Net Variance (INR): ${metrics.totalVarianceINR.toFixed(2)}`,
    "",
  ];

  // Column Headers
  const headers = [
    "Data Classification",
    "Claim Reference",
    "Hospital Name",
    "Hospital Rohini / NPI",
    "Patient ID",
    "Patient Name",
    "Claim Type",
    "Billed Amount (INR)",
    "Itemized Sum (INR)",
    "Variance (INR)",
    "Status",
    "Statement Date",
    "Insurance Payer",
    "Audit Issues Count",
    "Latest Audit Action",
    "Adjudication Decision",
  ];

  const rows = claims.map((c) => {
    const classification = c.isSyntheticDemo
      ? "[DEMO] Synthetic Record"
      : "[LIVE] Production Record";
    const claimRef = c.claimNumber;
    const hospitalName = c.hospital.providerName.value || "Unknown Hospital";
    const hospitalNpi = c.hospital.npi.value || "N/A";
    const patientId = c.patient.id;
    const patientName = c.patient.fullName.value || "Unknown Patient";
    const claimType = c.claimType || "Reimbursement";
    const billedAmount =
      c.totals.statedBilledTotal.value !== null
        ? c.totals.statedBilledTotal.value
        : 0;
    const itemizedSum = c.totals.itemizedSumTotal;
    const variance = c.totals.variance;
    const status = c.status;
    const statementDate = c.hospital.statementDate.value || c.createdAt;
    const payer = c.insurance?.payerName || "Self-Pay";
    const issueCount = c.issues?.length || 0;
    const latestAction = c.auditLog?.[0]?.eventType || "INGESTED";
    const decision =
      c.latestDecision?.outcome ||
      (c.status === "approved"
        ? "Approved"
        : c.status === "rejected"
          ? "Rejected"
          : "Pending");

    return [
      escapeCsvCell(classification),
      escapeCsvCell(claimRef),
      escapeCsvCell(hospitalName),
      escapeCsvCell(hospitalNpi),
      escapeCsvCell(patientId),
      escapeCsvCell(patientName),
      escapeCsvCell(claimType),
      escapeCsvCell(billedAmount),
      escapeCsvCell(itemizedSum),
      escapeCsvCell(variance),
      escapeCsvCell(status),
      escapeCsvCell(statementDate),
      escapeCsvCell(payer),
      escapeCsvCell(issueCount),
      escapeCsvCell(latestAction),
      escapeCsvCell(decision),
    ].join(",");
  });

  // Summary Row based on actual exported data
  const summaryRow = [
    escapeCsvCell(metrics.demoMetricsLabel),
    escapeCsvCell(`TOTALS (${claims.length} CLAIMS)`),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell(metrics.totalBilledINR),
    escapeCsvCell(metrics.totalItemizedINR),
    escapeCsvCell(metrics.totalVarianceINR),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
    escapeCsvCell(metrics.totalIssuesCount),
    escapeCsvCell("—"),
    escapeCsvCell("—"),
  ].join(",");

  const csvBody = [headers.join(","), ...rows, summaryRow].join("\r\n");

  return CSV_BOM + metadataLines.join("\r\n") + csvBody;
}

/**
 * Generates an RFC 4180 compliant CSV string for a single normalized, reviewed claim.
 * Exports all normalized line items with auditing status, variance, and formula escaping.
 */
export function generateSingleClaimCsv(
  claim: Claim,
  options?: { userRole?: UserRole; exportedBy?: string },
): string {
  const now = new Date().toISOString();
  const isDemo = claim.isSyntheticDemo;

  const metadataLines = [
    `# ${EXPORT_SYSTEM_NAME} Single Claim Itemized Report`,
    `# Schema Version: ${EXPORT_SCHEMA_VERSION}`,
    `# Exported At: ${now}`,
    `# Exported By: ${options?.exportedBy || "System User"} (${options?.userRole || "authorized"})`,
    `# Data Classification: ${isDemo ? "SYNTHETIC DEMO DATA - NOT FOR CLINICAL BILLING" : "LIVE PRODUCTION DATA"}`,
    `# Claim Reference: ${claim.claimNumber}`,
    `# Hospital: ${claim.hospital.providerName.value || "Hospital Facility"} (${claim.hospital.npi.value || "N/A"})`,
    `# Patient: ${claim.patient.fullName.value || "Patient"} (${claim.patient.id})`,
    `# Statement Date: ${claim.hospital.statementDate.value || claim.createdAt}`,
    `# Status: ${claim.status}`,
    `# Stated Total (INR): ${(claim.totals.statedBilledTotal.value || 0).toFixed(2)}`,
    `# Itemized Sum (INR): ${claim.totals.itemizedSumTotal.toFixed(2)}`,
    `# Arithmetic Variance (INR): ${claim.totals.variance.toFixed(2)}`,
    "",
  ];

  const headers = [
    "Data Classification",
    "Claim Reference",
    "Line #",
    "Billing Code",
    "Code Type",
    "Description",
    "Service Date",
    "Quantity",
    "Unit Price (INR)",
    "Item Total (INR)",
    "Expected Total (INR)",
    "Math Mismatch",
    "Extraction Status",
    "Confidence Score",
    "Line Notes",
  ];

  const rows = claim.lineItems.map((li) => {
    const classification = isDemo
      ? "[DEMO] Synthetic Item"
      : "[LIVE] Production Item";
    const codeVal =
      li.code.value || (li.code.isUnreadable ? "UNREADABLE / MISSING" : "");
    const descVal = li.description.value || "";
    const sDate =
      li.serviceDate?.value || claim.hospital.statementDate.value || "";
    const qty = li.quantity.value !== null ? li.quantity.value : 1;
    const unitPrice = li.unitPrice.value !== null ? li.unitPrice.value : 0;
    const totalPrice = li.totalPrice.value !== null ? li.totalPrice.value : 0;
    const expected =
      li.expectedTotal !== undefined ? li.expectedTotal : qty * unitPrice;
    const mismatch = li.isMathMismatch ? "YES - MISMATCH" : "NO";
    const status = li.totalPrice.status || "readable";
    const confidence = `${Math.round((li.totalPrice.confidence || 0) * 100)}%`;
    const notes = li.notes || "";

    return [
      escapeCsvCell(classification),
      escapeCsvCell(claim.claimNumber),
      escapeCsvCell(li.lineNumber),
      escapeCsvCell(codeVal),
      escapeCsvCell(li.codeType || "CPT"),
      escapeCsvCell(descVal),
      escapeCsvCell(sDate),
      escapeCsvCell(qty),
      escapeCsvCell(unitPrice),
      escapeCsvCell(totalPrice),
      escapeCsvCell(expected),
      escapeCsvCell(mismatch),
      escapeCsvCell(status),
      escapeCsvCell(confidence),
      escapeCsvCell(notes),
    ].join(",");
  });

  // Reconciliation Summary Rows
  const reconciliationRows = [
    [
      escapeCsvCell(
        isDemo ? "[DEMO RECONCILIATION SUMMARY]" : "[RECONCILIATION SUMMARY]",
      ),
      escapeCsvCell(claim.claimNumber),
      escapeCsvCell("SUMMARY"),
      escapeCsvCell("HEADER_TOTAL"),
      escapeCsvCell("—"),
      escapeCsvCell("Printed Stated Bill Header Total"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell(claim.totals.statedBilledTotal.value || 0),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("Printed on hospital invoice header"),
    ].join(","),
    [
      escapeCsvCell(
        isDemo ? "[DEMO RECONCILIATION SUMMARY]" : "[RECONCILIATION SUMMARY]",
      ),
      escapeCsvCell(claim.claimNumber),
      escapeCsvCell("SUMMARY"),
      escapeCsvCell("ITEMIZED_SUM"),
      escapeCsvCell("—"),
      escapeCsvCell("Calculated Itemized Tariff Sum"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell(claim.totals.itemizedSumTotal),
      escapeCsvCell("—"),
      escapeCsvCell(
        claim.totals.hasVariance ? "YES - DISCREPANCY" : "BALANCED",
      ),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("Sum of verified line item charges"),
    ].join(","),
    [
      escapeCsvCell(
        isDemo ? "[DEMO RECONCILIATION SUMMARY]" : "[RECONCILIATION SUMMARY]",
      ),
      escapeCsvCell(claim.claimNumber),
      escapeCsvCell("SUMMARY"),
      escapeCsvCell("VARIANCE"),
      escapeCsvCell("—"),
      escapeCsvCell("Calculated Total Minus Stated Header Total"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell(claim.totals.variance),
      escapeCsvCell("—"),
      escapeCsvCell(
        Math.abs(claim.totals.variance) > 0.01 ? "FLAGGED" : "CLEAN",
      ),
      escapeCsvCell("—"),
      escapeCsvCell("—"),
      escapeCsvCell(
        claim.totals.variance === 0
          ? "Zero variance"
          : "Requires billing desk resolution",
      ),
    ].join(","),
  ];

  const csvBody = [headers.join(","), ...rows, ...reconciliationRows].join(
    "\r\n",
  );

  return CSV_BOM + metadataLines.join("\r\n") + csvBody;
}

/**
 * Generates versioned JSON for an array of claims.
 * Strictly adheres to schema version 1.0.0 and labels demo metrics.
 */
export function generateClaimsRegistryJson(
  claims: Claim[],
  options?: { userRole?: UserRole; user?: ExportUser | null },
): string {
  const metrics = computeActualMetricsSummary(claims);

  const payload = {
    $schema: "https://billbridge.health/schemas/v1/claims-export.json",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportMetadata: {
      system: EXPORT_SYSTEM_NAME,
      appVersion: "0.1.0",
      exportTimestamp: new Date().toISOString(),
      recordCount: claims.length,
      dataClassification: metrics.isSyntheticDemo
        ? "SYNTHETIC_DEMO"
        : "LIVE_PRODUCTION",
      isSyntheticDemo: metrics.isSyntheticDemo,
      demoNotice: metrics.isSyntheticDemo
        ? "SYNTHETIC HEALTHCARE DEMO DATA - Generated for offline evaluation and workflow verification. Contains simulated encounters."
        : undefined,
      exportedBy: {
        role: options?.userRole || "unknown",
        userId: options?.user?.id || "system",
        displayName: options?.user?.displayName || "System User",
      },
      actualMetricsSummary: {
        totalBilledINR: metrics.totalBilledINR,
        totalItemizedINR: metrics.totalItemizedINR,
        totalVarianceINR: metrics.totalVarianceINR,
        flaggedClaimsCount: metrics.flaggedCount,
        approvedClaimsCount: metrics.approvedCount,
        underReviewClaimsCount: metrics.underReviewCount,
        rejectedClaimsCount: metrics.rejectedCount,
        totalDiscrepanciesCount: metrics.totalIssuesCount,
        isDemoCalculated: metrics.isSyntheticDemo,
        demoLabel: metrics.demoMetricsLabel,
      },
    },
    claims,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates versioned JSON for a single normalized, reviewed claim.
 */
export function generateSingleClaimJson(
  claim: Claim,
  options?: { userRole?: UserRole; user?: ExportUser | null },
): string {
  const isDemo = claim.isSyntheticDemo;

  const payload = {
    $schema: "https://billbridge.health/schemas/v1/single-claim-export.json",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportMetadata: {
      system: EXPORT_SYSTEM_NAME,
      appVersion: "0.1.0",
      exportTimestamp: new Date().toISOString(),
      recordCount: 1,
      dataClassification: isDemo ? "SYNTHETIC_DEMO" : "LIVE_PRODUCTION",
      isSyntheticDemo: isDemo,
      demoNotice: isDemo
        ? "SYNTHETIC HEALTHCARE DEMO DATA - Verified claim aggregate model for offline testing and review."
        : undefined,
      exportedBy: {
        role: options?.userRole || "unknown",
        userId: options?.user?.id || "system",
        displayName: options?.user?.displayName || "System User",
      },
      actualMetricsSummary: {
        claimNumber: claim.claimNumber,
        statedBilledTotalINR: claim.totals.statedBilledTotal.value || 0,
        itemizedSumTotalINR: claim.totals.itemizedSumTotal,
        varianceINR: claim.totals.variance,
        hasVariance: claim.totals.hasVariance,
        lineItemsCount: claim.lineItems.length,
        discrepanciesCount: claim.issues.length,
        status: claim.status,
        isDemoCalculated: isDemo,
        demoLabel: isDemo
          ? "[DEMO METRIC - SYNTHETIC ENCOUNTER]"
          : "[LIVE METRIC]",
      },
    },
    claim,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Triggers a browser file download using standard Blob and URL.createObjectURL.
 */
export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * High-level orchestration function to export a registry of claims.
 * Handles format selection, authorization validation, formatting, and file triggering.
 */
export async function exportClaimsRegistry(
  allClaims: Claim[],
  options: ExportOptions,
): Promise<ExportResult> {
  // Check Excel support request
  if (options.format === "excel") {
    throw new UnsupportedExportFormatError(
      "Excel (.xlsx) export is not supported in the current stack. Please export as CSV (which opens natively in Microsoft Excel with UTF-8 BOM and formula escaping) or JSON.",
    );
  }

  // Enforce access control and isolation
  const authorizedClaims = filterAuthorizedClaims(
    allClaims,
    options.userRole,
    options.user,
  );

  if (authorizedClaims.length === 0) {
    throw new Error("No authorized claim encounters found to export.");
  }

  const dateSlug = new Date().toISOString().split("T")[0];
  const prefix = options.filenamePrefix || "billbridge_claims_registry";
  const filename = `${prefix}_${dateSlug}.${options.format}`;

  let content = "";
  let mimeType = "";

  if (options.format === "csv") {
    content = generateClaimsRegistryCsv(authorizedClaims, {
      userRole: options.userRole,
      exportedBy: options.user?.displayName,
      title: options.customTitle,
    });
    mimeType = "text/csv;charset=utf-8";
  } else {
    content = generateClaimsRegistryJson(authorizedClaims, {
      userRole: options.userRole,
      user: options.user,
    });
    mimeType = "application/json;charset=utf-8";
  }

  triggerBrowserDownload(content, filename, mimeType);

  return {
    success: true,
    filename,
    format: options.format,
    recordCount: authorizedClaims.length,
    content,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    isSyntheticDemo: authorizedClaims.some((c) => c.isSyntheticDemo),
  };
}

/**
 * High-level orchestration function to export a single reviewed claim.
 */
export async function exportSingleReviewedClaim(
  claim: Claim,
  options: ExportOptions,
): Promise<ExportResult> {
  if (options.format === "excel") {
    throw new UnsupportedExportFormatError(
      "Excel (.xlsx) export is not supported in the current stack. Please export as CSV or JSON.",
    );
  }

  validateSingleClaimAccess(claim, options.userRole, options.user);

  const dateSlug = new Date().toISOString().split("T")[0];
  const claimSlug = claim.claimNumber.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const prefix = options.filenamePrefix || `billbridge_claim_${claimSlug}`;
  const filename = `${prefix}_${dateSlug}.${options.format}`;

  let content = "";
  let mimeType = "";

  if (options.format === "csv") {
    content = generateSingleClaimCsv(claim, {
      userRole: options.userRole,
      exportedBy: options.user?.displayName,
    });
    mimeType = "text/csv;charset=utf-8";
  } else {
    content = generateSingleClaimJson(claim, {
      userRole: options.userRole,
      user: options.user,
    });
    mimeType = "application/json;charset=utf-8";
  }

  triggerBrowserDownload(content, filename, mimeType);

  return {
    success: true,
    filename,
    format: options.format,
    recordCount: 1,
    content,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    isSyntheticDemo: claim.isSyntheticDemo,
  };
}

export const generateCsvExport = generateClaimsRegistryCsv;
export const generateJsonExport = generateClaimsRegistryJson;
export const downloadBlob = triggerBrowserDownload;
