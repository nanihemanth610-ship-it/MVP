/**
 * BillBridge Supabase Database Types
 * Generated schema definition representing the PostgreSQL schema in Supabase.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "patient"
  | "hospital_staff"
  | "hospital_admin"
  | "insurer_reviewer"
  | "insurer_admin"
  | "platform_admin"
  | "super_admin";
export type ClaimStatus =
  | "draft"
  | "extracted"
  | "flagged"
  | "under_review"
  | "requires_information"
  | "approved"
  | "rejected"
  | "settled";
export type DiscrepancySeverity = "critical" | "warning" | "info" | "error";
export type ReviewDecisionOutcome =
  "approved" | "rejected" | "query" | "requires_information";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          organization_type: "hospital" | "insurance";
          status: "pending" | "active" | "suspended" | "rejected";
          code: string | null;
          city: string | null;
          state: string | null;
          contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization_type: "hospital" | "insurance";
          status?: "pending" | "active" | "suspended" | "rejected";
          code?: string | null;
          city?: string | null;
          state?: string | null;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organization_type?: "hospital" | "insurance";
          status?: "pending" | "active" | "suspended" | "rejected";
          code?: string | null;
          city?: string | null;
          state?: string | null;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          membership_status: "active" | "suspended" | "pending";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          membership_status?: "active" | "suspended" | "pending";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          membership_status?: "active" | "suspended" | "pending";
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "super_admin" | "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          organization_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "super_admin" | "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          organization_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "super_admin" | "hospital_admin" | "hospital_staff" | "insurance_admin" | "insurance_reviewer";
          organization_id?: string | null;
          created_at?: string;
        };
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          organization_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          organization_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          organization_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string | null;
          email: string | null;
          organization_name: string | null;
          patient_identifier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
          email?: string | null;
          organization_name?: string | null;
          patient_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          display_name?: string | null;
          email?: string | null;
          organization_name?: string | null;
          patient_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: string;
          page_count: number;
          checksum_sha256: string | null;
          is_synthetic_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: string;
          page_count?: number;
          checksum_sha256?: string | null;
          is_synthetic_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          file_name?: string;
          file_size_bytes?: number;
          mime_type?: string;
          page_count?: number;
          checksum_sha256?: string | null;
          is_synthetic_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      claims: {
        Row: {
          id: string;
          claim_ref: string;
          claim_number: string;
          patient_ref: string | null;
          policy_ref: string | null;
          hospital_ref: string | null;
          hospital_id: string | null;
          admission_date: string | null;
          discharge_date: string | null;
          bill_items: Json | null;
          idempotency_key: string | null;
          document_id: string | null;
          created_by: string;
          patient_id: string;
          patient_name: string;
          patient_dob: string | null;
          patient_account_number: string | null;
          provider_name: string;
          provider_npi: string | null;
          provider_address: string | null;
          statement_date: string | null;
          service_start_date: string | null;
          service_end_date: string | null;
          claim_type: "Cashless" | "Reimbursement";
          status: ClaimStatus;
          stated_billed_total: number;
          itemized_sum_total: number;
          variance: number;
          payer_name: string | null;
          policy_number: string | null;
          patient_responsibility: number | null;
          insurance_paid: number | null;
          assigned_reviewer_id: string | null;
          reviewer_notes: string | null;
          submission_notes: string | null;
          hospital_org_id?: string | null;
          insurance_org_id?: string | null;
          is_synthetic_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_ref?: string;
          claim_number: string;
          patient_ref?: string | null;
          policy_ref?: string | null;
          hospital_ref?: string | null;
          hospital_id?: string | null;
          admission_date?: string | null;
          discharge_date?: string | null;
          bill_items?: Json | null;
          idempotency_key?: string | null;
          document_id?: string | null;
          created_by: string;
          patient_id: string;
          patient_name: string;
          patient_dob?: string | null;
          patient_account_number?: string | null;
          provider_name: string;
          provider_npi?: string | null;
          provider_address?: string | null;
          statement_date?: string | null;
          service_start_date?: string | null;
          service_end_date?: string | null;
          claim_type?: "Cashless" | "Reimbursement";
          status?: ClaimStatus;
          stated_billed_total?: number;
          itemized_sum_total?: number;
          variance?: number;
          payer_name?: string | null;
          policy_number?: string | null;
          patient_responsibility?: number | null;
          insurance_paid?: number | null;
          assigned_reviewer_id?: string | null;
          reviewer_notes?: string | null;
          submission_notes?: string | null;
          hospital_org_id?: string | null;
          insurance_org_id?: string | null;
          is_synthetic_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          claim_ref?: string;
          claim_number?: string;
          patient_ref?: string | null;
          policy_ref?: string | null;
          hospital_ref?: string | null;
          hospital_id?: string | null;
          admission_date?: string | null;
          discharge_date?: string | null;
          bill_items?: Json | null;
          idempotency_key?: string | null;
          document_id?: string | null;
          created_by?: string;
          patient_id?: string;
          patient_name?: string;
          patient_dob?: string | null;
          patient_account_number?: string | null;
          provider_name?: string;
          provider_npi?: string | null;
          provider_address?: string | null;
          statement_date?: string | null;
          service_start_date?: string | null;
          service_end_date?: string | null;
          claim_type?: "Cashless" | "Reimbursement";
          status?: ClaimStatus;
          stated_billed_total?: number;
          itemized_sum_total?: number;
          variance?: number;
          payer_name?: string | null;
          policy_number?: string | null;
          patient_responsibility?: number | null;
          insurance_paid?: number | null;
          assigned_reviewer_id?: string | null;
          reviewer_notes?: string | null;
          submission_notes?: string | null;
          hospital_org_id?: string | null;
          insurance_org_id?: string | null;
          is_synthetic_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      line_items: {
        Row: {
          id: string;
          claim_id: string;
          line_number: number;
          code: string | null;
          code_type: "CPT" | "HCPCS" | "REV" | "INTERNAL" | "UNKNOWN";
          description: string;
          service_date: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          expected_total: number;
          is_math_mismatch: boolean;
          confidence_score: number;
          extraction_status:
            "readable" | "unreadable" | "low_confidence" | "corrected";
          unreadable_reason: string | null;
          notes: string | null;
          is_manual_edit: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          line_number: number;
          code?: string | null;
          code_type?: "CPT" | "HCPCS" | "REV" | "INTERNAL" | "UNKNOWN";
          description: string;
          service_date?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          expected_total?: number;
          is_math_mismatch?: boolean;
          confidence_score?: number;
          extraction_status?:
            "readable" | "unreadable" | "low_confidence" | "corrected";
          unreadable_reason?: string | null;
          notes?: string | null;
          is_manual_edit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          line_number?: number;
          code?: string | null;
          code_type?: "CPT" | "HCPCS" | "REV" | "INTERNAL" | "UNKNOWN";
          description?: string;
          service_date?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          expected_total?: number;
          is_math_mismatch?: boolean;
          confidence_score?: number;
          extraction_status?:
            "readable" | "unreadable" | "low_confidence" | "corrected";
          unreadable_reason?: string | null;
          notes?: string | null;
          is_manual_edit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_issues: {
        Row: {
          id: string;
          claim_id: string;
          line_item_id: string | null;
          code: string;
          category: string;
          severity: DiscrepancySeverity;
          message: string;
          field_key: string | null;
          expected_value: string | null;
          actual_value: string | null;
          suggested_action: string | null;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          line_item_id?: string | null;
          code: string;
          category: string;
          severity?: DiscrepancySeverity;
          message: string;
          field_key?: string | null;
          expected_value?: string | null;
          actual_value?: string | null;
          suggested_action?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          line_item_id?: string | null;
          code?: string;
          category?: string;
          severity?: DiscrepancySeverity;
          message?: string;
          field_key?: string | null;
          expected_value?: string | null;
          actual_value?: string | null;
          suggested_action?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      review_decisions: {
        Row: {
          id: string;
          claim_id: string;
          adjudicator_id: string;
          adjudicator_role: string;
          adjudicator_name: string;
          outcome: ReviewDecisionOutcome;
          rationale: string;
          formal_notice_generated: boolean;
          notification_dispatched_patient: boolean;
          notification_dispatched_hospital: boolean;
          decided_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          adjudicator_id: string;
          adjudicator_role?: string;
          adjudicator_name: string;
          outcome: ReviewDecisionOutcome;
          rationale: string;
          formal_notice_generated?: boolean;
          notification_dispatched_patient?: boolean;
          notification_dispatched_hospital?: boolean;
          decided_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          adjudicator_id?: string;
          adjudicator_role?: string;
          adjudicator_name?: string;
          outcome?: ReviewDecisionOutcome;
          rationale?: string;
          formal_notice_generated?: boolean;
          notification_dispatched_patient?: boolean;
          notification_dispatched_hospital?: boolean;
          decided_at?: string;
          created_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          claim_id: string;
          actor_id: string | null;
          actor_role: string;
          actor_name: string;
          event_type: string;
          summary: string;
          metadata: Json;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          actor_id?: string | null;
          actor_role: string;
          actor_name: string;
          event_type: string;
          summary: string;
          metadata?: Json;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          actor_id?: string | null;
          actor_role?: string;
          actor_name?: string;
          event_type?: string;
          summary?: string;
          metadata?: Json;
          timestamp?: string;
          created_at?: string;
        };
      };
      claim_events: {
        Row: {
          id: string;
          claim_ref: string;
          claim_id: string | null;
          event_type: string;
          actor: string;
          actor_role: string;
          before_state: string | null;
          after_state: string | null;
          note: string | null;
          metadata: Json;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          claim_ref: string;
          claim_id?: string | null;
          event_type: string;
          actor: string;
          actor_role?: string;
          before_state?: string | null;
          after_state?: string | null;
          note?: string | null;
          metadata?: Json;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          claim_ref?: string;
          claim_id?: string | null;
          event_type?: string;
          actor?: string;
          actor_role?: string;
          before_state?: string | null;
          after_state?: string | null;
          note?: string | null;
          metadata?: Json;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      claim_status: ClaimStatus;
      discrepancy_severity: DiscrepancySeverity;
      review_decision_outcome: ReviewDecisionOutcome;
    };
    Functions: {
      auth_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      auth_patient_identifier: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
  };
}
