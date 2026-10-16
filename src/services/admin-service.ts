/**
 * BillBridge Super Admin Service
 * Handles queries and mutations for organizations, users, role assignments,
 * system health indicators, and audit logs.
 */

import { supabase, isSupabaseConfigured, logAdminAudit } from "@/lib/supabase";
import type {
  Organization,
  UserProfile,
  AdminAuditLog,
  SystemHealthMetrics,
  AppRole,
} from "@/types/admin";

// Realistic Indian healthcare demo organizations
export const INITIAL_DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Apollo Hospitals Bannerghatta Road",
    organization_type: "hospital",
    status: "active",
    code: "APOLLO-BLR-01",
    city: "Bengaluru",
    state: "Karnataka",
    contact_email: "billing.blr@apollo-hospitals.in",
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-10-15T12:00:00Z",
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Fortis Memorial Research Institute",
    organization_type: "hospital",
    status: "active",
    code: "FORTIS-GGN-01",
    city: "Gurugram",
    state: "Haryana",
    contact_email: "claims@fortishealthcare.com",
    created_at: "2026-09-10T10:00:00Z",
    updated_at: "2026-10-14T11:00:00Z",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Max Super Speciality Hospital Saket",
    organization_type: "hospital",
    status: "active",
    code: "MAX-DEL-01",
    city: "New Delhi",
    state: "Delhi",
    contact_email: "tpa.saket@maxhealthcare.com",
    created_at: "2026-09-15T09:30:00Z",
    updated_at: "2026-10-13T14:20:00Z",
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Manipal Hospital Old Airport Road",
    organization_type: "hospital",
    status: "pending",
    code: "MANIPAL-BLR-01",
    city: "Bengaluru",
    state: "Karnataka",
    contact_email: "insurance@manipalhospitals.com",
    created_at: "2026-10-14T16:00:00Z",
    updated_at: "2026-10-14T16:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "Star Health and Allied Insurance",
    organization_type: "insurance",
    status: "active",
    code: "STAR-HLTH-01",
    city: "Chennai",
    state: "Tamil Nadu",
    contact_email: "claims@starhealth.in",
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-10-15T12:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "HDFC ERGO General Insurance",
    organization_type: "insurance",
    status: "active",
    code: "HDFC-ERGO-01",
    city: "Mumbai",
    state: "Maharashtra",
    contact_email: "healthclaims@hdfcergo.com",
    created_at: "2026-09-05T11:00:00Z",
    updated_at: "2026-10-12T15:30:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "MediAssist TPA Network",
    organization_type: "insurance",
    status: "active",
    code: "MEDI-TPA-01",
    city: "Bengaluru",
    state: "Karnataka",
    contact_email: "desk@mediassist.in",
    created_at: "2026-09-12T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    name: "Care Health Insurance Limited",
    organization_type: "insurance",
    status: "pending",
    code: "CARE-HLTH-01",
    city: "Gurugram",
    state: "Haryana",
    contact_email: "claims@careinsurance.com",
    created_at: "2026-10-15T08:30:00Z",
    updated_at: "2026-10-15T08:30:00Z",
  },
];

