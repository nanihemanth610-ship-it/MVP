/**
 * BillBridge Supabase Client & Authentication Layer
 * Provides typed Supabase singleton, Google OAuth initiation, session retrieval,
 * role resolution, and audit logging.
 */

import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppRole, UserProfile, MembershipStatus } from "@/types/admin";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("YOUR_PROJECT") &&
    !supabaseKey.includes("your-anon-key")
  );
};

// Create typed Supabase singleton
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured()
  ? createClient<Database>(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

/**
 * Validates a returnTo URL to prevent open redirect vulnerabilities.
 * Only allows relative paths on the same origin (e.g., "/admin", "/hospital", "/claims/123").
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return "/dashboard";
  // Must start with single slash, not double slash (protocol-relative URLs)
  if (path.startsWith("/") && !path.startsWith("//") && !path.includes("://")) {
    return path;
  }
  return "/dashboard";
}

/**
 * Initiates Google OAuth via Supabase Auth.
 * Redirects user to Google Consent screen and sets redirect to /auth/callback.
 */
export async function signInWithGoogle(returnTo?: string) {
  if (!supabase) {
    throw new Error(
      "Supabase backend is not configured in this environment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  const safeReturn = sanitizeRedirectPath(returnTo);
  try {
    sessionStorage.setItem("billbridge_post_auth_redirect", safeReturn);
  } catch {
    // SessionStorage may be restricted in some iframe environments
  }

  const callbackUrl = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Signs the user out of Supabase Auth and clears session storage.
 */
export async function signOut() {
  try {
    sessionStorage.removeItem("billbridge_post_auth_redirect");
  } catch {
    // Ignore
  }
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Retrieves the current session.
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

/**
 * Retrieves the active user from Supabase.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export interface UserRoleResolution {
  role: AppRole | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationStatus: string | null;
  membershipStatus: MembershipStatus | null;
  profile: UserProfile | null;
}

/**
 * Resolves user's assigned role and organization membership from Supabase.
 * Checks user_roles, organization_members, and profiles.
 * If user has no assigned role, returns role: null (which triggers /pending-approval).
 */
export async function resolveUserAuthorization(userId: string): Promise<UserRoleResolution> {
  if (!supabase) {
    return {
      role: null,
      organizationId: null,
      organizationName: null,
      organizationStatus: null,
      membershipStatus: null,
      profile: null,
    };
  }

  try {
    // 1. Fetch Profile
    const { data: profileData } = await (supabase.from("profiles") as any)
      .select("*")
      .eq("id", userId)
      .single();

    // 2. Fetch User Roles
    const { data: roleRows } = await (supabase.from("user_roles") as any)
      .select("role, organization_id")
      .eq("user_id", userId);

    // 3. Fetch Organization Membership
    const { data: memberRows } = await (supabase.from("organization_members") as any)
      .select("organization_id, role, membership_status, organizations(name, status)")
      .eq("user_id", userId);

    let assignedRole: AppRole | null = null;
    let orgId: string | null = null;
    let orgName: string | null = null;
    let orgStatus: string | null = null;
    let memberStatus: MembershipStatus | null = null;

    // Check for super_admin first
    const superAdminRole = roleRows?.find((r: any) => r.role === "super_admin");
    if (superAdminRole) {
      assignedRole = "super_admin";
    } else if (memberRows && memberRows.length > 0) {
      const activeMember = memberRows.find((m: any) => m.membership_status === "active") || memberRows[0];
      assignedRole = activeMember.role as AppRole;
      orgId = activeMember.organization_id;
      memberStatus = activeMember.membership_status;
      if (activeMember.organizations) {
        orgName = activeMember.organizations.name;
        orgStatus = activeMember.organizations.status;
      }
    } else if (roleRows && roleRows.length > 0) {
      const firstRole = roleRows[0];
      assignedRole = firstRole.role as AppRole;
      orgId = firstRole.organization_id || null;
    }

    return {
      role: assignedRole,
      organizationId: orgId,
      organizationName: orgName,
      organizationStatus: orgStatus,
      membershipStatus: memberStatus,
      profile: profileData || null,
    };
  } catch (err) {
    console.error("BillBridge [Auth]: Error resolving user authorization:", err);
    return {
      role: null,
      organizationId: null,
      organizationName: null,
      organizationStatus: null,
      membershipStatus: null,
      profile: null,
    };
  }
}

/**
 * Appends an audit log entry to admin_audit_logs via Supabase client.
 */
export async function logAdminAudit(entry: {
  action: string;
  targetType: string;
  targetId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!supabase) return;
  try {
    const user = await getCurrentUser();
    await (supabase.from("admin_audit_logs") as any).insert({
      actor_user_id: user?.id || null,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId || null,
      organization_id: entry.organizationId || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    console.warn("BillBridge [Audit]: Failed to record admin audit log:", err);
  }
}
