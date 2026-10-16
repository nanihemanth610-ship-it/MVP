/**
 * BillBridge Shared Data-Access Adapter
 *
 * Implements IDataAccess to provide a clean boundary between UI components
 * and external service providers (Supabase, Gemini API, and n8n webhooks).
 *
 * Uses synthetic labelled datasets and local-first persistence until production
 * credentials and templates are approved.
 */

import type {
  IDataAccess,
  Claim,
  Document,
  PatientFields,
  HospitalFields,
  LineItem,
  Totals,
  AuditIssue,
  AuditEvent,
  ClaimStatus,
  PaginatedQuery,
  PaginatedResponse,
  ExtractionRequest,
  ExtractionResponse,
  ExtractionProgressStep,
  LineItemCorrectionRequest,
  ReviewDecisionRequest,
  UserRole,
} from "@/types/contracts";
import { canTransitionStatus, getAllowedNextStatuses } from "@/types/contracts";
import type { ClaimRecord } from "@/types/claim";
import { getClaimStorage } from "./storage-adapter";
import { getExtractionService } from "./gemini-adapter";
import { getN8nWebhookService } from "./n8n-adapter";
import { roundToCents, runDeterministicAudit } from "./audit-engine";

/**
 * Maps a legacy ClaimRecord into the full formal Claim aggregate model.
 */
