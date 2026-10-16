/**
 * BillBridge Explicit Data Mapping Layer
 *
 * Implements bidirectional mappings between:
 * 1. n8n workflow payload contracts (e.g. claim_ref, claim_type, patient_name, policy_number, hospital_id, admission_date, bill_items)
 * 2. Supabase PostgreSQL schema (public.claims, public.claim_events)
 * 3. Frontend typed models (Claim, ClaimRecord, LineItem, AuditEvent)
 *
 * SAFETY CONSTRAINT:
 * Database fields may be patient_ref, policy_ref, hospital_ref while n8n payload names
 * may use patient_name, policy_number, hospital_id. This module provides an explicit
 * mapping layer rather than assuming names match.
 */

import type { ClaimRecord, LineItem, AuditEntry } from "@/types/claim";
import type { Database } from "@/types/database";

export type DbClaimRow = Database["public"]["Tables"]["claims"]["Row"];
export type DbClaimInsert = Database["public"]["Tables"]["claims"]["Insert"];
export type DbClaimEventRow =
  Database["public"]["Tables"]["claim_events"]["Row"];
export type DbClaimEventInsert =
  Database["public"]["Tables"]["claim_events"]["Insert"];

/**
 * n8n Webhook Ingestion & Egress Payload Definition
 */
export interface N8nClaimPayload {
  claim_ref: string;
  claim_type: "Cashless" | "Reimbursement";
  patient_name: string;
  patient_ref: string;
  policy_number: string;
  policy_ref: string;
  hospital_id: string;
  hospital_ref: string;
  provider_name: string;
  admission_date: string;
  discharge_date: string;
  statement_date: string;
  stated_billed_total: number;
  itemized_sum_total: number;
  variance: number;
  bill_items: Array<{
    line_number: number;
    code: string | null;
    code_type: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    confidence_score: number;
    notes?: string;
  }>;
  status: string;
  patient_consent: boolean;
  idempotency_key: string;
  is_synthetic_demo: boolean;
}

