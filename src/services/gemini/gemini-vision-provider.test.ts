import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GeminiVisionProvider,
  sanitizeModelJsonOutput,
  ExtractionTimeoutError,
  MalformedOutputError,
  RateLimitExceededError,
} from "./gemini-vision-provider";
import { GeminiBillExtractionSchema } from "./types";

describe("GeminiVisionProvider Server-Side Multimodal Extraction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dummyBuffer = new Uint8Array([1, 2, 3, 4, 5]);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DEMO MODE & DETERMINISTIC MOCK ADAPTER
  // ───────────────────────────────────────────────────────────────────────────
  describe("Demo Mode & Mock Adapter Fallback", () => {
    it("initializes in demo mode when API key is empty or placeholder", () => {
      const providerNoKey = new GeminiVisionProvider();
      expect(providerNoKey.isDemo).toBe(true);

      const providerPlaceholder = new GeminiVisionProvider(
        "your-gemini-api-key-here",
      );
      expect(providerPlaceholder.isDemo).toBe(true);

      const providerDemoPrefix = new GeminiVisionProvider("demo_sample_token");
      expect(providerDemoPrefix.isDemo).toBe(true);
    });

    it("returns validated extraction with [MOCK DEMO ADAPTER] metrics in demo mode", async () => {
      const provider = new GeminiVisionProvider();
      const res = await provider.extractBillFromBuffer(
        dummyBuffer,
        "application/pdf",
      );

      expect(res.metrics.isMockDemo).toBe(true);
      expect(res.metrics.model).toContain("MOCK DEMO ADAPTER");
      expect(res.data.lineItems.length).toBeGreaterThan(0);
      expect(res.data.statedBilledTotal).toBe(48500.0);
      expect(res.data.provider.name).toBe("Apollo Hospitals, Bengaluru");

      // Verify runtime Zod validation succeeded
      expect(() => GeminiBillExtractionSchema.parse(res.data)).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. MARKDOWN CODE FENCE SANITIZATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("Markdown Code Fence Sanitization", () => {
    it("strips ```json ... ``` code fences cleanly", () => {
      const raw =
        '```json\n{"currency": "INR", "statedBilledTotal": 1000}\n```';
      const sanitized = sanitizeModelJsonOutput(raw);
      expect(sanitized).toBe('{"currency": "INR", "statedBilledTotal": 1000}');
    });

    it("strips generic ``` ... ``` code fences", () => {
      const raw = '```\n{"test": true}\n```';
      const sanitized = sanitizeModelJsonOutput(raw);
      expect(sanitized).toBe('{"test": true}');
    });

    it("preserves already clean JSON strings untouched", () => {
      const clean = '{"provider": "Fortis"}';
      expect(sanitizeModelJsonOutput(clean)).toBe(clean);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STRUCTURED OUTPUT VALIDATION & RUNTIME SCHEMA
  // ───────────────────────────────────────────────────────────────────────────
  describe("Structured Output & Runtime Schema Validation", () => {
    it("validates compliant structured JSON output against Zod schema", async () => {
      const validPayload = {
        provider: { name: "Max Healthcare", npiOrRohiniId: "ROHINI-DEL-101" },
        patient: { name: "Priya Sharma", patientId: "PT-101" },
        statedBilledTotal: 25000,
        currency: "INR",
        lineItems: [
          {
            lineNumber: 1,
            code: "99214",
            description: "Physician Consult",
            quantity: 1,
            unitPrice: 25000,
            totalPrice: 25000,
            confidenceScore: 0.99,
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(validPayload) }] } },
            ],
            usageMetadata: { totalTokenCount: 300 },
          }),
        }),
      );

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");
      expect(provider.isDemo).toBe(false);

      const res = await provider.extractBillFromBuffer(
        dummyBuffer,
        "image/png",
      );
      expect(res.data.provider.name).toBe("Max Healthcare");
      expect(res.data.lineItems[0]!.code).toBe("99214");
      expect(res.metrics.totalTokens).toBe(300);
      expect(res.metrics.isMockDemo).toBe(false);
    });

    it("throws MalformedOutputError when model output violates runtime schema", async () => {
      // Missing mandatory lineItems
      const invalidPayload = {
        provider: { name: "General Clinic" },
        statedBilledTotal: 500,
        lineItems: [], // Violation: min(1) required
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: JSON.stringify(invalidPayload) }] },
              },
            ],
          }),
        }),
      );

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");

      await expect(
        provider.extractBillFromBuffer(dummyBuffer, "application/pdf", {
          maxRetries: 1,
        }),
      ).rejects.toThrow(MalformedOutputError);
    });

    it("throws MalformedOutputError when output is not valid JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Error: cannot parse this document." }],
                },
              },
            ],
          }),
        }),
      );

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");

      await expect(
        provider.extractBillFromBuffer(dummyBuffer, "application/pdf", {
          maxRetries: 1,
        }),
      ).rejects.toThrow(MalformedOutputError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. RATE LIMITING (HTTP 429) & BOUNDED EXPONENTIAL RETRIES
  // ───────────────────────────────────────────────────────────────────────────
  describe("Rate Limiting & Bounded Retries", () => {
    it("retries on HTTP 429 with bounded attempts and exponential backoff", async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          return {
            ok: false,
            status: 429,
            headers: new Headers({ "Retry-After": "0" }),
            text: async () => "Rate limit exceeded. Please slow down.",
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        provider: { name: "Clinic 24" },
                        patient: { name: "Patient X" },
                        statedBilledTotal: 1200,
                        lineItems: [
                          {
                            lineNumber: 1,
                            description: "Injection",
                            quantity: 1,
                            unitPrice: 1200,
                            totalPrice: 1200,
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      vi.stubGlobal("fetch", fetchMock);

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");
      const res = await provider.extractBillFromBuffer(
        dummyBuffer,
        "application/pdf",
        {
          maxRetries: 3,
          initialRetryDelayMs: 10,
        },
      );

      expect(callCount).toBe(2);
      expect(res.data.provider.name).toBe("Clinic 24");
      expect(res.metrics.attempts).toBe(2);
    });

    it("throws after exhausting all max retries", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => "Quota exceeded.",
      });

      vi.stubGlobal("fetch", fetchMock);

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");

      await expect(
        provider.extractBillFromBuffer(dummyBuffer, "application/pdf", {
          maxRetries: 2,
          initialRetryDelayMs: 5,
        }),
      ).rejects.toThrow(RateLimitExceededError);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TIMEOUT HANDLING
  // ───────────────────────────────────────────────────────────────────────────
  describe("Timeout Handling", () => {
    it("aborts and throws ExtractionTimeoutError when request exceeds timeoutMs", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_, { signal }) => {
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          });
        }),
      );

      const provider = new GeminiVisionProvider("valid-live-secret-key-01924");

      await expect(
        provider.extractBillFromBuffer(dummyBuffer, "application/pdf", {
          timeoutMs: 20,
          maxRetries: 1,
        }),
      ).rejects.toThrow(ExtractionTimeoutError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ZERO PHI LOGGING POLICY
  // ───────────────────────────────────────────────────────────────────────────
  describe("Zero PHI Logging Policy", () => {
    it("never logs raw patient names, medical descriptions, or identifiers in console telemetry", async () => {
      const consoleInfoSpy = vi
        .spyOn(console, "info")
        .mockImplementation(() => {});
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const provider = new GeminiVisionProvider(); // Demo provider
      await provider.extractBillFromBuffer(dummyBuffer, "application/pdf");

      const allLogs = [
        ...consoleInfoSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
      ]
        .flat()
        .join(" ");

      // Verify that sensitive PHI is NEVER in the log telemetry output
      expect(allLogs).not.toContain("Aarav Sharma");
      expect(allLogs).not.toContain("PT-34901");
      expect(allLogs).not.toContain("Computed tomography");
      expect(allLogs).not.toContain("Bannerghatta Road");

      // Verify that system metadata IS present
      expect(allLogs).toContain("BillBridge-GeminiVision");
      expect(allLogs).toContain("fileSizeBytes");
      expect(allLogs).toContain("durationMs");
    });
  });
});