export function mapRecordToClaim(record: ClaimRecord): Claim {
  const lineItems: LineItem[] = record.lineItems.map((li, idx) => {
    const expected = roundToCents(li.quantity * li.unitPrice);
    const actual = roundToCents(li.totalPrice);
    const isMathMismatch = Math.abs(expected - actual) > 0.01;

    return {
      id: li.id,
      lineNumber: idx + 1,
      code: {
        value: li.code && li.code.trim() !== "" ? li.code : null,
        rawText: li.code || null,
        status: !li.code || li.code.trim() === "" ? "unreadable" : "readable",
        confidence: li.confidenceScore,
        isUnreadable: !li.code || li.code.trim() === "",
        unreadableReason: !li.code
          ? "Code absent on scanned statement"
          : undefined,
        isFlagged: !li.code || li.code.trim() === "",
      },
      codeType: li.codeType || "CPT",
      description: {
        value: li.description,
        rawText: li.description,
        status: "readable",
        confidence: li.confidenceScore,
        isUnreadable: false,
        isFlagged: false,
      },
      serviceDate: li.serviceDate
        ? {
            value: li.serviceDate,
            rawText: li.serviceDate,
            status: "readable",
            confidence: 0.95,
            isUnreadable: false,
            isFlagged: false,
          }
        : undefined,
      quantity: {
        value: li.quantity,
        rawText: String(li.quantity),
        status: "readable",
        confidence: li.confidenceScore,
        isUnreadable: false,
        isFlagged: false,
      },
      unitPrice: {
        value: li.unitPrice,
        rawText: String(li.unitPrice),
        status: "readable",
        confidence: li.confidenceScore,
        isUnreadable: false,
        isFlagged: false,
      },
      totalPrice: {
        value: li.totalPrice,
        rawText: String(li.totalPrice),
        status: isMathMismatch ? "low_confidence" : "readable",
        confidence: isMathMismatch ? 0.6 : li.confidenceScore,
        isUnreadable: false,
        isFlagged: isMathMismatch,
      },
      expectedTotal: expected,
      isMathMismatch,
      notes: li.notes,
    };
  });

  const totals: Totals = {
    statedBilledTotal: {
      value: record.claimedTotal,
      rawText: String(record.claimedTotal),
      status: "readable",
      confidence: 0.98,
      isUnreadable: false,
      isFlagged: record.variance !== 0,
    },
    itemizedSumTotal: record.calculatedTotal,
    variance: record.variance,
    hasVariance: Math.abs(record.variance) > 0.01,
    patientResponsibilityEstimated: record.bill.patientResponsibility,
    netPayerExpectedAmount: record.bill.insurancePaid,
  };

  const document: Document = {
    id: record.bill.id,
    fileName: record.bill.fileName,
    fileSizeBytes: record.bill.fileSize,
    mimeType:
      (record.bill.mimeType as Document["mimeType"]) || "application/pdf",
    uploadedAt: record.bill.uploadedAt,
    previewUrl: record.bill.previewUrl || "/samples/sample_bill.pdf",
    pageCount: 1,
    documentType: "ITEMIZED_STATEMENT",
    checksumSha256: "sha256-demo-checksum-0941829104",
  };

  const patient: PatientFields = {
    id: record.bill.patientId,
    fullName: {
      value: record.bill.patientName,
      rawText: record.bill.patientName,
      status: "readable",
      confidence: 0.99,
      isUnreadable: false,
      isFlagged: false,
    },
    dateOfBirth: {
      value: "1984-06-12",
      rawText: "06/12/1984",
      status: "readable",
      confidence: 0.95,
      isUnreadable: false,
      isFlagged: false,
    },
    memberId: {
      value: `MBR-${record.bill.patientId.replace("PT-", "")}`,
      rawText: `MBR-${record.bill.patientId.replace("PT-", "")}`,
      status: "readable",
      confidence: 0.96,
      isUnreadable: false,
      isFlagged: false,
    },
    accountNumber: {
      value: record.bill.accountNumber,
      rawText: record.bill.accountNumber,
      status: "readable",
      confidence: 0.98,
      isUnreadable: false,
      isFlagged: false,
    },
  };

  const hospital: HospitalFields = {
    providerName: {
      value: record.bill.providerName,
      rawText: record.bill.providerName,
      status: "readable",
      confidence: 0.99,
      isUnreadable: false,
      isFlagged: false,
    },
    facilityType: record.bill.providerName.toLowerCase().includes("hospital")
      ? "emergency"
      : record.bill.providerName.toLowerCase().includes("surgical")
        ? "ambulatory"
        : "specialty_clinic",
    npi: {
      value: record.bill.providerNpi || "1948201948",
      rawText: record.bill.providerNpi || "1948201948",
      status: "readable",
      confidence: 0.95,
      isUnreadable: false,
      isFlagged: false,
    },
    billingAddress: {
      value: record.bill.providerAddress || "Address on record",
      rawText: record.bill.providerAddress || "Address on record",
      status: "readable",
      confidence: 0.92,
      isUnreadable: false,
      isFlagged: false,
    },
    statementDate: {
      value: record.bill.statementDate,
      rawText: record.bill.statementDate,
      status: "readable",
      confidence: 0.98,
      isUnreadable: false,
      isFlagged: false,
    },
  };

  const issues: AuditIssue[] = record.discrepancies.map((d) => ({
    id: d.id,
    code:
      d.id.startsWith("disc-math") || d.type === "line_item_math_error"
        ? "ERR_LINE_MATH"
        : d.id.startsWith("disc-variance") || d.type === "arithmetic_mismatch"
          ? "ERR_TOTAL_MISMATCH"
          : d.id.startsWith("disc-dup") || d.type === "duplicate_item"
            ? "WARN_DUPLICATE_ITEM"
            : d.type === "missing_code"
              ? "WARN_MISSING_PROCEDURE_CODE"
              : "WARN_AUDIT",
    category:
      d.type === "arithmetic_mismatch"
        ? "arithmetic_mismatch"
        : d.type === "line_item_math_error"
          ? "line_item_math_error"
          : d.type === "missing_code"
            ? "missing_procedure_code"
            : "duplicate_billing",
    severity:
      d.severity === "error"
        ? "error"
        : d.severity === "warning"
          ? "warning"
          : "info",
    message: d.message,
    lineItemId: d.lineItemId,
    fieldKey: d.field,
    expectedValue: d.expectedValue,
    actualValue: d.actualValue,
    suggestedAction: d.suggestedFix || "Review line item",
    isResolved: false,
  }));

  const auditLog: AuditEvent[] = record.auditTrail.map((at) => ({
    id: at.id,
    timestamp: at.timestamp,
    claimId: record.id,
    actorRole: at.userRole,
    actorName: at.actorName,
    eventType: at.action.includes("UPLOAD")
      ? "DOCUMENT_UPLOADED"
      : at.action.includes("EXTRACT")
        ? "OCR_EXTRACTION_COMPLETED"
        : at.action.includes("APPROVE")
          ? "DECISION_RECORDED"
          : "DISCREPANCY_FLAGGED",
    summary: at.details,
  }));

  const claimType: "Cashless" | "Reimbursement" =
    record.claimNumber === "BB-DEMO-1001" ? "Reimbursement" : "Cashless";

  return {
    id: record.id,
    claimNumber: record.claimNumber,
    claimType,
    document,
    patient,
    hospital,
    insurance: {
      payerName:
        record.claimNumber === "BB-DEMO-1001"
          ? "Care Health Insurance"
          : record.claimNumber === "BB-DEMO-1002"
            ? "HDFC ERGO Health Insurance"
            : "Star Health & Allied Insurance",
      policyNumber: `POL-IN-${record.bill.patientId.replace("PT-", "")}-2026`,
      groupNumber: "GRP-PPN-7014",
      coverageStatus: "active",
      claimType,
    },
    lineItems,
    totals,
    issues,
    status: record.status as ClaimStatus,
    auditLog,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isSyntheticDemo: true,
  };
}

