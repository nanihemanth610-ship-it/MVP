-- ============================================================================
-- Migration: 20261016000000_billbridge_schema.sql
-- Description: Core schema for BillBridge medical billing and claim reconciliation.
-- Entities: user_profiles, documents, claims, line_items, audit_issues, review_decisions, claim_events
-- Rollback: DROP TABLE IF EXISTS claim_events, audit_events, review_decisions, audit_issues, line_items, claims, documents, user_profiles CASCADE;
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
CREATE TYPE public.user_role AS ENUM (
  'hospital_staff',
  'insurer_reviewer',
  'patient'
);

CREATE TYPE public.claim_status AS ENUM (
  'draft',
  'extracted',
  'flagged',
  'under_review',
  'approved',
  'rejected'
);

CREATE TYPE public.discrepancy_severity AS ENUM (
  'critical',
  'warning',
  'info',
  'error'
);

CREATE TYPE public.review_decision_outcome AS ENUM (
  'approved',
  'rejected',
  'query',
  'requires_information'
);

-- 3. COMMON UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'hospital_staff',
  display_name text,
  email text,
  organization_name text,
  patient_identifier text, -- Matches patient_ref for patient accounts (e.g. PT-34901)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. DOCUMENTS TABLE
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_path text NOT NULL, -- Path within private 'medical-bills' storage bucket
  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 15728640), -- Max 15MB
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  page_count integer NOT NULL DEFAULT 1 CHECK (page_count >= 1),
  checksum_sha256 text,
  is_synthetic_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. CLAIMS TABLE
-- Supports both standard and n8n webhook mapped field names
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_ref text NOT NULL UNIQUE,       -- Standard n8n & database reference
  claim_number text NOT NULL UNIQUE,    -- Synonym/alias for display
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text UNIQUE,          -- Prevents duplicate submissions

  -- Patient Information
  patient_ref text NOT NULL,            -- e.g. PT-34901
  patient_id text NOT NULL,             -- Synonym
  patient_name text NOT NULL,
  patient_dob date,
  patient_account_number text,

  -- Provider / Hospital Information
  hospital_ref text,                   -- e.g. ROHINI-BLR-0412
  hospital_id text,                    -- Synonym
  provider_name text NOT NULL,
  provider_npi text,
  provider_address text,

  -- Dates and Encounter Classification
  admission_date date,                 -- Inpatient admission date
  discharge_date date,                 -- Inpatient discharge date
  statement_date date,
  service_start_date date,
  service_end_date date,
  claim_type text NOT NULL DEFAULT 'Reimbursement' CHECK (claim_type IN ('Cashless', 'Reimbursement')),
  status public.claim_status NOT NULL DEFAULT 'draft',

  -- Financial Totals (Numeric precision for Indian Rupee calculations)
  stated_billed_total numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (stated_billed_total >= 0),
  itemized_sum_total numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (itemized_sum_total >= 0),
  variance numeric(12, 2) NOT NULL DEFAULT 0.00,

  -- Insurance & TPA Details
  policy_ref text,                     -- Policy number or TPA identifier
  policy_number text,                  -- Synonym
  payer_name text,
  patient_responsibility numeric(12, 2) DEFAULT 0.00 CHECK (patient_responsibility >= 0),
  insurance_paid numeric(12, 2) DEFAULT 0.00 CHECK (insurance_paid >= 0),

  -- Raw & Normalized Line Items (JSON payload from n8n / Gemini)
  bill_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Triage and Workflow
  assigned_reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text,
  submission_notes text,
  is_synthetic_demo boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. LINE ITEMS TABLE (Normalized relational items)
CREATE TABLE public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  line_number integer NOT NULL CHECK (line_number >= 1),

  -- Medical Coding
  code text,
  code_type text NOT NULL DEFAULT 'CPT' CHECK (code_type IN ('CPT', 'HCPCS', 'REV', 'INTERNAL', 'UNKNOWN')),
  description text NOT NULL,
  service_date date,

  -- Quantities & Rates
  quantity numeric(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  total_price numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
  expected_total numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (expected_total >= 0),
  is_math_mismatch boolean NOT NULL DEFAULT false,

  -- OCR Extraction Quality & Verification
  confidence_score numeric(3, 2) NOT NULL DEFAULT 1.00 CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  extraction_status text NOT NULL DEFAULT 'readable' CHECK (extraction_status IN ('readable', 'unreadable', 'low_confidence', 'corrected')),
  unreadable_reason text,
  notes text,
  is_manual_edit boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_claim_line_number UNIQUE (claim_id, line_number)
);

