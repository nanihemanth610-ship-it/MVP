/**
 * BillBridge Domain Contracts & Data Architecture
 *
 * Formal typed models, data-access interfaces, route maps, role permissions,
 * and status transitions for the BillBridge platform.
 *
 * Explicitly models nullable/unreadable fields, extraction provenance,
 * arithmetic reconciliation, and audit decisions.
 */

// ── 1. CORE ROLES & USER IDENTIFIERS ──

import type { ExtractionProgressStep } from "./claim";

export type { ExtractionProgressStep };

export type UserRole =
  | "patient"
  | "hospital_staff"
  | "hospital_admin"
  | "insurer_reviewer"
  | "insurer_admin"
  | "platform_admin"
  | "super_admin";

export interface UserSession {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  organizationName: string;
  isDemoMode: boolean;
}

// ── 2. EXTRACTION FIELD & PROVENANCE (MODELING UNREADABLE VALUES) ──

export type FieldExtractionStatus =
  "readable" | "unreadable" | "omitted" | "corrected" | "low_confidence";

export interface BoundingBox {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ManualFieldCorrection<T> {
  originalValue: T | null;
  correctedValue: T;
  correctedByRole: UserRole;
  correctedByName: string;
  timestamp: string;
  reason: string;
}

/**
 * ExtractionField models untrusted AI OCR outputs explicitly.
 * Values may be null when unreadable or omitted by the scanning model.
 */
export interface ExtractionField<T> {
  value: T | null;
  rawText: string | null;
  status: FieldExtractionStatus;
  confidence: number; // 0.0 to 1.0 scale
  isUnreadable: boolean;
  unreadableReason?: string;
  isFlagged: boolean;
  boundingBox?: BoundingBox;
  correction?: ManualFieldCorrection<T>;
}

// ── 3. PATIENT & HOSPITAL DOMAIN ENTITIES ──

export interface PatientFields {
  id: string; // Patient record ID
  fullName: ExtractionField<string>;
  dateOfBirth: ExtractionField<string>; // ISO YYYY-MM-DD
  gender?: ExtractionField<"male" | "female" | "other" | "unknown">;
  memberId: ExtractionField<string>; // Insurance card ID
  accountNumber: ExtractionField<string>; // Hospital patient account
  phone?: ExtractionField<string>;
  address?: ExtractionField<string>;
}

export interface HospitalFields {
  providerName: ExtractionField<string>;
  facilityType:
    | "inpatient"
    | "outpatient"
    | "emergency"
    | "ambulatory"
    | "specialty_clinic"
    | "pharmacy";
  npi: ExtractionField<string>; // National Provider Identifier (10 digits)
  taxId?: ExtractionField<string>;
  billingAddress: ExtractionField<string>;
  department?: ExtractionField<string>;
  statementDate: ExtractionField<string>;
  admissionDate?: ExtractionField<string>;
  dischargeDate?: ExtractionField<string>;
}

// ── 4. LINE ITEMS & FINANCIAL TOTALS ──

export type MedicalCodeType = "CPT" | "HCPCS" | "REV" | "INTERNAL" | "UNKNOWN";

export interface LineItem {
  id: string;
  lineNumber: number;
  code: ExtractionField<string>;
  codeType: MedicalCodeType;
  description: ExtractionField<string>;
  serviceDate?: ExtractionField<string>;
  revenueCode?: ExtractionField<string>;
  quantity: ExtractionField<number>;
  unitPrice: ExtractionField<number>;
  totalPrice: ExtractionField<number>;
  expectedTotal: number; // Pure calculation: quantity.value * unitPrice.value
  isMathMismatch: boolean;
  isCovered?: boolean;
  notes?: string;
}

export interface Totals {
  statedBilledTotal: ExtractionField<number>; // Extracted printed total on invoice header
  itemizedSumTotal: number; // Pure arithmetic sum of all line item totals
  variance: number; // itemizedSumTotal - statedBilledTotal.value
  hasVariance: boolean;
  subtotal?: ExtractionField<number>; // Extracted printed subtotal before taxes/discounts
  taxAmount?: ExtractionField<number>; // Extracted tax / surcharge
  discountAmount?: ExtractionField<number>; // Extracted discount / prompt-pay reduction
  advancePaid?: ExtractionField<number>; // Extracted advance payment / deposit collected
  copayAmount?: ExtractionField<number>;
  coinsuranceAmount?: ExtractionField<number>;
  deductibleApplied?: ExtractionField<number>;
  contractualAdjustment?: ExtractionField<number>;
  patientResponsibilityEstimated?: number;
  netPayerExpectedAmount?: number;
}

// ── 5. DOCUMENT & ATTACHMENT CONTRACTS ──

export type DocumentMimeType =
  "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

export interface Document {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: DocumentMimeType;
  uploadedAt: string;
  previewUrl: string;
  pageCount: number;
  documentType:
    "UB04" | "CMS1500" | "ITEMIZED_STATEMENT" | "PHARMACY_RX" | "UNKNOWN";
  checksumSha256: string;
}

// ── 6. AUDIT ISSUES & DISCREPANCIES ──

export type AuditIssueCategory =
  | "arithmetic_mismatch"
  | "line_item_math_error"
  | "missing_required_field"
  | "missing_procedure_code"
  | "duplicate_item"
  | "duplicate_billing"
  | "invalid_chronology"
  | "low_confidence_field"
  | "unbundling_suspected"
  | "rate_exceeds_threshold"
  | "unreadable_critical_field"
  | "coverage_inconsistency";

export type AuditIssueSeverity = "critical" | "warning" | "info" | "error";

export interface AuditIssue {
  id: string;
  code: string; // Machine-readable identifier e.g. "ERR_LINE_MATH", "ERR_TOTAL_MISMATCH", "ERR_CHRONOLOGY_INVALID", "ERR_MISSING_REQUIRED_FIELD", "WARN_DUPLICATE_ITEM", "INFO_LOW_CONFIDENCE"
  category: AuditIssueCategory;
  severity: AuditIssueSeverity;
  message: string; // Plain-language explanation (strictly no accusations or fraud terminology)
  lineItemId?: string;
  fieldKey?: string; // Exact field path e.g. "lineItems[0].totalPrice", "hospital.dischargeDate"
  expectedValue?: string | number | null;
  actualValue?: string | number | null;
  suggestedAction: string; // Actionable suggested human fix
  isResolved: boolean;
  resolvedByRole?: UserRole;
  resolvedAt?: string;
  resolutionNote?: string;
}

// ── 7. REVIEW DECISION & STATUS TRANSITIONS ──

export type ClaimStatus =
  | "draft"
  | "ingesting"
  | "extracted"
  | "flagged"
  | "under_review"
  | "requires_information"
  | "approved"
  | "rejected"
  | "settled"
  | "archived";

export type DecisionOutcome =
  | "approved"
  | "rejected"
  | "query"
  | "approved_with_adjustments"
  | "requires_information"
  | "settled";

export interface ReviewDecision {
  id: string;
  claimId: string;
  adjudicatorRole: UserRole;
  adjudicatorName: string;
  decidedAt: string;
  outcome: DecisionOutcome;
  rationale: string;
  adjustedTotal?: number;
  disallowedLineItemIds?: string[];
  formalNoticeGenerated: boolean;
  notificationDispatchedToPatient: boolean;
  notificationDispatchedToHospital: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  claimId: string;
  actorRole: UserRole;
  actorName: string;
  eventType:
    | "DOCUMENT_UPLOADED"
    | "OCR_EXTRACTION_COMPLETED"
    | "DISCREPANCY_FLAGGED"
    | "FIELD_CORRECTED"
    | "RECONCILIATION_RUN"
    | "SUBMITTED_TO_PAYER"
    | "DECISION_RECORDED"
    | "STATUS_TRANSITION"
    | "DEMO_DATA_RESET";
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface InsuranceClaim {
  payerName: string;
  payerId?: string;
  policyNumber: string;
  groupNumber?: string;
  priorAuthNumber?: string;
  coverageStatus: "active" | "inactive" | "pending_verification";
  claimType?: "Cashless" | "Reimbursement";
}

export interface ClaimEvent {
  id: string;
  claimRef: string;
  claimId?: string;
  eventType: string;
  actor: string;
  actorRole: string;
  beforeState?: string | null;
  afterState?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Root aggregate Claim model for BillBridge.
 */
export interface Claim {
  id: string;
  claimNumber: string;
  claimRef?: string;
  patientRef?: string;
  policyRef?: string;
  hospitalRef?: string;
  admissionDate?: string;
  dischargeDate?: string;
  idempotencyKey?: string;
  claimType?: "Cashless" | "Reimbursement";
  document: Document;
  patient: PatientFields;
  hospital: HospitalFields;
  insurance?: InsuranceClaim;
  lineItems: LineItem[];
  totals: Totals;
  issues: AuditIssue[];
  status: ClaimStatus;
  latestDecision?: ReviewDecision;
  auditLog: AuditEvent[];
  createdAt: string;
  updatedAt: string;
  isSyntheticDemo: boolean;
}

// ── 8. STATUS TRANSITIONS STATE MACHINE ──

export interface StatusTransitionRule {
  from: ClaimStatus;
  to: ClaimStatus;
  allowedRoles: UserRole[];
  guardCondition: string;
  description: string;
}

export const CLAIM_STATUS_TRANSITIONS: StatusTransitionRule[] = [
  {
    from: "draft",
    to: "ingesting",
    allowedRoles: ["hospital_staff", "hospital_admin", "patient"],
    guardCondition: "Document file uploaded and queued for OCR",
    description: "Begins document optical character extraction.",
  },
  {
    from: "ingesting",
    to: "extracted",
    allowedRoles: ["hospital_staff", "hospital_admin", "patient"],
    guardCondition: "Extraction completed with zero arithmetic issues",
    description:
      "AI vision extraction succeeded with 100% math reconciliation.",
  },
  {
    from: "ingesting",
    to: "flagged",
    allowedRoles: ["hospital_staff", "hospital_admin", "patient"],
    guardCondition:
      "Extraction produced one or more discrepancy flags or unreadable fields",
    description: "Flags claim for human-in-the-loop audit before submission.",
  },
  {
    from: "flagged",
    to: "under_review",
    allowedRoles: ["hospital_staff", "hospital_admin", "insurer_reviewer", "insurer_admin"],
    guardCondition: "Staff resolves math errors or routes claim to adjudicator",
    description: "Claim submitted to review queue for evaluation.",
  },
  {
    from: "extracted",
    to: "under_review",
    allowedRoles: ["hospital_staff", "hospital_admin", "patient"],
    guardCondition: "Claim verified and submitted to insurer",
    description: "Claim delivered to insurer adjudication queue.",
  },
  {
    from: "under_review",
    to: "approved",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Math reconciled and policy requirements satisfied",
    description: "Insurer adjudicator formally approves claim.",
  },
  {
    from: "under_review",
    to: "rejected",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Reconciliation failed or non-covered items detected",
    description: "Claim denied with formal explanation notice.",
  },
  {
    from: "under_review",
    to: "requires_information",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Reviewer flags missing clinical records or tariff clarification",
    description: "Adjudicator issues formal query to hospital billing team.",
  },
  {
    from: "flagged",
    to: "approved",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition:
      "Insurer adjudicator investigates flags, exercises discretion, and approves encounter",
    description:
      "Insurer adjudicator formally approves flagged claim after review.",
  },
  {
    from: "flagged",
    to: "rejected",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition:
      "Severe non-compliance or irreconcilable billing discrepancy detected",
    description: "Insurer adjudicator denies non-compliant encounter.",
  },
  {
    from: "flagged",
    to: "requires_information",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Reviewer flags missing clinical records or tariff clarification",
    description: "Adjudicator issues formal query to hospital billing team.",
  },
  {
    from: "flagged",
    to: "flagged",
    allowedRoles: ["insurer_reviewer", "insurer_admin", "hospital_staff", "hospital_admin"],
    guardCondition:
      "Reviewer attaches query note or hospital provides updated evidence",
    description: "Maintains inquiry flag with audit rationale.",
  },
  {
    from: "requires_information",
    to: "under_review",
    allowedRoles: ["hospital_staff", "hospital_admin", "insurer_reviewer", "insurer_admin", "patient"],
    guardCondition: "Hospital staff submits queried documents or medical clarification",
    description: "Returns claim to review queue after document submission.",
  },
  {
    from: "requires_information",
    to: "approved",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Submitted documents satisfactorily address all queries",
    description: "Adjudicator approves claim upon clarification.",
  },
  {
    from: "requires_information",
    to: "rejected",
    allowedRoles: ["insurer_reviewer", "insurer_admin"],
    guardCondition: "Hospital fails to provide required documentation",
    description: "Claim denied due to unverified clinical necessity.",
  },
  {
    from: "approved",
    to: "settled",
    allowedRoles: ["insurer_reviewer", "insurer_admin", "platform_admin"],
    guardCondition: "Bank disbursement executed with valid NEFT/RTGS UTR",
    description: "Payment disbursed and reconciled into hospital accounts.",
  },
  {
    from: "rejected",
    to: "flagged",
    allowedRoles: ["hospital_staff", "hospital_admin"],
    guardCondition: "Hospital billing specialist prepares corrected appeal",
    description: "Re-opens claim for dispute and correction.",
  },
  {
    from: "under_review",
    to: "flagged",
    allowedRoles: ["insurer_reviewer", "insurer_admin", "hospital_staff", "hospital_admin"],
    guardCondition:
      "Reviewer flags discrepancies requiring hospital staff clarification",
    description: "Returns claim to flagged queue for revision.",
  },
  {
    from: "extracted",
    to: "flagged",
    allowedRoles: ["hospital_staff", "hospital_admin", "patient"],
    guardCondition: "Discrepancy identified needing manual review",
    description: "Flags extracted claim for correction.",
  },
];

export function canTransitionStatus(
  from: ClaimStatus,
  to: ClaimStatus,
  role: UserRole,
): boolean {
  if (from === to) {
    // Only permitted if the role is authorized to interact with this state in the state machine
    return CLAIM_STATUS_TRANSITIONS.some(
      (rule) =>
        (rule.from === from || rule.to === to) &&
        rule.allowedRoles.includes(role),
    );
  }
  return CLAIM_STATUS_TRANSITIONS.some(
    (rule) =>
      rule.from === from && rule.to === to && rule.allowedRoles.includes(role),
  );
}

export function getAllowedNextStatuses(
  currentStatus: ClaimStatus,
  role: UserRole,
): StatusTransitionRule[] {
  return CLAIM_STATUS_TRANSITIONS.filter(
    (rule) => rule.from === currentStatus && rule.allowedRoles.includes(role),
  );
}

// ── 9. ROLE PERMISSIONS MATRIX ──

export type PermissionAction =
  | "CLAIM_CREATE"
  | "DOCUMENT_UPLOAD"
  | "LINE_ITEM_EDIT"
  | "CODE_OVERRIDE"
  | "RUN_RECONCILIATION"
  | "SUBMIT_TO_PAYER"
  | "APPROVE_CLAIM"
  | "REJECT_CLAIM"
  | "EXPORT_DATA"
  | "VIEW_AUDIT_LOG"
  | "RESET_DEMO_DATA";

export const ROLE_PERMISSIONS: Record<
  UserRole,
  Record<PermissionAction, boolean>
> = {
  hospital_staff: {
    CLAIM_CREATE: true,
    DOCUMENT_UPLOAD: true,
    LINE_ITEM_EDIT: true,
    CODE_OVERRIDE: true,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: true,
    APPROVE_CLAIM: false, // Hospital cannot approve its own claim for payment
    REJECT_CLAIM: false,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  hospital_admin: {
    CLAIM_CREATE: true,
    DOCUMENT_UPLOAD: true,
    LINE_ITEM_EDIT: true,
    CODE_OVERRIDE: true,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: true,
    APPROVE_CLAIM: false,
    REJECT_CLAIM: false,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  insurer_reviewer: {
    CLAIM_CREATE: false,
    DOCUMENT_UPLOAD: false,
    LINE_ITEM_EDIT: false, // Insurer audits, does not tamper with provider's original bill
    CODE_OVERRIDE: false,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: false,
    APPROVE_CLAIM: true,
    REJECT_CLAIM: true,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  insurer_admin: {
    CLAIM_CREATE: false,
    DOCUMENT_UPLOAD: false,
    LINE_ITEM_EDIT: false,
    CODE_OVERRIDE: false,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: false,
    APPROVE_CLAIM: true,
    REJECT_CLAIM: true,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  patient: {
    CLAIM_CREATE: true,
    DOCUMENT_UPLOAD: true,
    LINE_ITEM_EDIT: false,
    CODE_OVERRIDE: false,
    RUN_RECONCILIATION: false,
    SUBMIT_TO_PAYER: false,
    APPROVE_CLAIM: false,
    REJECT_CLAIM: false,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  platform_admin: {
    CLAIM_CREATE: true,
    DOCUMENT_UPLOAD: true,
    LINE_ITEM_EDIT: true,
    CODE_OVERRIDE: true,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: true,
    APPROVE_CLAIM: true,
    REJECT_CLAIM: true,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
  super_admin: {
    CLAIM_CREATE: true,
    DOCUMENT_UPLOAD: true,
    LINE_ITEM_EDIT: true,
    CODE_OVERRIDE: true,
    RUN_RECONCILIATION: true,
    SUBMIT_TO_PAYER: true,
    APPROVE_CLAIM: true,
    REJECT_CLAIM: true,
    EXPORT_DATA: true,
    VIEW_AUDIT_LOG: true,
    RESET_DEMO_DATA: true,
  },
};

export function hasPermission(
  role: UserRole,
  action: PermissionAction,
): boolean {
  return ROLE_PERMISSIONS[role]?.[action] ?? false;
}

// ── 10. ROUTE MAP CONTRACTS ──

export interface RouteConfig {
  path: string;
  title: string;
  breadcrumbLabel: string;
  allowedRoles: UserRole[];
  navIconKey: string;
  description: string;
}

export const APP_ROUTES: Record<string, RouteConfig> = {
  dashboard: {
    path: "/dashboard",
    title: "Reconciliation Dashboard",
    breadcrumbLabel: "Dashboard",
    allowedRoles: ["hospital_staff", "insurer_reviewer", "patient"],
    navIconKey: "LayoutDashboard",
    description:
      "Volume metrics, discrepancy counters, and recent claims overview.",
  },
  upload: {
    path: "/upload",
    title: "Document Ingestion & OCR",
    breadcrumbLabel: "Upload & Extract",
    allowedRoles: ["hospital_staff", "patient"],
    navIconKey: "UploadCloud",
    description:
      "Upload bill images or PDFs for multi-stage vision extraction.",
  },
  queue: {
    path: "/queue",
    title: "Insurer Review Queue",
    breadcrumbLabel: "Review Queue",
    allowedRoles: ["insurer_reviewer", "hospital_staff"],
    navIconKey: "CheckSquare",
    description:
      "Triage and adjudicate medical encounters with audit findings and source document reconciliation.",
  },
  claims: {
    path: "/claims",
    title: "Claims Registry",
    breadcrumbLabel: "Claims Registry",
    allowedRoles: ["hospital_staff", "insurer_reviewer", "patient"],
    navIconKey: "FileSpreadsheet",
    description:
      "Search, filter, and inspect claim encounters across providers.",
  },
  review: {
    path: "/review/:id",
    title: "Reconciliation Workspace",
    breadcrumbLabel: "Review",
    allowedRoles: ["hospital_staff", "insurer_reviewer", "patient"],
    navIconKey: "CheckSquare",
    description:
      "Side-by-side reconciliation, editable items, and adjudicator decisions.",
  },
  designSystem: {
    path: "/design-system",
    title: "Design System Showcase",
    breadcrumbLabel: "Design System",
    allowedRoles: ["hospital_staff", "insurer_reviewer", "patient"],
    navIconKey: "Palette",
    description:
      "Visual component kit, Apple-calm tokens, and accessibility demo.",
  },
};

// ── 11. API REQUEST & RESPONSE SHAPES ──

export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: ClaimStatus | "all";
  status?: ClaimStatus | "all";
  roleFilter?: UserRole;
  startDate?: string;
  endDate?: string;
  sortBy?:
    | "createdAt"
    | "claimedTotal"
    | "patientName"
    | "providerName"
    | "statementDate";
  sortDirection?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ExtractionRequest {
  file: File | Blob;
  presetId?: "discrepancy" | "clean" | "missing_codes";
  documentTypeHint?: Document["documentType"];
  pageCount?: number;
  simulateFailure?: boolean;
}

export interface ExtractionResponse {
  claim: Claim;
  rawOcrText?: string;
  confidenceAverage: number;
  processingDurationMs: number;
}

export interface LineItemCorrectionRequest {
  claimId: string;
  lineItemId: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  code?: string;
  description?: string;
  reason: string;
  actorRole: UserRole;
  actorName: string;
}

export interface ReviewDecisionRequest {
  claimId: string;
  outcome: DecisionOutcome;
  rationale: string;
  adjudicatorRole: UserRole;
  adjudicatorName: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export interface AsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
}

// ── 12. SHARED DATA-ACCESS INTERFACE (SEPARATION OF CONCERNS) ──

/**
 * IDataAccess defines the contract for all data operations.
 * UI components interact ONLY with this interface, never directly with Supabase,
 * Gemini API, or n8n webhooks.
 */
export interface IDataAccess {
  readonly adapterName: string;
  readonly mode: "mock" | "supabase";

  // Claims Repository
  getClaims(query?: PaginatedQuery): Promise<PaginatedResponse<Claim>>;
  getClaimById(id: string): Promise<Claim | null>;
  saveClaim(claim: Claim): Promise<Claim>;
  updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    actorRole: UserRole,
    reason?: string,
  ): Promise<Claim>;
  applyLineItemCorrection(
    correction: LineItemCorrectionRequest,
  ): Promise<Claim>;
  recordDecision(decision: ReviewDecisionRequest): Promise<Claim>;
  resetDemoData(): Promise<Claim[]>;

  extractBillDocument(
    request: ExtractionRequest,
    onProgress?: (step: ExtractionProgressStep) => void,
    signal?: AbortSignal,
  ): Promise<ExtractionResponse>;

  // Workflow / Webhook Provider (n8n Boundary)
  dispatchWorkflowEvent(
    eventType: string,
    claim: Claim,
    actorRole: UserRole,
  ): Promise<{ dispatched: boolean; receiptId: string }>;
}