/**
 * Standard implementation of IDataAccess backed by LocalStorage and Mock Adapters.
 */
export class StandardDataAccess implements IDataAccess {
  readonly adapterName = "BillBridge Standard Data Access";
  readonly mode = "mock" as const;

  private storage = getClaimStorage();
  private extractor = getExtractionService();
  private webhookService = getN8nWebhookService();

  async getClaims(query?: PaginatedQuery): Promise<PaginatedResponse<Claim>> {
    const rawRecords = await this.storage.getClaims();
    let claims = rawRecords.map(mapRecordToClaim);

    // Apply search filter (claimNumber, patientName, providerName, patientId, accountNumber)
    if (query?.search && query.search.trim() !== "") {
      const q = query.search.toLowerCase().trim();
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          (c.patient.fullName.value?.toLowerCase() || "").includes(q) ||
          (c.hospital.providerName.value?.toLowerCase() || "").includes(q) ||
          (c.patient.id?.toLowerCase() || "").includes(q) ||
          (c.patient.accountNumber.value?.toLowerCase() || "").includes(q),
      );
    }

    // Apply status filter (support statusFilter or status alias)
    const targetStatus = query?.statusFilter || query?.status;
    if (targetStatus && targetStatus !== "all") {
      claims = claims.filter((c) => c.status === targetStatus);
    }

    // Apply date range filter (statementDate or createdAt) using YYYY-MM-DD string comparisons
    if (query?.startDate) {
      const startStr = query.startDate.slice(0, 10);
      claims = claims.filter((c) => {
        const dStr = (c.hospital.statementDate.value || c.createdAt).slice(
          0,
          10,
        );
        return dStr >= startStr;
      });
    }

    if (query?.endDate) {
      const endStr = query.endDate.slice(0, 10);
      claims = claims.filter((c) => {
        const dStr = (c.hospital.statementDate.value || c.createdAt).slice(
          0,
          10,
        );
        return dStr <= endStr;
      });
    }

