import { describe, it, expect } from "vitest";
import { N8nWebhookStubService } from "./n8n-adapter";
import { MOCK_CLAIM_DISCREPANCY } from "@/data/mock-claims";

describe("N8nWebhookStubService", () => {
  const service = new N8nWebhookStubService();

  it("safely records simulated webhook dispatch without network calls", async () => {
    const result = await service.dispatch(
      "claim.flagged_for_review",
      MOCK_CLAIM_DISCREPANCY,
      "hospital_staff",
    );

    expect(result.dispatched).toBe(true);
    expect(result.mode).toBe("simulated");
    expect(result.receiptId).toContain("evt-");
    expect(result.message).toContain("held pending workflow template approval");
  });
});
