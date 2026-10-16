/**
 * BillBridge Zod Validation Schemas
 * Enforces strict typing and data sanitization for untrusted AI extraction and user inputs.
 */

import { z } from "zod";

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export const UserRoleSchema = z.enum([
  "hospital_staff",
  "insurer_reviewer",
  "patient",
]);
export const ClaimStatusSchema = z.enum([
  "draft",
  "extracted",
  "flagged",
  "under_review",
  "approved",
  "rejected",
]);

export const DiscrepancySeveritySchema = z.enum(["info", "warning", "error"]);
export const DiscrepancyTypeSchema = z.enum([
  "arithmetic_mismatch",
  "line_item_math_error",
  "missing_code",
  "duplicate_item",
  "unbundling_suspected",
  "rate_threshold_exceeded",
  "missing_patient_id",
]);

export const DiscrepancySchema = z.object({
  id: z.string().min(1),
  type: DiscrepancyTypeSchema,
  severity: DiscrepancySeveritySchema,
  message: z.string().min(1),
  lineItemId: z.string().optional(),
  field: z.string().optional(),
  expectedValue: z.union([z.string(), z.number()]).optional(),
  actualValue: z.union([z.string(), z.number()]).optional(),
  suggestedFix: z.string().optional(),
});

export const LineItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim(),
  codeType: z.enum(["CPT", "HCPCS", "REV", "INTERNAL", "UNKNOWN"]).optional(),
  description: z.string().min(1, "Description is required"),
  serviceDate: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  totalPrice: z.number().nonnegative("Total price must be non-negative"),
  confidence: ConfidenceLevelSchema,
  confidenceScore: z.number().min(0).max(1),
  notes: z.string().optional(),
  isManualEdit: z.boolean().optional(),
  originalValues: z
    .object({
      code: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      totalPrice: z.number().optional(),
    })
    .optional(),
});

export const BillDocumentSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().nonnegative(),
  mimeType: z.string(),
  uploadedAt: z.string(),
  previewUrl: z.string().optional(),
  providerName: z.string().min(1, "Healthcare provider name is required"),
  providerNpi: z.string().optional(),
  providerAddress: z.string().optional(),
  patientName: z.string().min(1, "Patient name is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  statementDate: z.string().min(1, "Statement date is required"),
  serviceStartDate: z.string().min(1, "Service start date is required"),
  serviceEndDate: z.string().min(1, "Service end date is required"),
  billedTotal: z.number().nonnegative("Billed total must be non-negative"),
  patientResponsibility: z.number().nonnegative().optional(),
  insurancePaid: z.number().nonnegative().optional(),
});

export const AuditEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string(),
  action: z.string(),
  userRole: UserRoleSchema,
  actorName: z.string(),
  details: z.string(),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
});

export const ClaimRecordSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  bill: BillDocumentSchema,
  lineItems: z.array(LineItemSchema),
  claimedTotal: z.number().nonnegative(),
  calculatedTotal: z.number().nonnegative(),
  variance: z.number(),
  discrepancies: z.array(DiscrepancySchema),
  status: ClaimStatusSchema,
  auditTrail: z.array(AuditEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedReviewer: z.string().optional(),
  reviewerNotes: z.string().optional(),
  submissionNotes: z.string().optional(),
});

export type ValidatedLineItem = z.infer<typeof LineItemSchema>;
export type ValidatedBillDocument = z.infer<typeof BillDocumentSchema>;
export type ValidatedClaimRecord = z.infer<typeof ClaimRecordSchema>;