    // Apply sorting
    if (query?.sortBy) {
      claims.sort((a, b) => {
        let cmp = 0;
        if (query.sortBy === "claimedTotal") {
          cmp =
            (a.totals.statedBilledTotal.value || 0) -
            (b.totals.statedBilledTotal.value || 0);
        } else if (query.sortBy === "patientName") {
          cmp = (a.patient.fullName.value || "").localeCompare(
            b.patient.fullName.value || "",
          );
        } else if (query.sortBy === "providerName") {
          cmp = (a.hospital.providerName.value || "").localeCompare(
            b.hospital.providerName.value || "",
          );
        } else if (query.sortBy === "statementDate") {
          const da = new Date(
            a.hospital.statementDate.value || a.createdAt,
          ).getTime();
          const db = new Date(
            b.hospital.statementDate.value || b.createdAt,
          ).getTime();
          cmp = da - db;
        } else {
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return query.sortDirection === "desc" ? -cmp : cmp;
      });
    }

    const totalCount = claims.length;
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 20;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const items = claims.slice(start, start + pageSize);

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getClaimById(id: string): Promise<Claim | null> {
    const raw = await this.storage.getClaimById(id);
    return raw ? mapRecordToClaim(raw) : null;
  }

  async saveClaim(claim: Claim): Promise<Claim> {
    // Map back to storage record format
    const record: ClaimRecord = {
      id: claim.id,
      claimNumber: claim.claimNumber,
      bill: {
        id: claim.document.id,
        fileName: claim.document.fileName,
        fileSize: claim.document.fileSizeBytes,
        mimeType: claim.document.mimeType,
        uploadedAt: claim.document.uploadedAt,
        providerName: claim.hospital.providerName.value || "Unknown Provider",
        providerNpi: claim.hospital.npi.value || "",
        patientName: claim.patient.fullName.value || "Unknown Patient",
        patientId: claim.patient.id,
        accountNumber: claim.patient.accountNumber.value || "ACC-000",
        statementDate:
          claim.hospital.statementDate.value || new Date().toISOString(),
        serviceStartDate:
          claim.hospital.statementDate.value || new Date().toISOString(),
        serviceEndDate:
          claim.hospital.statementDate.value || new Date().toISOString(),
        billedTotal: claim.totals.statedBilledTotal.value || 0,
      },
      lineItems: claim.lineItems.map((li) => ({
        id: li.id,
        code: li.code.value || "",
        codeType: li.codeType,
        description: li.description.value || "",
        quantity: li.quantity.value || 1,
        unitPrice: li.unitPrice.value || 0,
        totalPrice: li.totalPrice.value || 0,
        confidence: li.totalPrice.confidence > 0.8 ? "high" : "medium",
        confidenceScore: li.totalPrice.confidence,
        notes: li.notes,
      })),
      claimedTotal: claim.totals.statedBilledTotal.value || 0,
      calculatedTotal: claim.totals.itemizedSumTotal,
      variance: claim.totals.variance,
      discrepancies: claim.issues.map((iss) => ({
        id: iss.id,
        type: iss.category as any,
        severity: iss.severity as any,
        message: iss.message,
        lineItemId: iss.lineItemId,
        field: iss.fieldKey,
        expectedValue:
          iss.expectedValue !== null ? iss.expectedValue : undefined,
        actualValue: iss.actualValue !== null ? iss.actualValue : undefined,
        suggestedFix: iss.suggestedAction,
      })),
      status: claim.status as any,
      auditTrail: claim.auditLog.map((al) => ({
        id: al.id,
        timestamp: al.timestamp,
        action: al.eventType,
        userRole: al.actorRole,
        actorName: al.actorName,
        details: al.summary,
      })),
      createdAt: claim.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.saveClaim(record);
    return claim;
  }

  async updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    actorRole: UserRole,
    reason?: string,
  ): Promise<Claim> {
    const existing = await this.getClaimById(claimId);
    if (!existing) {
      throw new Error(`BillBridge: Claim ${claimId} not found.`);
    }

    // Strict data-layer status transition validation
    if (!canTransitionStatus(existing.status, newStatus, actorRole)) {
      const allowed = getAllowedNextStatuses(existing.status, actorRole)
        .map((r) => r.to)
        .join(", ");
      throw new Error(
        `BillBridge Data Layer: Illegal status transition from "${existing.status}" to "${newStatus}" for role "${actorRole}". Permitted transitions: [${allowed || "none"}].`,
      );
    }

    const updatedClaim: Claim = {
      ...existing,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          claimId,
          actorRole,
          actorName:
            actorRole === "insurer_reviewer" || actorRole === "insurer_admin"
              ? "Insurer Adjudicator"
              : actorRole === "hospital_admin"
              ? "Hospital Administrator"
              : "Hospital Staff",
          eventType: "STATUS_TRANSITION",
          summary: `Claim status changed from ${existing.status} to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
        },
        ...existing.auditLog,
      ],
    };

    await this.saveClaim(updatedClaim);

    // Notify n8n boundary safely
    await this.dispatchWorkflowEvent(
      `claim.status_${newStatus}`,
      updatedClaim,
      actorRole,
    );

    return updatedClaim;
  }

  async applyLineItemCorrection(
    correction: LineItemCorrectionRequest,
  ): Promise<Claim> {
    const existing = await this.getClaimById(correction.claimId);
    if (!existing) {
      throw new Error(`BillBridge: Claim ${correction.claimId} not found.`);
    }

    const updatedLineItems = existing.lineItems.map((li) => {
      if (li.id !== correction.lineItemId) return li;

      const newQty =
        correction.quantity !== undefined
          ? correction.quantity
          : li.quantity.value || 1;
      const newPrice =
        correction.unitPrice !== undefined
          ? correction.unitPrice
          : li.unitPrice.value || 0;
      const newTotal =
        correction.totalPrice !== undefined
          ? correction.totalPrice
          : roundToCents(newQty * newPrice);

      return {
        ...li,
        quantity: {
          ...li.quantity,
          value: newQty,
          status: "corrected" as const,
        },
        unitPrice: {
          ...li.unitPrice,
          value: newPrice,
          status: "corrected" as const,
        },
        totalPrice: {
          ...li.totalPrice,
          value: newTotal,
          status: "corrected" as const,
        },
        code: correction.code
          ? { ...li.code, value: correction.code, status: "corrected" as const }
          : li.code,
        description: correction.description
          ? { ...li.description, value: correction.description }
          : li.description,
        isMathMismatch: false,
      };
    });

    const newCalculatedTotal = roundToCents(
      updatedLineItems.reduce(
        (acc, item) => acc + (item.totalPrice.value || 0),
        0,
      ),
    );
    const stated = existing.totals.statedBilledTotal.value || 0;
    const newVariance = roundToCents(newCalculatedTotal - stated);

    const preliminaryClaim: Claim = {
      ...existing,
      lineItems: updatedLineItems,
      totals: {
        ...existing.totals,
        itemizedSumTotal: newCalculatedTotal,
        variance: newVariance,
        hasVariance: Math.abs(newVariance) > 0.01,
      },
    };

    const auditResult = runDeterministicAudit(preliminaryClaim);

    const updatedClaim: Claim = {
      ...preliminaryClaim,
      issues: auditResult.issues,
      status:
        auditResult.isCompliant && existing.status === "flagged"
          ? "under_review"
          : existing.status,
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          claimId: correction.claimId,
          actorRole: correction.actorRole,
          actorName: correction.actorName,
          eventType: "FIELD_CORRECTED",
          summary: `Line item #${correction.lineItemId} adjusted: ${correction.reason}`,
        },
        ...existing.auditLog,
      ],
    };

