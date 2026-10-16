import { describe, it, expect, beforeEach } from "vitest";
import { getDataAccess } from "./data-access";
import { hasPermission } from "@/types/contracts";

describe("StandardDataAccess", () => {
  const dataAccess = getDataAccess();

  beforeEach(async () => {
    await dataAccess.resetDemoData();
  });

  it("fetches paginated claims with mapped ExtractionField contracts", async () => {
    const res = await dataAccess.getClaims({ page: 1, pageSize: 10 });

    expect(res.items.length).toBeGreaterThanOrEqual(3);
    expect(res.totalCount).toBeGreaterThanOrEqual(3);

    const firstClaim = res.items[0]!;
    expect(firstClaim.patient.fullName.value).toBeDefined();
    expect(firstClaim.hospital.providerName.value).toBeDefined();
    expect(firstClaim.totals.statedBilledTotal.value).toBeGreaterThan(0);
    expect(firstClaim.lineItems.length).toBeGreaterThan(0);
  });

  it("models unreadable or absent codes explicitly with unreadable status", async () => {
    // Beacon Oncology has missing codes
    const beaconClaim = await dataAccess.getClaimById("claim-beacon-003");
    expect(beaconClaim).toBeDefined();

    const unmappedLine = beaconClaim?.lineItems.find(
      (li) => li.code.value === null || li.code.value === "",
    );
    expect(unmappedLine).toBeDefined();
    expect(unmappedLine?.code.status).toBe("unreadable");
    expect(unmappedLine?.code.isUnreadable).toBe(true);
    expect(unmappedLine?.code.unreadableReason).toBeDefined();
  });

  it("applies human line item corrections and updates arithmetic variance dynamically", async () => {
    // Memorial Hospital has $150 variance due to Line 7 math error (2 x $400 = $800, entered as $1,200)
    const claim = await dataAccess.getClaimById("claim-memorial-002");
    expect(claim).toBeDefined();
    expect(claim?.totals.hasVariance).toBe(true);

    const updated = await dataAccess.applyLineItemCorrection({
      claimId: "claim-memorial-002",
      lineItemId: "li-disc-7",
      quantity: 2,
      unitPrice: 400.0,
      totalPrice: 800.0, // Corrected from 1200 to 800
      reason: "Corrected line item math error from $1,200 to $800 (2 × $400)",
      actorRole: "hospital_staff",
      actorName: "Sarah Billing Specialist",
    });

    const correctedItem = updated.lineItems.find((li) => li.id === "li-disc-7");
    expect(correctedItem?.totalPrice.value).toBe(800.0);
    expect(correctedItem?.totalPrice.status).toBe("corrected");
    expect(
      updated.auditLog.some((e) => e.eventType === "FIELD_CORRECTED"),
    ).toBe(true);
  });

  it("records insurer adjudicator decisions with audit trail", async () => {
    const updated = await dataAccess.recordDecision({
      claimId: "claim-apex-001",
      outcome: "approved",
      rationale:
        "Outpatient arthroscopy schedule verified against prior authorization.",
      adjudicatorRole: "insurer_reviewer",
      adjudicatorName: "David Senior Adjudicator",
    });

    expect(updated.status).toBe("approved");
    expect(updated.latestDecision?.outcome).toBe("approved");
    expect(updated.latestDecision?.adjudicatorName).toBe(
      "David Senior Adjudicator",
    );
    expect(
      updated.auditLog.some((e) => e.eventType === "DECISION_RECORDED"),
    ).toBe(true);
  });

  describe("Data-Layer Status Transition Enforcement", () => {
    it("allows legal status transitions for hospital staff", async () => {
      // claim-memorial-002 is flagged
      const claim = await dataAccess.getClaimById("claim-memorial-002");
      expect(claim?.status).toBe("flagged");

      const updated = await dataAccess.updateClaimStatus(
        "claim-memorial-002",
        "under_review",
        "hospital_staff",
        "Audit discrepancies resolved by billing clerk.",
      );
      expect(updated.status).toBe("under_review");
      expect(updated.auditLog[0]?.eventType).toBe("STATUS_TRANSITION");
      expect(updated.auditLog[0]?.summary).toContain(
        "Claim status changed from flagged to under_review",
      );
    });

    it("strictly rejects illegal status transitions in data layer (e.g. hospital staff approving claim)", async () => {
      // hospital staff cannot transition to approved
      await expect(
        dataAccess.updateClaimStatus(
          "claim-memorial-002",
          "approved",
          "hospital_staff",
        ),
      ).rejects.toThrow(/BillBridge Data Layer: Illegal status transition/);
    });

    it("strictly rejects illegal status transitions for patient role", async () => {
      // patient cannot transition to approved or rejected
      await expect(
        dataAccess.updateClaimStatus("claim-beacon-003", "approved", "patient"),
      ).rejects.toThrow(/BillBridge Data Layer: Illegal status transition/);
    });

    it("allows insurer reviewer to approve or reject claims under review", async () => {
      // Set claim to under_review first
      await dataAccess.updateClaimStatus(
        "claim-beacon-003",
        "under_review",
        "hospital_staff",
      );

      const approved = await dataAccess.updateClaimStatus(
        "claim-beacon-003",
        "approved",
        "insurer_reviewer",
        "Coverage confirmed.",
      );
      expect(approved.status).toBe("approved");
    });

    it("rejects recordDecision if claim is not in an eligible state or role is unauthorized", async () => {
      // Attempting to record decision as hospital_staff
      await expect(
        dataAccess.recordDecision({
          claimId: "claim-apex-001",
          outcome: "approved",
          rationale: "Unauthorized approval attempt",
          adjudicatorRole: "hospital_staff" as any,
          adjudicatorName: "Dr. Unauthorized",
        }),
      ).rejects.toThrow(/BillBridge Data Layer/);
    });
  });

  describe("Multi-Field Search and Filtering", () => {
    it("filters claims by patient name search query", async () => {
      const res = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        search: "Aarav",
      });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(
        res.items.every((c) => c.patient.fullName.value?.includes("Aarav")),
      ).toBe(true);
    });

    it("filters claims by provider name search query", async () => {
      const res = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        search: "Memorial",
      });
      expect(res.items.length).toBe(1);
      expect(res.items[0]?.hospital.providerName.value).toContain("Memorial");
    });

    it("filters claims by status", async () => {
      const res = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        status: "flagged",
      });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.items.every((c) => c.status === "flagged")).toBe(true);
    });

    it("filters claims by date range", async () => {
      const res = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        startDate: "2026-10-01",
        endDate: "2026-10-31",
      });
      expect(res.items.length).toBe(2);
      for (const item of res.items) {
        const stmtDate = item.hospital.statementDate.value;
        if (stmtDate) {
          expect(stmtDate >= "2026-10-01" && stmtDate <= "2026-10-31").toBe(
            true,
          );
        }
      }
    });

    it("sorts claims by claimedTotal ascending and descending", async () => {
      const desc = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        sortBy: "claimedTotal",
        sortDirection: "desc",
      });
      const totalsDesc = desc.items.map(
        (i) => i.totals.statedBilledTotal.value || 0,
      );
      for (let i = 0; i < totalsDesc.length - 1; i++) {
        expect(totalsDesc[i]!).toBeGreaterThanOrEqual(totalsDesc[i + 1]!);
      }

      const asc = await dataAccess.getClaims({
        page: 1,
        pageSize: 10,
        sortBy: "claimedTotal",
        sortDirection: "asc",
      });
      const totalsAsc = asc.items.map(
        (i) => i.totals.statedBilledTotal.value || 0,
      );
      for (let i = 0; i < totalsAsc.length - 1; i++) {
        expect(totalsAsc[i]!).toBeLessThanOrEqual(totalsAsc[i + 1]!);
      }
    });
  });
});