export interface N8nClaimEventPayload {
  claim_ref: string;
  event_type: string;
  actor: string;
  actor_role: string;
  before_state: string | null;
  after_state: string | null;
  note: string | null;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Map a ClaimRecord to the explicit n8n payload format
 */
export function mapClaimToN8nPayload(
  claim: ClaimRecord,
  patientConsent: boolean = true,
  idempotencyKey?: string,
): N8nClaimPayload {
  const claimRef = claim.claimRef || claim.claimNumber;
  const policyNum =
    claim.policyNumber || claim.policyRef || `POL-${claim.bill.patientId}-2026`;
  const hospitalId =
    claim.hospitalId ||
    claim.hospitalRef ||
    claim.bill.providerNpi ||
    "HOSP-001";

  return {
    claim_ref: claimRef,
    claim_type: claim.claimType || "Cashless",
    patient_name: claim.bill.patientName,
    patient_ref: claim.patientRef || claim.bill.patientId,
    policy_number: policyNum,
    policy_ref: policyNum,
    hospital_id: hospitalId,
    hospital_ref: hospitalId,
    provider_name: claim.bill.providerName,
    admission_date:
      claim.admissionDate ||
      claim.bill.serviceStartDate ||
      claim.bill.statementDate,
    discharge_date:
      claim.dischargeDate ||
      claim.bill.serviceEndDate ||
      claim.bill.statementDate,
    statement_date: claim.bill.statementDate,
    stated_billed_total: claim.claimedTotal,
    itemized_sum_total: claim.calculatedTotal,
    variance: claim.variance,
    bill_items: claim.lineItems.map((li, idx) => ({
      line_number: idx + 1,
      code: li.code || null,
      code_type: li.codeType || "CPT",
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unitPrice,
      total_price: li.totalPrice,
      confidence_score: li.confidenceScore,
      notes: li.notes,
    })),
    status: claim.status,
    patient_consent: patientConsent,
    idempotency_key:
      idempotencyKey ||
      claim.idempotencyKey ||
      `idem-${claimRef}-${Date.now()}`,
    is_synthetic_demo: claim.isSyntheticDemo ?? true,
  };
}

/**
 * Map an n8n Claim payload to the Supabase public.claims insert record
 */
export function mapN8nPayloadToDbClaim(
  payload: N8nClaimPayload,
  createdByUserId: string,
): DbClaimInsert {
  return {
    claim_ref: payload.claim_ref,
    claim_number: payload.claim_ref,
    patient_ref: payload.patient_ref,
    patient_id: payload.patient_ref,
    patient_name: payload.patient_name,
    policy_ref: payload.policy_ref,
    policy_number: payload.policy_number,
    hospital_ref: payload.hospital_ref,
    hospital_id: payload.hospital_id,
    provider_name: payload.provider_name,
    admission_date: payload.admission_date,
    discharge_date: payload.discharge_date,
    statement_date: payload.statement_date,
    service_start_date: payload.admission_date,
    service_end_date: payload.discharge_date,
    claim_type: payload.claim_type,
    status: (payload.status as DbClaimInsert["status"]) || "extracted",
    stated_billed_total: payload.stated_billed_total,
    itemized_sum_total: payload.itemized_sum_total,
    variance: payload.variance,
    bill_items:
      payload.bill_items as unknown as Database["public"]["Tables"]["claims"]["Insert"]["bill_items"],
    idempotency_key: payload.idempotency_key,
    created_by: createdByUserId,
    is_synthetic_demo: payload.is_synthetic_demo,
  };
}

/**
 * Map Supabase public.claims Row to domain ClaimRecord
 */
export function mapDbClaimToRecord(
  row: DbClaimRow,
  events: DbClaimEventRow[] = [],
): ClaimRecord {
  const billItemsRaw =
    (row.bill_items as Array<{
      id?: string;
      code?: string | null;
      code_type?: string;
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      confidence_score?: number;
      notes?: string;
    }>) || [];

  const lineItems: LineItem[] = billItemsRaw.map((item, idx) => ({
    id: item.id || `li-${row.id}-${idx + 1}`,
    code: item.code || "",
    codeType: (item.code_type as LineItem["codeType"]) || "CPT",
    description: item.description || "Medical Service",
    quantity: item.quantity || 1,
    unitPrice: item.unit_price || 0,
    totalPrice: item.total_price || 0,
    confidence: (item.confidence_score ?? 1.0) >= 0.85 ? "high" : "medium",
    confidenceScore: item.confidence_score ?? 0.95,
    notes: item.notes,
  }));

  const auditTrail: AuditEntry[] = events.map((ev) => ({
    id: ev.id,
    timestamp: ev.timestamp,
    action: ev.event_type,
    userRole: (ev.actor_role as AuditEntry["userRole"]) || "hospital_staff",
    actorName: ev.actor,
    details: ev.note || `Event ${ev.event_type} recorded`,
    previousValue: ev.before_state || undefined,
    newValue: ev.after_state || undefined,
  }));

  return {
    id: row.id,
    claimNumber: row.claim_number,
    claimRef: row.claim_ref,
    claimType: row.claim_type,
    patientRef: row.patient_ref || row.patient_id,
    policyRef: row.policy_ref || row.policy_number || undefined,
    hospitalRef: row.hospital_ref || row.hospital_id || undefined,
    hospitalId: row.hospital_id || undefined,
    admissionDate: row.admission_date || undefined,
    dischargeDate: row.discharge_date || undefined,
    policyNumber: row.policy_number || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    isSyntheticDemo: row.is_synthetic_demo,
    bill: {
      id: row.document_id || `doc-${row.id}`,
      fileName: `${row.claim_ref}_invoice.pdf`,
      fileSize: 450000,
      mimeType: "application/pdf",
      uploadedAt: row.created_at,
      providerName: row.provider_name,
      providerNpi: row.hospital_ref || row.hospital_id || "",
      providerAddress: row.provider_address || "",
      patientName: row.patient_name,
      patientId: row.patient_id || row.patient_ref || "",
      accountNumber: row.patient_account_number || `ACC-${row.patient_id}`,
      statementDate: row.statement_date || row.created_at,
      serviceStartDate:
        row.service_start_date || row.admission_date || row.created_at,
      serviceEndDate:
        row.service_end_date || row.discharge_date || row.created_at,
      billedTotal: Number(row.stated_billed_total),
      patientResponsibility: row.patient_responsibility
        ? Number(row.patient_responsibility)
        : undefined,
      insurancePaid: row.insurance_paid
        ? Number(row.insurance_paid)
        : undefined,
    },
    lineItems,
    claimedTotal: Number(row.stated_billed_total),
    calculatedTotal: Number(row.itemized_sum_total),
    variance: Number(row.variance),
    discrepancies:
      Number(row.variance) !== 0
        ? [
            {
              id: `disc-variance-${row.id}`,
              type: "arithmetic_mismatch",
              severity: "error",
              message: `Variance of ₹${Math.abs(Number(row.variance)).toLocaleString("en-IN")} detected against stated bill total.`,
              expectedValue: Number(row.itemized_sum_total),
              actualValue: Number(row.stated_billed_total),
            },
          ]
        : [],
    status: row.status,
    auditTrail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedReviewer: row.assigned_reviewer_id || undefined,
    reviewerNotes: row.reviewer_notes || undefined,
    submissionNotes: row.submission_notes || undefined,
  };
}

/**
 * Map an event to the public.claim_events format
 */
export function mapEventToDbClaimEvent(
  claimRef: string,
  claimId: string | null,
  eventType: string,
  actor: string,
  actorRole: string,
  beforeState: string | null,
  afterState: string | null,
  note: string | null,
  metadata: Record<string, unknown> = {},
): DbClaimEventInsert {
  return {
    claim_ref: claimRef,
    claim_id: claimId,
    event_type: eventType,
    actor,
    actor_role: actorRole,
    before_state: beforeState,
    after_state: afterState,
    note,
    metadata:
      metadata as unknown as Database["public"]["Tables"]["claim_events"]["Insert"]["metadata"],
    timestamp: new Date().toISOString(),
  };
}