export const INITIAL_DEMO_USERS: UserProfile[] = [
  {
    id: "u-001",
    full_name: "Dr. Arvind Rao",
    email: "admin.blr@apollo-hospitals.in",
    avatar_url: null,
    primary_role: "hospital_admin",
    organization_id: "a0000000-0000-0000-0000-000000000001",
    organization_name: "Apollo Hospitals Bannerghatta Road",
    membership_status: "active",
    created_at: "2026-09-02T10:00:00Z",
    updated_at: "2026-10-10T11:00:00Z",
  },
  {
    id: "u-002",
    full_name: "Sunil Mehta",
    email: "claims.head@starhealth.in",
    avatar_url: null,
    primary_role: "insurance_admin",
    organization_id: "b0000000-0000-0000-0000-000000000001",
    organization_name: "Star Health and Allied Insurance",
    membership_status: "active",
    created_at: "2026-09-03T11:00:00Z",
    updated_at: "2026-10-11T12:00:00Z",
  },
  {
    id: "u-003",
    full_name: "Kavita Nair",
    email: "kavita.nair@starhealth.in",
    avatar_url: null,
    primary_role: "insurance_reviewer",
    organization_id: "b0000000-0000-0000-0000-000000000001",
    organization_name: "Star Health and Allied Insurance",
    membership_status: "active",
    created_at: "2026-09-04T14:00:00Z",
    updated_at: "2026-10-12T16:00:00Z",
  },
  {
    id: "u-004",
    full_name: "Pooja Hegde",
    email: "billing.blr@apollo-hospitals.in",
    avatar_url: null,
    primary_role: "hospital_staff",
    organization_id: "a0000000-0000-0000-0000-000000000001",
    organization_name: "Apollo Hospitals Bannerghatta Road",
    membership_status: "active",
    created_at: "2026-09-05T09:00:00Z",
    updated_at: "2026-10-14T10:00:00Z",
  },
  {
    id: "u-005",
    full_name: "Vikas Deshmukh",
    email: "vikas.d@fortishealthcare.com",
    avatar_url: null,
    primary_role: "hospital_admin",
    organization_id: "a0000000-0000-0000-0000-000000000002",
    organization_name: "Fortis Memorial Research Institute",
    membership_status: "active",
    created_at: "2026-09-12T10:00:00Z",
    updated_at: "2026-10-13T15:00:00Z",
  },
  {
    id: "u-006",
    full_name: "Dr. Rohini Verma",
    email: "rohini.verma@manipalhospitals.com",
    avatar_url: null,
    primary_role: undefined, // Pending assignment
    organization_id: "a0000000-0000-0000-0000-000000000004",
    organization_name: "Manipal Hospital Old Airport Road",
    membership_status: "pending",
    created_at: "2026-10-15T09:15:00Z",
    updated_at: "2026-10-15T09:15:00Z",
  },
  {
    id: "u-007",
    full_name: "Anand Sundaram",
    email: "anand.s@hdfcergo.com",
    avatar_url: null,
    primary_role: undefined, // Pending assignment
    organization_id: "b0000000-0000-0000-0000-000000000002",
    organization_name: "HDFC ERGO General Insurance",
    membership_status: "pending",
    created_at: "2026-10-15T10:30:00Z",
    updated_at: "2026-10-15T10:30:00Z",
  },
];

export const INITIAL_DEMO_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "log-001",
    actor_user_id: "u-super-1",
    actor_name: "Super Admin (Root)",
    actor_email: "superadmin@billbridge.health",
    action: "APPROVE_HOSPITAL",
    target_type: "organization",
    target_id: "a0000000-0000-0000-0000-000000000003",
    organization_name: "Max Super Speciality Hospital Saket",
    metadata: { code: "MAX-DEL-01", city: "New Delhi" },
    created_at: "2026-10-15T14:30:00Z",
  },
  {
    id: "log-002",
    actor_user_id: "u-super-1",
    actor_name: "Super Admin (Root)",
    actor_email: "superadmin@billbridge.health",
    action: "ASSIGN_ROLE",
    target_type: "user",
    target_id: "u-005",
    organization_name: "Fortis Memorial Research Institute",
    metadata: { role: "hospital_admin", target_email: "vikas.d@fortishealthcare.com" },
    created_at: "2026-10-15T11:20:00Z",
  },
  {
    id: "log-003",
    actor_user_id: "u-002",
    actor_name: "Sunil Mehta",
    actor_email: "claims.head@starhealth.in",
    action: "INVITE_MEMBER",
    target_type: "organization_member",
    target_id: "u-003",
    organization_name: "Star Health and Allied Insurance",
    metadata: { role: "insurance_reviewer", invitee: "kavita.nair@starhealth.in" },
    created_at: "2026-10-14T16:45:00Z",
  },
  {
    id: "log-004",
    actor_user_id: "u-super-1",
    actor_name: "Super Admin (Root)",
    actor_email: "superadmin@billbridge.health",
    action: "SYSTEM_BOOTSTRAP",
    target_type: "system",
    target_id: "root-bootstrap",
    metadata: { initializedAt: "2026-09-01T08:00:00Z", version: "v0.3.0" },
    created_at: "2026-09-01T08:00:00Z",
  },
];

class SuperAdminService {
  private organizations: Organization[] = [...INITIAL_DEMO_ORGANIZATIONS];
  private users: UserProfile[] = [...INITIAL_DEMO_USERS];
  private auditLogs: AdminAuditLog[] = [...INITIAL_DEMO_AUDIT_LOGS];

