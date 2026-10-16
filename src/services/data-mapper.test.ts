import { describe, it, expect } from "vitest";
import {
  mapClaimToN8nPayload,
  mapN8nPayloadToDbClaim,
  mapDbClaimToRecord,
  mapEventToDbClaimEvent,
} from "./data-mapper";
import { MOCK_CLAIM_CLEAN } from "@/data/mock-claims";
import type { Database } from "@/types/database";

describe("Data Mapping Layer (data-mapper.ts)", () => {
  it("explicitly maps domain ClaimRecord to n8n webhook payload with Indian fields", () => {
    const payload = mapClaimToN8nPayload(
      MOCK_CLAIM_CLEAN,
      true,
      "test-idem-key",
    );

    expect(payload.claim_ref).toBe("BB-DEMO-1003");
    expect(payload.claim_type).toBe("Cashless");
    expect(payload.patient_name).toBe("Vikram Malhotra");
    expect(payload.patient_ref).toBe("PT-89412");
    expect(payload.hospital_id).toBe("ROHINI-GUR-7731");
    expect(payload.stated_billed_total).toBe(76200.0);
    expect(payload.bill_items.length).toBe(4);
    expect(payload.patient_consent).toBe(true);
    expect(payload.idempotency_key).toBe("test-idem-key");
    expect(payload.is_synthetic_demo).toBe(true);
  });

  it("explicitly maps n8n payload to Supabase public.claims insert record", () => {
    const n8nPayload = mapClaimToN8nPayload(
      MOCK_CLAIM_CLEAN,
      true,
      "test-idem-123",
    );
    const dbInsert = mapN8nPayloadToDbClaim(n8nPayload, "user-uuid-101");

    expect(dbInsert.claim_ref).toBe("BB-DEMO-1003");
    expect(dbInsert.claim_number).toBe("BB-DEMO-1003");
    expect(dbInsert.patient_ref).toBe("PT-89412");
    expect(dbInsert.policy_ref).toContain("PT-89412");
    expect(dbInsert.hospital_ref).toBe("ROHINI-GUR-7731");
    expect(dbInsert.created_by).toBe("user-uuid-101");
    expect(dbInsert.idempotency_key).toBe("test-idem-123");
    expect(dbInsert.is_synthetic_demo).toBe(true);
  });

  it("maps Supabase public.claims Row and public.claim_events to domain ClaimRecord", () => {
    const mockRow: Database["public"]["Tables"]["claims"]["Row"] = {
      id: "uuid-claim-99",
      claim_ref: "CLM-2026-9999",
      claim_number: "CLM-2026-9999",
      patient_ref: "PT-99001",
      patient_id: "PT-99001",
      patient_name: "Anita Deshmukh",
      patient_dob: "1990-05-15",
      patient_account_number: "ACC-99001",
      policy_ref: "POL-STAR-99001",
      policy_number: "POL-STAR-99001",
      payer_name: "Star Health & Allied Insurance",
      hospital_ref: "ROHINI-HYD-5512",
      hospital_id: "ROHINI-HYD-5512",
      provider_name: "Apollo Health City, Hyderabad",
      provider_npi: "ROHINI-HYD-5512",
      provider_address: "Jubilee Hills, Hyderabad 500033",
      statement_date: "2026-10-12",
      service_start_date: "2026-10-10",
      service_end_date: "2026-10-12",
      admission_date: "2026-10-10",
      discharge_date: "2026-10-12",
      claim_type: "Cashless",
      status: "extracted",
      stated_billed_total: 54000.0,
      itemized_sum_total: 54000.0,
      variance: 0,
      bill_items: [
        {
          line_number: 1,
          code: "99223",
          code_type: "CPT",
          description: "Initial hospital inpatient care",
          quantity: 1,
          unit_price: 14000.0,
          total_price: 14000.0,
          confidence_score: 0.98,
        },
      ],
      idempotency_key: "idem-key-99",
      document_id: "doc-99",
      created_by: "user-uuid-101",
      patient_responsibility: 5000.0,
      insurance_paid: 49000.0,
      assigned_reviewer_id: null,
      reviewer_notes: null,
      submission_notes: null,
      is_synthetic_demo: true,
      created_at: "2026-10-12T10:00:00Z",
      updated_at: "2026-10-12T10:00:00Z",
    };

    const mockEvent: Database["public"]["Tables"]["claim_events"]["Row"] = {
      id: "event-1",
      claim_ref: "CLM-2026-9999",
      claim_id: "uuid-claim-99",
      event_type: "CLAIM_CREATED",
      actor: "Pooja Hegde",
      actor_role: "hospital_staff",
      before_state: null,
      after_state: "extracted",
      note: "Initial statement ingested and parsed.",
      metadata: {},
      timestamp: "2026-10-12T10:00:00Z",
      created_at: "2026-10-12T10:00:00Z",
    };

    const record = mapDbClaimToRecord(mockRow, [mockEvent]);

    expect(record.id).toBe("uuid-claim-99");
    expect(record.claimRef).toBe("CLM-2026-9999");
    expect(record.claimType).toBe("Cashless");
    expect(record.bill.patientName).toBe("Anita Deshmukh");
    expect(record.bill.providerName).toBe("Apollo Health City, Hyderabad");
    expect(record.lineItems.length).toBe(1);
    expect(record.lineItems[0]?.code).toBe("99223");
    expect(record.auditTrail.length).toBe(1);
    expect(record.auditTrail[0]?.action).toBe("CLAIM_CREATED");
    expect(record.isSyntheticDemo).toBe(true);
  });

  it("correctly maps an event to the public.claim_events insert structure", () => {
    const eventInsert = mapEventToDbClaimEvent(
      "BB-DEMO-1001",
      "claim-uuid-1",
      "CLAIM_SUBMITTED",
      "Dr. Ramesh",
      "hospital_staff",
      "draft",
      "under_review",
      "Submitted with verified patient consent",
    );

    expect(eventInsert.claim_ref).toBe("BB-DEMO-1001");
    expect(eventInsert.claim_id).toBe("claim-uuid-1");
    expect(eventInsert.event_type).toBe("CLAIM_SUBMITTED");
    expect(eventInsert.actor).toBe("Dr. Ramesh");
    expect(eventInsert.actor_role).toBe("hospital_staff");
    expect(eventInsert.before_state).toBe("draft");
    expect(eventInsert.after_state).toBe("under_review");
    expect(eventInsert.note).toBe("Submitted with verified patient consent");
  });
});
