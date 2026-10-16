import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageClaimStorage } from "./storage-adapter";
import { MOCK_CLAIM_CLEAN } from "@/data/mock-claims";

describe("LocalStorageClaimStorage", () => {
  let storage: LocalStorageClaimStorage;

  beforeEach(() => {
    storage = new LocalStorageClaimStorage();
  });

  it("seeds initial mock claims when storage is empty", async () => {
    const claims = await storage.getClaims();
    expect(claims.length).toBeGreaterThanOrEqual(3);
    expect(claims.some((c) => c.id === MOCK_CLAIM_CLEAN.id)).toBe(true);
  });

  it("fetches a claim by ID", async () => {
    const claim = await storage.getClaimById(MOCK_CLAIM_CLEAN.id);
    expect(claim).toBeDefined();
    expect(claim?.claimNumber).toBe(MOCK_CLAIM_CLEAN.claimNumber);
  });

  it("returns null for non-existent claim ID", async () => {
    const claim = await storage.getClaimById("non-existent-id-999");
    expect(claim).toBeNull();
  });

  it("updates an existing claim with partial patches", async () => {
    const updated = await storage.updateClaim(MOCK_CLAIM_CLEAN.id, {
      status: "under_review",
      reviewerNotes: "Manual review requested by tester.",
    });

    expect(updated.status).toBe("under_review");
    expect(updated.reviewerNotes).toBe("Manual review requested by tester.");

    const retrieved = await storage.getClaimById(MOCK_CLAIM_CLEAN.id);
    expect(retrieved?.status).toBe("under_review");
  });

  it("resets to initial mock claims", async () => {
    await storage.deleteClaim(MOCK_CLAIM_CLEAN.id);
    const beforeReset = await storage.getClaimById(MOCK_CLAIM_CLEAN.id);
    expect(beforeReset).toBeNull();

    await storage.resetToMockData();
    const afterReset = await storage.getClaimById(MOCK_CLAIM_CLEAN.id);
    expect(afterReset).toBeDefined();
  });
});
