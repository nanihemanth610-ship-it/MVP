/**
 * BillBridge Core Data Types
 * Comprehensive typed contracts for medical bills, claims, line items, and audit logs.
 */

export type UserRole =
  | "patient"
  | "hospital_staff"
  | "hospital_admin"
  | "insurer_reviewer"
  | "insurer_admin"
  | "platform_admin";

export type ClaimStatus =
  | "draft"
  | "extracted"
  | "flagged"
  | "under_review"
  | "requires_information"
  | "approved"
  | "rejected"
  | "settled";

export type ConfidenceLevel = "high" | "medium" | "low";

export type DiscrepancyType =
  | "arithmetic_mismatch"
  | "line_item_math_error"
  | "missing_code"
  | "duplicate_item"
  | "unbundling_suspected"
  | "rate_threshold_exceeded"
  | "missing_patient_id";

export type DiscrepancySeverity = "info" | "warning" | "error";

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  message: string;
  lineItemId?: string;
  field?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  suggestedFix?: string;
}

export interface LineItem {
  id: string;
  code: string; // e.g. CPT "99285", HCPCS "J9355", or internal code
  codeType?: "CPT" | "HCPCS" | "REV" | "INTERNAL" | "UNKNOWN";
  description: string;
  serviceDate?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0.0 to 1.0
  notes?: string;
  isManualEdit?: boolean;
  originalValues?: {
    code?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  };
}

export interface BillDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  previewUrl?: string;
  providerName: string;
  providerNpi?: string;
  providerAddress?: string;
  patientName: string;
  patientId: string;
  accountNumber: string;
  statementDate: string;
  serviceStartDate: string;
  serviceEndDate: string;
  billedTotal: number;
  patientResponsibility?: number;
  insurancePaid?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  userRole: UserRole;
  actorName: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface ClaimRecord {
  id: string;
  claimNumber: string;
  claimRef?: string;
  claimType?: "Cashless" | "Reimbursement";
  policyNumber?: string;
  hospitalId?: string;
  patientRef?: string;
  policyRef?: string;
  hospitalRef?: string;
  admissionDate?: string;
  dischargeDate?: string;
  isSyntheticDemo?: boolean;
  idempotencyKey?: string;
  bill: BillDocument;
  lineItems: LineItem[];
  claimedTotal: number;
  calculatedTotal: number;
  variance: number; // calculatedTotal - claimedTotal
  discrepancies: Discrepancy[];
  status: ClaimStatus;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
  assignedReviewer?: string;
  reviewerNotes?: string;
  submissionNotes?: string;
}

export interface ExtractionResult {
  document: Partial<BillDocument>;
  lineItems: LineItem[];
  claimedTotal: number;
  calculatedTotal: number;
  confidence: number;
  overallConfidenceLevel: ConfidenceLevel;
  discrepancies: Discrepancy[];
  rawText?: string;
}

export interface ExtractionProgressStep {
  id: string;
  label: string;
  status: "idle" | "running" | "completed" | "error";
  detail?: string;
}
