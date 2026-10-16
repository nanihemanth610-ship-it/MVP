-- ============================================================================
-- Migration: 20261016000001_storage_and_rls.sql
-- Description: Private storage configuration and Row Level Security (RLS) policies
--              for hospital_staff, insurer_reviewer, and patient roles.
-- Rollback: Disable RLS and drop storage policies.
-- ============================================================================

-- 1. PRIVATE STORAGE BUCKET: medical-bills
-- Public access is FALSE (private). File size limit: 15MB. Allowed MIME types: PDF, PNG, JPEG, WEBP.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-bills',
  'medical-bills',
  false,
  15728640,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- 2. HELPER FUNCTIONS FOR RLS ENFORCEMENT
-- Retrieves current user's role from user_profiles or JWT claim (cached with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
    (auth.jwt()->>'role')::public.user_role,
    'patient'::public.user_role
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Retrieves current user's patient identifier (e.g. PT-34901) for strict patient isolation
CREATE OR REPLACE FUNCTION public.auth_patient_identifier()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT patient_identifier FROM public.user_profiles WHERE id = auth.uid()),
    auth.jwt()->>'patient_id',
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES: user_profiles
-- Users can view and manage only their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile upon signup"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. RLS POLICIES: documents
-- Patient: Can only select and insert their own documents
CREATE POLICY "Patients view own documents"
  ON public.documents FOR SELECT
  USING (
    public.auth_user_role() = 'patient' AND
    auth.uid() = user_id
  );

-- Hospital Staff: Can view documents they uploaded or manage
CREATE POLICY "Hospital staff view institutional documents"
  ON public.documents FOR SELECT
  USING (
    public.auth_user_role() = 'hospital_staff'
  );

-- Insurer Reviewer: Can view documents linked to claims submitted for review
CREATE POLICY "Insurer reviewers view documents in claims queue"
  ON public.documents FOR SELECT
  USING (
    public.auth_user_role() = 'insurer_reviewer'
  );

-- Authenticated users can insert documents with user_id = auth.uid()
CREATE POLICY "Authenticated users upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- 6. RLS POLICIES: claims
-- SELECT:
-- 1) Patients can strictly ONLY view claims where patient_id matches their patient_identifier or created_by = auth.uid()
CREATE POLICY "Patients view own claims"
  ON public.claims FOR SELECT
  USING (
    public.auth_user_role() = 'patient' AND
    (
      patient_id = public.auth_patient_identifier() OR
      created_by = auth.uid()
    )
  );

-- 2) Hospital staff can view claims in their hospital registry
CREATE POLICY "Hospital staff view hospital claims"
  ON public.claims FOR SELECT
  USING (
    public.auth_user_role() = 'hospital_staff'
  );

-- 3) Insurer reviewers can view claims submitted for adjudication
CREATE POLICY "Insurer reviewers view submitted queue"
  ON public.claims FOR SELECT
  USING (
    public.auth_user_role() = 'insurer_reviewer' AND
    status IN ('extracted', 'flagged', 'under_review', 'approved', 'rejected')
  );

-- INSERT:
-- Hospital staff and patients can create claims (must be owner)
CREATE POLICY "Hospital and patient create claims"
  ON public.claims FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    public.auth_user_role() IN ('hospital_staff', 'patient')
  );

-- UPDATE:
-- Hospital staff can edit non-finalized claims (e.g. correcting codes or line items before payer submission)
CREATE POLICY "Hospital staff update pending claims"
  ON public.claims FOR UPDATE
  USING (
    public.auth_user_role() = 'hospital_staff' AND
    status NOT IN ('approved', 'rejected')
  )
  WITH CHECK (
    public.auth_user_role() = 'hospital_staff' AND
    status NOT IN ('approved', 'rejected')
  );

-- Insurer reviewers can update status during adjudication
CREATE POLICY "Insurer reviewers update claim status"
  ON public.claims FOR UPDATE
  USING (
    public.auth_user_role() = 'insurer_reviewer'
  )
  WITH CHECK (
    public.auth_user_role() = 'insurer_reviewer'
  );

-- 7. RLS POLICIES: line_items
-- SELECT: Inherits access from claims
CREATE POLICY "Users read line items for accessible claims"
  ON public.line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = line_items.claim_id
    )
  );

-- INSERT / UPDATE: Hospital staff only on active claims
CREATE POLICY "Hospital staff manage line items"
  ON public.line_items FOR ALL
  USING (
    public.auth_user_role() = 'hospital_staff' AND
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = line_items.claim_id AND c.status NOT IN ('approved', 'rejected')
    )
  )
  WITH CHECK (
    public.auth_user_role() = 'hospital_staff' AND
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = line_items.claim_id AND c.status NOT IN ('approved', 'rejected')
    )
  );

-- 8. RLS POLICIES: audit_issues
-- SELECT: Anyone with access to the claim can read audit issues
CREATE POLICY "Users read audit issues for accessible claims"
  ON public.audit_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = audit_issues.claim_id
    )
  );

-- INSERT / UPDATE: Hospital staff and automated workers
CREATE POLICY "Hospital staff update audit issues"
  ON public.audit_issues FOR ALL
  USING (
    public.auth_user_role() IN ('hospital_staff', 'insurer_reviewer')
  )
  WITH CHECK (
    public.auth_user_role() IN ('hospital_staff', 'insurer_reviewer')
  );

-- 9. RLS POLICIES: review_decisions
-- SELECT: Any user who can view the claim can read formal decisions
CREATE POLICY "Users read decisions for accessible claims"
  ON public.review_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = review_decisions.claim_id
    )
  );

-- INSERT: Strictly insurer_reviewer role, and adjudicator_id must equal auth.uid()
CREATE POLICY "Insurer reviewers record decisions"
  ON public.review_decisions FOR INSERT
  WITH CHECK (
    public.auth_user_role() = 'insurer_reviewer' AND
    auth.uid() = adjudicator_id
  );

-- 10. RLS POLICIES: claim_events (Immutable audit and workflow trail)
-- SELECT: Anyone who has access to the parent claim can view the claim events
CREATE POLICY "Users read claim events for accessible claims"
  ON public.claim_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.claim_ref = claim_events.claim_ref OR c.id = claim_events.claim_id
    )
  );

-- INSERT: Authenticated users, hospital staff, reviewers and service workers can append events
CREATE POLICY "Authenticated users and workers append claim events"
  ON public.claim_events FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

-- 11. STORAGE RLS POLICIES FOR 'medical-bills' BUCKET
-- Upload: Users can only upload to a folder matching their user ID: <user_id>/<filename>
CREATE POLICY "Users upload to own folder in medical-bills"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-bills' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read:
-- 1) Users can read objects in their own folder
CREATE POLICY "Users read own uploaded files in medical-bills"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-bills' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2) Hospital staff and insurer reviewers can read medical bill documents linked to active claims
CREATE POLICY "Staff and Reviewers read claim documents in medical-bills"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-bills' AND
    public.auth_user_role() IN ('hospital_staff', 'insurer_reviewer')
  );
