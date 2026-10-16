/**
 * BillBridge Administration & Role-Based Access Control Types
 * Covers Super Admin, Hospital Admin, Insurance Admin, Organizations, and Audit Logs.
 */

export type AppRole =
  | "super_admin"
  | "platform_admin"
  | "hospital_admin"
  | "hospital_staff"
  | "insurance_admin"
  | "insurance_reviewer"
  | "insurer_reviewer"
  | "patient";

export type OrganizationType = "hospital" | "insurance";

export type OrganizationStatus = "pending" | "active" | "suspended" | "rejected";

export type MembershipStatus = "active" | "suspended" | "pending";

export interface Organization {
  id: string;
  name: string;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  code?: string;
  city?: string;
  state?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
  membership_status: MembershipStatus;
  created_at: string;
  updated_at?: string;
  // Join fields
  user_email?: string;
  user_name?: string;
  organization_name?: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: AppRole;
  organization_id?: string | null;
  created_at: string;
  // Join fields
  organization_name?: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined fields for admin views
  roles?: AppRole[];
  primary_role?: AppRole;
  organization_id?: string | null;
  organization_name?: string | null;
  membership_status?: MembershipStatus;
}

export interface AdminAuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email?: string;
  actor_name?: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemHealthMetrics {
  geminiVisionStatus: "operational" | "degraded" | "offline";
  n8nWebhookStatus: "operational" | "degraded" | "offline";
  supabaseDbStatus: "operational" | "degraded" | "offline";
  supabaseStorageStatus: "operational" | "degraded" | "offline";
  totalRegisteredHospitals: number;
  totalRegisteredInsurers: number;
  totalUsers: number;
  totalClaimsProcessed: number;
  claimsAwaitingReview: number;
  failedDocumentJobs: number;
  lastSyncTimestamp: string;
}
