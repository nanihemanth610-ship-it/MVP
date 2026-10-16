import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MockGeminiExtractor,
  ServerBoundaryGeminiExtractor,
  getExtractionService,
} from "./gemini-adapter";

describe("Gemini Extraction Client Adapter & Boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const extractor = new MockGeminiExtractor();

  it("extracts a mock discrepancy bill and emits progress events in demo mode", async () => {
    const fakeFile = new File(["dummy content"], "test_bill.pdf", {
      type: "application/pdf",
    });
    const progressSteps: string[] = [];

    const result = await extractor.extractBill(
      fakeFile,
      "discrepancy",
      (step) => {
        progressSteps.push(`${step.id}:${step.status}`);
      },
    );

    expect(result).toBeDefined();
    expect(result.document.fileName).toBe("test_bill.pdf");
    expect(result.lineItems.length).toBeGreaterThan(0);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(progressSteps.some((s) => s.includes("stage-4:completed"))).toBe(
      true,
    );
  });

  it("extracts a clean bill with 100% arithmetic reconciliation", async () => {
    const fakeFile = new File(["dummy clean"], "clean_bill.pdf", {
      type: "application/pdf",
    });

    const result = await extractor.extractBill(fakeFile, "clean");

    expect(result.discrepancies.length).toBe(0);
    expect(result.overallConfidenceLevel).toBe("high");
    expect(result.claimedTotal).toBe(result.calculatedTotal);
  });

  it("falls back to MockGeminiExtractor demo adapter if server boundary is offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Edge function connection refused")),
    );

    const serverExtractor = new ServerBoundaryGeminiExtractor(
      "https://demo.supabase.co",
      "anon-key",
    );
    const fakeFile = new File(["dummy"], "bill.pdf", {
      type: "application/pdf",
    });

    const result = await serverExtractor.extractBill(fakeFile, "clean");
    expect(result).toBeDefined();
    expect(result.claimedTotal).toBe(76200);
  });

  it("getExtractionService defaults to MockGeminiExtractor when live backend is unconfigured", () => {
    const active = getExtractionService();
    expect(active.mode).toBe("mock");
  });
});