    await this.saveClaim(updatedClaim);
    return updatedClaim;
  }

  async recordDecision(decision: ReviewDecisionRequest): Promise<Claim> {
    // Only insurer adjudicators are authorized to record formal claim decisions
    if (decision.adjudicatorRole !== "insurer_reviewer" && decision.adjudicatorRole !== "insurer_admin") {
      throw new Error(
        `BillBridge Data Layer Policy Violation: Role "${decision.adjudicatorRole}" is not authorized to adjudicate claims. Backend policy requires "insurer_reviewer" or "insurer_admin".`,
      );
    }

    // Query and Reject decisions strictly require an explanatory rationale note
    if (
      (decision.outcome === "query" ||
        decision.outcome === "requires_information" ||
        decision.outcome === "rejected") &&
      (!decision.rationale || decision.rationale.trim().length === 0)
    ) {
      throw new Error(
        `BillBridge Data Layer: A non-empty rationale note is mandatory when issuing a "${decision.outcome}" decision.`,
      );
    }

    const existing = await this.getClaimById(decision.claimId);
    if (!existing) {
      throw new Error(`BillBridge: Claim ${decision.claimId} not found.`);
    }

    let nextStatus: ClaimStatus = "under_review";
    if (decision.outcome === "approved") {
      nextStatus = "approved";
    } else if (decision.outcome === "rejected") {
      nextStatus = "rejected";
    } else if (
      decision.outcome === "query" ||
      decision.outcome === "requires_information"
    ) {
      nextStatus = "requires_information";
    } else if (decision.outcome === "settled") {
      nextStatus = "settled";
    }

    // Strict data-layer status transition validation
    if (
      !canTransitionStatus(
        existing.status,
        nextStatus,
        decision.adjudicatorRole,
      )
    ) {
      throw new Error(
        `BillBridge Data Layer: Cannot record "${decision.outcome}" decision from status "${existing.status}" as role "${decision.adjudicatorRole}".`,
      );
    }

    const updatedClaim: Claim = {
      ...existing,
      status: nextStatus,
      latestDecision: {
        id: `dec-${Date.now()}`,
        claimId: decision.claimId,
        adjudicatorRole: decision.adjudicatorRole,
        adjudicatorName: decision.adjudicatorName,
        decidedAt: new Date().toISOString(),
        outcome: decision.outcome,
        rationale: decision.rationale,
        formalNoticeGenerated: true,
        notificationDispatchedToPatient: true,
        notificationDispatchedToHospital: true,
      },
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          claimId: decision.claimId,
          actorRole: decision.adjudicatorRole,
          actorName: decision.adjudicatorName,
          eventType: "DECISION_RECORDED",
          summary: `[SIMULATED DECISION - DEMO MODE] Adjudicator recorded ${decision.outcome.toUpperCase()}. Note: ${decision.rationale}`,
        },
        ...existing.auditLog,
      ],
    };

    await this.saveClaim(updatedClaim);
    await this.dispatchWorkflowEvent(
      `decision.${decision.outcome}`,
      updatedClaim,
      decision.adjudicatorRole,
    );

    return updatedClaim;
  }

  async resetDemoData(): Promise<Claim[]> {
    const raw = await this.storage.resetToMockData();
    return raw.map(mapRecordToClaim);
  }

  async extractBillDocument(
    request: ExtractionRequest,
    onProgress?: (step: ExtractionProgressStep) => void,
    signal?: AbortSignal,
  ): Promise<ExtractionResponse> {
    const start = Date.now();
    const result = await this.extractor.extractBill(
      request.file,
      request.presetId || "discrepancy",
      (step) => {
        onProgress?.(step);
      },
      signal,
      request.pageCount || 1,
      request.simulateFailure || false,
    );

    const record: ClaimRecord = {
      id: `claim-extracted-${Date.now()}`,
      claimNumber: `CLM-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      bill: {
        id: `doc-${Date.now()}`,
        fileName: result.document.fileName || "extracted_bill.pdf",
        fileSize: result.document.fileSize || 450000,
        mimeType: "application/pdf",
        uploadedAt: new Date().toISOString(),
        providerName: result.document.providerName || "General Hospital",
        patientName: result.document.patientName || "Jane Doe",
        patientId: result.document.patientId || "PT-9999",
        accountNumber: result.document.accountNumber || "ACC-9999",
        statementDate:
          result.document.statementDate || new Date().toISOString(),
        serviceStartDate:
          result.document.serviceStartDate || new Date().toISOString(),
        serviceEndDate:
          result.document.serviceEndDate || new Date().toISOString(),
        billedTotal: result.claimedTotal,
      },
      lineItems: result.lineItems,
      claimedTotal: result.claimedTotal,
      calculatedTotal: result.calculatedTotal,
      variance: roundToCents(result.calculatedTotal - result.claimedTotal),
      discrepancies: result.discrepancies,
      status: result.discrepancies.length > 0 ? "flagged" : "extracted",
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "OCR_EXTRACTION_COMPLETED",
          userRole: "hospital_staff",
          actorName: "BillBridge Vision OCR",
          details: `Processed document with ${result.confidence * 100}% confidence.`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.storage.saveClaim(record);
    const claim = mapRecordToClaim(saved);

    return {
      claim,
      confidenceAverage: result.confidence,
      processingDurationMs: Date.now() - start,
    };
  }

  async dispatchWorkflowEvent(
    eventType: string,
    claim: Claim,
    actorRole: UserRole,
  ): Promise<{ dispatched: boolean; receiptId: string }> {
    const rawRecord: ClaimRecord = {
      id: claim.id,
      claimNumber: claim.claimNumber,
      bill: {
        id: claim.document.id,
        fileName: claim.document.fileName,
        fileSize: claim.document.fileSizeBytes,
        mimeType: claim.document.mimeType,
        uploadedAt: claim.document.uploadedAt,
        providerName: claim.hospital.providerName.value || "",
        patientName: claim.patient.fullName.value || "",
        patientId: claim.patient.id,
        accountNumber: claim.patient.accountNumber.value || "",
        statementDate: claim.hospital.statementDate.value || "",
        serviceStartDate: "",
        serviceEndDate: "",
        billedTotal: claim.totals.statedBilledTotal.value || 0,
      },
      lineItems: [],
      claimedTotal: claim.totals.statedBilledTotal.value || 0,
      calculatedTotal: claim.totals.itemizedSumTotal,
      variance: claim.totals.variance,
      discrepancies: [],
      status: claim.status as any,
      auditTrail: [],
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };

    const result = await this.webhookService.dispatch(
      eventType as any,
      rawRecord,
      actorRole,
    );
    return {
      dispatched: result.dispatched,
      receiptId: result.receiptId,
    };
  }
}

let activeDataAccess: IDataAccess | null = null;

export function getDataAccess(): IDataAccess {
  if (!activeDataAccess) {
    activeDataAccess = new StandardDataAccess();
  }
  return activeDataAccess;
}