CREATE TRIGGER update_line_items_updated_at
  BEFORE UPDATE ON public.line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. AUDIT ISSUES TABLE (Discrepancies flagged by deterministic audit engine)
CREATE TABLE public.audit_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  line_item_id uuid REFERENCES public.line_items(id) ON DELETE SET NULL,

  code text NOT NULL,
  category text NOT NULL,
  severity public.discrepancy_severity NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  field_key text,
  expected_value text,
  actual_value text,
  suggested_action text,

  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_audit_issues_updated_at
  BEFORE UPDATE ON public.audit_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. REVIEW DECISIONS TABLE (Adjudications by insurer reviewers)
CREATE TABLE public.review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  adjudicator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  adjudicator_role text NOT NULL DEFAULT 'insurer_reviewer',
  adjudicator_name text NOT NULL,

  outcome public.review_decision_outcome NOT NULL,
  rationale text NOT NULL,
  formal_notice_generated boolean NOT NULL DEFAULT true,
  notification_dispatched_patient boolean NOT NULL DEFAULT false,
  notification_dispatched_hospital boolean NOT NULL DEFAULT false,

  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. CLAIM EVENTS TABLE (Explicit n8n Claim Event node destination)
CREATE TABLE public.claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_ref text NOT NULL,              -- References claims.claim_ref
  claim_id uuid REFERENCES public.claims(id) ON DELETE CASCADE,
  event_type text NOT NULL,             -- e.g. CLAIM_CREATED, UNDER_REVIEW, DECISION_RECORDED
  actor text NOT NULL,                  -- Name or email of actor
  actor_role text NOT NULL DEFAULT 'system',
  before_state text,                    -- Status prior to transition
  after_state text,                     -- Status after transition
  note text,                            -- Rationale or human review summary
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backwards compatibility view for audit_events queries
CREATE OR REPLACE VIEW public.audit_events AS
SELECT
  id,
  claim_id,
  NULL::uuid AS actor_id,
  actor_role,
  actor AS actor_name,
  event_type,
  COALESCE(note, event_type) AS summary,
  metadata,
  timestamp,
  created_at
FROM public.claim_events;

-- 11. INDEXES FOR HIGH-PERFORMANCE QUERYING & ISOLATION
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_patient_id ON public.user_profiles(patient_identifier);

CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

CREATE INDEX idx_claims_claim_ref ON public.claims(claim_ref);
CREATE INDEX idx_claims_claim_number ON public.claims(claim_number);
CREATE INDEX idx_claims_created_by ON public.claims(created_by);
CREATE INDEX idx_claims_patient_ref ON public.claims(patient_ref);
CREATE INDEX idx_claims_patient_id ON public.claims(patient_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_statement_date ON public.claims(statement_date DESC);
CREATE INDEX idx_claims_idempotency_key ON public.claims(idempotency_key);
CREATE INDEX idx_claims_assigned_reviewer ON public.claims(assigned_reviewer_id);

CREATE INDEX idx_line_items_claim_id ON public.line_items(claim_id);
CREATE INDEX idx_line_items_code ON public.line_items(code);

CREATE INDEX idx_audit_issues_claim_id ON public.audit_issues(claim_id);
CREATE INDEX idx_audit_issues_severity ON public.audit_issues(severity);
CREATE INDEX idx_audit_issues_is_resolved ON public.audit_issues(is_resolved);

CREATE INDEX idx_review_decisions_claim_id ON public.review_decisions(claim_id);
CREATE INDEX idx_review_decisions_adjudicator ON public.review_decisions(adjudicator_id);

CREATE INDEX idx_claim_events_claim_ref ON public.claim_events(claim_ref);
CREATE INDEX idx_claim_events_claim_id ON public.claim_events(claim_id);
CREATE INDEX idx_claim_events_timestamp ON public.claim_events(timestamp DESC);
