import { describe, it, expect, beforeEach } from "vitest";
import { submitClaim } from "./claim-submission";
import { MOCK_CLAIM_CLEAN } from "@/data/mock-claims";
import { getClaimStorage } from "./storage-adapter";

describe("Claim Submission Service (claim-submission.ts)", () => {
  beforeEach(async () => {
    const storage = getClaimStorage();
    await storage.resetToMockData();
  });

  it("strictly prohibits submission when patient consent is false", async () => {
    await expect(
      submitClaim({
        claim: MOCK_CLAIM_CLEAN,
        claimType: "Cashless",
        patientConsent: false,
        actorName: "Test Officer",
        actorRole: "hospital_staff",
      }),
    ).rejects.toThrow(/consent is strictly mandatory/i);
  });

  it("submits a claim with verified consent and appends audit event", async () => {
    const res = await submitClaim({
      claim: MOCK_CLAIM_CLEAN,
      claimType: "Cashless",
      patientConsent: true,
      actorName: "Pooja Hegde",
      actorRole: "hospital_staff",
    });

    expect(res.success).toBe(true);
    expect(res.claimRef).toBe("BB-DEMO-1003");
    expect(res.idempotencyKey).toBeDefined();
    expect(res.simulated).toBe(true);

    // Verify storage has the updated claim with the CLAIM_SUBMITTED audit event
    const storage = getClaimStorage();
    const stored = await storage.getClaimById(res.claimId);
    expect(stored).toBeDefined();
    expect(stored?.auditTrail.some((e) => e.action === "CLAIM_SUBMITTED")).toBe(
      true,
    );
  });

  it("safely handles duplicate submissions using idempotency key", async () => {
    const customKey = "idem-unique-test-token-777";

    // First submission
    const res1 = await submitClaim({
      claim: MOCK_CLAIM_CLEAN,
      claimType: "Cashless",
      patientConsent: true,
      actorName: "Pooja Hegde",
      actorRole: "hospital_staff",
      idempotencyKey: customKey,
    });

    expect(res1.success).toBe(true);

    // Duplicate submission with identical key
    const res2 = await submitClaim({
      claim: MOCK_CLAIM_CLEAN,
      claimType: "Cashless",
      patientConsent: true,
      actorName: "Pooja Hegde",
      actorRole: "hospital_staff",
      idempotencyKey: customKey,
    });

    expect(res2.success).toBe(true);
    expect(res2.message).toContain("Duplicate request detected");
  });
});
