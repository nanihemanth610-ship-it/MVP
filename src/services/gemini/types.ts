/**
 * BillBridge Gemini Vision Provider Interface & Runtime Schemas
 *
 * Strict typing and runtime schema validation for multimodal document extraction.
 * Treats all document contents as untrusted data.
 * Zero PHI logging: No patient identifiers or medical texts in logs.
 */

import { z } from "zod";

export const MedicalCodeTypeSchema = z.enum([
  "CPT",
  "HCPCS",
  "REV",
  "INTERNAL",
  "UNKNOWN",
]);

export const ExtractedLineItemSchema = z.object({
  lineNumber: z.number().int().positive(),
  code: z.string().trim().nullable().optional(),
  codeType: MedicalCodeTypeSchema.default("CPT"),
  description: z.string().min(1, "Description cannot be empty"),
  serviceDate: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  confidenceScore: z.number().min(0).max(1).default(0.95),
  notes: z.string().nullable().optional(),
  isUnreadable: z.boolean().default(false),
  unreadableReason: z.string().nullable().optional(),
});

export const ExtractedProviderSchema = z.object({
  name: z.string().nullable().optional(),
  npiOrRohiniId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  facilityType: z.string().nullable().optional(),
});

export const ExtractedPatientSchema = z.object({
  name: z.string().nullable().optional(),
  patientId: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
});

export const GeminiBillExtractionSchema = z.object({
  provider: ExtractedProviderSchema,
  patient: ExtractedPatientSchema,
  statementDate: z.string().nullable().optional(),
  serviceStartDate: z.string().nullable().optional(),
  serviceEndDate: z.string().nullable().optional(),
  statedBilledTotal: z.number().nonnegative().nullable().optional(),
  patientResponsibility: z.number().nonnegative().nullable().optional(),
  insurancePaid: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("INR"),
  lineItems: z
    .array(ExtractedLineItemSchema)
    .min(1, "At least one line item must be extracted"),
  rawExtractionConfidence: z.number().min(0).max(1).default(0.9),
  documentChecksumSha256: z.string().optional(),
});

export type ExtractedLineItem = z.infer<typeof ExtractedLineItemSchema>;
export type ExtractedProvider = z.infer<typeof ExtractedProviderSchema>;
export type ExtractedPatient = z.infer<typeof ExtractedPatientSchema>;
export type GeminiBillExtraction = z.infer<typeof GeminiBillExtractionSchema>;

export interface ProviderExecutionMetrics {
  durationMs: number;
  attempts: number;
  model: string;
  finishReason?: string;
  fileSizeBytes: number;
  mimeType: string;
  pageCount: number;
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
  isMockDemo: boolean;
}

export interface ExtractionResponse {
  data: GeminiBillExtraction;
  metrics: ProviderExecutionMetrics;
}

export interface ExtractionOptions {
  model?: string; // Defaults to "gemini-2.5-flash"
  timeoutMs?: number; // Defaults to 30,000 ms
  maxRetries?: number; // Defaults to 3 bounded retries
  initialRetryDelayMs?: number; // Defaults to 1,000 ms
  pageCount?: number;
  signal?: AbortSignal;
}

export interface IGeminiVisionProvider {
  readonly providerName: string;
  readonly isDemo: boolean;

  extractBillFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    mimeType: string,
    options?: ExtractionOptions,
  ): Promise<ExtractionResponse>;
}