describe("Role Permissions Matrix", () => {
  it("enforces strict hospital staff permissions", () => {
    expect(hasPermission("hospital_staff", "DOCUMENT_UPLOAD")).toBe(true);
    expect(hasPermission("hospital_staff", "LINE_ITEM_EDIT")).toBe(true);
    expect(hasPermission("hospital_staff", "APPROVE_CLAIM")).toBe(false); // Hospital cannot approve its own claim
    expect(hasPermission("hospital_staff", "REJECT_CLAIM")).toBe(false);
  });

  it("enforces insurer adjudicator permissions", () => {
    expect(hasPermission("insurer_reviewer", "APPROVE_CLAIM")).toBe(true);
    expect(hasPermission("insurer_reviewer", "REJECT_CLAIM")).toBe(true);
    expect(hasPermission("insurer_reviewer", "LINE_ITEM_EDIT")).toBe(false); // Insurer does not alter provider's original bill
    expect(hasPermission("insurer_reviewer", "DOCUMENT_UPLOAD")).toBe(false);
  });

  it("enforces patient view-only access", () => {
    expect(hasPermission("patient", "DOCUMENT_UPLOAD")).toBe(true);
    expect(hasPermission("patient", "LINE_ITEM_EDIT")).toBe(false);
    expect(hasPermission("patient", "APPROVE_CLAIM")).toBe(false);
    expect(hasPermission("patient", "EXPORT_DATA")).toBe(true);
  });
});
