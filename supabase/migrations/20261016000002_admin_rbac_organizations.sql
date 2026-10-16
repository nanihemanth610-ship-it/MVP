-- ============================================================================
-- Migration: 20261016000002_admin_rbac_organizations.sql
-- Description: Multi-tenant RBAC, Organizations, User Roles, Admin Audit Logs,
--              Google OAuth profile trigger, and Super Admin bootstrap function.
-- Entities: profiles, organizations, organization_members, user_roles, admin_audit_logs
-- ============================================================================

-- 1. PROFILES TABLE (Standardized profile linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backward compatibility: keep user_profiles synced or backed by profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text NOT NULL CHECK (organization_type IN ('hospital', 'insurance')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  code text UNIQUE,
  city text,
  state text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3. ORGANIZATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('hospital_admin', 'hospital_staff', 'insurance_admin', 'insurance_reviewer')),
  membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'suspended', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_member UNIQUE (organization_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_members_updated_at') THEN
    CREATE TRIGGER update_org_members_updated_at
      BEFORE UPDATE ON public.organization_members
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'hospital_admin', 'hospital_staff', 'insurance_admin', 'insurance_reviewer')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_role_org UNIQUE (user_id, role, organization_id)
);

-- 5. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ADD ORGANIZATION FOREIGN KEYS TO CLAIMS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'claims' AND column_name = 'hospital_org_id'
  ) THEN
    ALTER TABLE public.claims ADD COLUMN hospital_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'claims' AND column_name = 'insurance_org_id'
  ) THEN
    ALTER TABLE public.claims ADD COLUMN insurance_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. HELPER FUNCTIONS FOR SECURITY DEFINER RLS ACCESS
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_hospital_admin(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_uuid 
      AND user_id = user_uuid 
      AND role = 'hospital_admin'
      AND membership_status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_insurance_admin(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_uuid 
      AND user_id = user_uuid 
      AND role = 'insurance_admin'
      AND membership_status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_org_ids(user_uuid uuid DEFAULT auth.uid())
RETURNS SETOF uuid AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = user_uuid AND membership_status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. AUTOMATIC PROFILE CREATION ON GOOGLE OAUTH SIGN-IN
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Maintain backward compatibility with user_profiles
  INSERT INTO public.user_profiles (id, role, display_name, email)
  VALUES (
    NEW.id,
    'hospital_staff',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile'
  ) THEN
    CREATE TRIGGER on_auth_user_created_profile
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
  END IF;
END $$;

-- 9. SECURE FIRST SUPER ADMIN BOOTSTRAP FUNCTION
-- This procedure safely assigns the first Super Admin by email.
-- Only executable if NO super_admin exists yet, or if executed by an existing super_admin.
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(target_email text)
RETURNS jsonb AS $$
DECLARE
  target_user_id uuid;
  existing_super_admin_count int;
  caller_is_admin boolean;
  result jsonb;
BEGIN
  -- Count current super admins
  SELECT count(*) INTO existing_super_admin_count FROM public.user_roles WHERE role = 'super_admin';

  -- Check if caller is super admin (or if no caller, e.g. SQL Editor / service role)
  caller_is_admin := (auth.uid() IS NULL) OR public.is_super_admin(auth.uid());

  IF existing_super_admin_count > 0 AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Privilege escalation rejected: Only an existing Super Admin or SQL service role can grant Super Admin privileges.';
  END IF;

  -- Find the user in auth.users
  SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email);

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: target email % has not signed in with Google OAuth yet.', target_email;
  END IF;

  -- Insert role into user_roles
  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (target_user_id, 'super_admin', NULL)
  ON CONFLICT (user_id, role, organization_id) DO NOTHING;

  -- Record audit log
  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    COALESCE(auth.uid(), target_user_id),
    'BOOTSTRAP_SUPER_ADMIN',
    'user',
    target_user_id::text,
    jsonb_build_object(
      'email', target_email,
      'is_initial_bootstrap', existing_super_admin_count = 0,
      'timestamp', now()
    )
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', target_email,
    'role', 'super_admin',
    'status', 'Active'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. RLS POLICIES: profiles
CREATE POLICY "Users read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 12. RLS POLICIES: organizations
-- Super Admin: full access
CREATE POLICY "Super admin full access on organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Members: read only their active organizations
CREATE POLICY "Members read assigned active organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_auth_user_org_ids())
    AND status = 'active'
  );

-- 13. RLS POLICIES: organization_members
CREATE POLICY "Super admin full access on organization_members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Hospital/Insurance Admin manage own org members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (
    public.is_hospital_admin(organization_id) OR
    public.is_insurance_admin(organization_id)
  )
  WITH CHECK (
    public.is_hospital_admin(organization_id) OR
    public.is_insurance_admin(organization_id)
  );

CREATE POLICY "Members view peers in same organization"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT public.get_auth_user_org_ids())
  );

-- 14. RLS POLICIES: user_roles
CREATE POLICY "Super admin full access on user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 15. RLS POLICIES: admin_audit_logs
CREATE POLICY "Super admin read all audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Org admins read own org audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL AND (
      public.is_hospital_admin(organization_id) OR
      public.is_insurance_admin(organization_id)
    )
  );

CREATE POLICY "Authenticated users insert audit log entries"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- 16. MULTI-TENANT HOSPITAL & INSURANCE CLAIMS POLICIES
-- Super Admin can view all claims
CREATE POLICY "Super admin view all claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Hospital staff only view claims where hospital_org_id matches member's active org
CREATE POLICY "Hospital members view hospital org claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    hospital_org_id IS NOT NULL AND
    hospital_org_id IN (SELECT public.get_auth_user_org_ids())
  );

-- Insurance members only view claims assigned to their insurance org
CREATE POLICY "Insurance members view insurance org claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    insurance_org_id IS NOT NULL AND
    insurance_org_id IN (SELECT public.get_auth_user_org_ids())
  );

-- 17. SEED STANDARD DEMO ORGANIZATIONS
INSERT INTO public.organizations (id, name, organization_type, status, code, city, state, contact_email)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Apollo Hospitals Bannerghatta', 'hospital', 'active', 'APOLLO-BLR-01', 'Bengaluru', 'Karnataka', 'billing.blr@apollo-hospitals.in'),
  ('a0000000-0000-0000-0000-000000000002', 'Fortis Memorial Research Institute', 'hospital', 'active', 'FORTIS-GGN-01', 'Gurugram', 'Haryana', 'claims@fortishealthcare.com'),
  ('a0000000-0000-0000-0000-000000000003', 'Max Super Speciality Hospital Saket', 'hospital', 'active', 'MAX-DEL-01', 'New Delhi', 'Delhi', 'tpa.saket@maxhealthcare.com'),
  ('b0000000-0000-0000-0000-000000000001', 'Star Health and Allied Insurance', 'insurance', 'active', 'STAR-HLTH-01', 'Chennai', 'Tamil Nadu', 'claims@starhealth.in'),
  ('b0000000-0000-0000-0000-000000000002', 'HDFC ERGO General Insurance', 'insurance', 'active', 'HDFC-ERGO-01', 'Mumbai', 'Maharashtra', 'healthclaims@hdfcergo.com'),
  ('b0000000-0000-0000-0000-000000000003', 'MediAssist TPA Network', 'insurance', 'active', 'MEDI-TPA-01', 'Bengaluru', 'Karnataka', 'desk@mediassist.in')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;