  async getMetrics(): Promise<SystemHealthMetrics> {
    const hospitals = this.organizations.filter((o) => o.organization_type === "hospital");
    const insurers = this.organizations.filter((o) => o.organization_type === "insurance");

    return {
      geminiVisionStatus: "operational",
      n8nWebhookStatus: "operational",
      supabaseDbStatus: isSupabaseConfigured() ? "operational" : "degraded",
      supabaseStorageStatus: isSupabaseConfigured() ? "operational" : "degraded",
      totalRegisteredHospitals: hospitals.length,
      totalRegisteredInsurers: insurers.length,
      totalUsers: this.users.length,
      totalClaimsProcessed: 142,
      claimsAwaitingReview: 18,
      failedDocumentJobs: 2,
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  async getOrganizations(type?: "hospital" | "insurance"): Promise<Organization[]> {
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = (supabase.from("organizations") as any).select("*").order("name");
        if (type) query = query.eq("organization_type", type);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as Organization[];
        }
      } catch (err) {
        console.warn("Supabase organizations query fallback to local cache:", err);
      }
    }
    return type
      ? this.organizations.filter((o) => o.organization_type === type)
      : [...this.organizations];
  }

  async updateOrganizationStatus(
    orgId: string,
    newStatus: "active" | "suspended" | "rejected",
    note?: string,
  ): Promise<boolean> {
    const org = this.organizations.find((o) => o.id === orgId);
    if (org) {
      org.status = newStatus;
      org.updated_at = new Date().toISOString();
    }

    if (supabase && isSupabaseConfigured()) {
      try {
        await (supabase.from("organizations") as any)
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", orgId);
      } catch (err) {
        console.warn("Supabase organization update fallback:", err);
      }
    }

    await this.logAudit({
      action: `ORGANIZATION_STATUS_${newStatus.toUpperCase()}`,
      targetType: "organization",
      targetId: orgId,
      organizationName: org?.name,
      metadata: { previousStatus: org?.status, newStatus, note },
    });

    return true;
  }

  async getUsers(): Promise<UserProfile[]> {
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase.from("profiles") as any)
          .select("*, user_roles(role), organization_members(organization_id, role, membership_status, organizations(name))")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            full_name: d.full_name,
            email: d.email,
            avatar_url: d.avatar_url,
            primary_role: d.user_roles?.[0]?.role || d.organization_members?.[0]?.role,
            organization_id: d.organization_members?.[0]?.organization_id,
            organization_name: d.organization_members?.[0]?.organizations?.name,
            membership_status: d.organization_members?.[0]?.membership_status || "pending",
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn("Supabase profiles query fallback to local cache:", err);
      }
    }
    return [...this.users];
  }

  async assignUserRole(params: {
    userId: string;
    role: AppRole;
    organizationId?: string;
  }): Promise<boolean> {
    const user = this.users.find((u) => u.id === params.userId);
    const org = this.organizations.find((o) => o.id === params.organizationId);

    if (user) {
      user.primary_role = params.role;
      user.organization_id = params.organizationId || null;
      user.organization_name = org?.name || null;
      user.membership_status = "active";
      user.updated_at = new Date().toISOString();
    }

    if (supabase && isSupabaseConfigured()) {
      try {
        // Upsert user_roles
        await (supabase.from("user_roles") as any).upsert({
          user_id: params.userId,
          role: params.role,
          organization_id: params.organizationId || null,
        });

        // If organization member, upsert organization_members
        if (params.organizationId && params.role !== "super_admin") {
          await (supabase.from("organization_members") as any).upsert({
            user_id: params.userId,
            organization_id: params.organizationId,
            role: params.role,
            membership_status: "active",
          });
        }
      } catch (err) {
        console.warn("Supabase assign user role fallback:", err);
      }
    }

    await this.logAudit({
      action: "ASSIGN_ROLE",
      targetType: "user",
      targetId: params.userId,
      organizationName: org?.name,
      metadata: {
        role: params.role,
        organizationId: params.organizationId,
        userEmail: user?.email,
      },
    });

    return true;
  }

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase.from("admin_audit_logs") as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            actor_user_id: d.actor_user_id,
            action: d.action,
            target_type: d.target_type,
            target_id: d.target_id,
            organization_id: d.organization_id,
            metadata: d.metadata || {},
            created_at: d.created_at,
          }));
        }
      } catch (err) {
        console.warn("Supabase audit log query fallback to local cache:", err);
      }
    }
    return [...this.auditLogs];
  }

  async logAudit(entry: {
    action: string;
    targetType: string;
    targetId?: string;
    organizationName?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actor_user_id: "u-active",
      actor_name: "Super Admin",
      actor_email: "superadmin@billbridge.health",
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      organization_name: entry.organizationName,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    };

    this.auditLogs.unshift(newLog);
    await logAdminAudit({
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
    });
  }
}

export const adminService = new SuperAdminService();
