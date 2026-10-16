import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  escapeCsvCell,
  generateClaimsRegistryCsv,
  generateSingleClaimCsv,
  generateClaimsRegistryJson,
  generateSingleClaimJson,
  filterAuthorizedClaims,
  validateSingleClaimAccess,
  computeActualMetricsSummary,
  isExcelSupported,
  getExcelSupportStatus,
  exportClaimsRegistry,
  exportSingleReviewedClaim,
  UnauthorizedExportError,
  UnsupportedExportFormatError,
  EXPORT_SCHEMA_VERSION,
  CSV_BOM,
} from "./export-service";
import { mapRecordToClaim } from "./data-access";
import {
  MOCK_CLAIM_DISCREPANCY,
  MOCK_CLAIM_CLEAN,
  MOCK_CLAIM_MISSING_CODES,
} from "@/data/mock-claims";
import type { Claim } from "@/types/contracts";

describe("BillBridge Export Service", () => {
  const claimDiscrepancy = mapRecordToClaim(MOCK_CLAIM_DISCREPANCY);
  const claimClean = mapRecordToClaim(MOCK_CLAIM_CLEAN);
  const claimMissingCodes = mapRecordToClaim(MOCK_CLAIM_MISSING_CODES);
  const sampleClaims = [claimDiscrepancy, claimClean, claimMissingCodes];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CSV ESCAPING & SPREADSHEET FORMULA INJECTION DEFENSE (CWE-1236)
  // ───────────────────────────────────────────────────────────────────────────
  describe("CSV Cell Escaping & Formula Injection Defense", () => {
    it("handles null and undefined by returning an empty string", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("formats numbers and booleans safely", () => {
      expect(escapeCsvCell(45000)).toBe("45000");
      expect(escapeCsvCell(0)).toBe("0");
      expect(escapeCsvCell(1250.75)).toBe("1250.75");
      expect(escapeCsvCell(NaN)).toBe("");
      expect(escapeCsvCell(Infinity)).toBe("");
      expect(escapeCsvCell(true)).toBe("true");
      expect(escapeCsvCell(false)).toBe("false");
    });

    it("escapes fields with commas by wrapping in double quotes", () => {
      const input = "Apollo Hospitals, Bengaluru, Karnataka";
      const result = escapeCsvCell(input);
      expect(result).toBe('"Apollo Hospitals, Bengaluru, Karnataka"');
    });

    it("escapes fields with double quotes by doubling them and enclosing in quotes", () => {
      const input = 'Patient reported "severe acute pain" during intake';
      const result = escapeCsvCell(input);
      expect(result).toBe(
        '"Patient reported ""severe acute pain"" during intake"',
      );
    });

    it("escapes fields containing both commas and quotes correctly", () => {
      const input = 'Dr. Rao, MD, stated: "Requires surgical intervention"';
      const result = escapeCsvCell(input);
      expect(result).toBe(
        '"Dr. Rao, MD, stated: ""Requires surgical intervention"""',
      );
    });

    it("preserves Unicode and Telugu text with proper quoting when commas exist", () => {
      const teluguText = "అపోలో హాస్పిటల్స్, హైదరాబాద్";
      const result = escapeCsvCell(teluguText);
      expect(result).toBe('"అపోలో హాస్పిటల్స్, హైదరాబాద్"');
      expect(result).toContain("అపోలో");
    });

    it("preserves Telugu text without commas without corrupting characters", () => {
      const teluguNoComma = "రక్త పరీక్ష మరియు శస్త్రచికిత్స";
      const result = escapeCsvCell(teluguNoComma);
      expect(result).toBe("రక్త పరీక్ష మరియు శస్త్రచికిత్స");
    });

    it("preserves Rupee amounts with currency symbols and formatting", () => {
      const rupeeAmountWithComma = "₹1,25,000.00";
      const result = escapeCsvCell(rupeeAmountWithComma);
      expect(result).toBe('"₹1,25,000.00"');

      const rupeeAmountClean = "₹48500";
      expect(escapeCsvCell(rupeeAmountClean)).toBe("₹48500");
    });

    it("handles long descriptions and multi-line text by wrapping in quotes and preserving newlines", () => {
      const longDesc =
        "Patient presented with acute right knee anterior cruciate ligament (ACL) rupture accompanied by grade-3 medial meniscal tear following high-velocity sports trauma.\n" +
        "Underwent day-care arthroscopic meniscectomy and reconstructive stabilization.\n" +
        "Post-procedure recovery uneventful with stable neurovascular examination.";

      const result = escapeCsvCell(longDesc);
      expect(result.startsWith('"')).toBe(true);
      expect(result.endsWith('"')).toBe(true);
      expect(result).toContain("\n");
      expect(result).toContain("grade-3 medial meniscal tear");
    });

    // Formula injection tests
    it("escapes formula character '=' by prepending single quote and wrapping in quotes", () => {
      const formulaInput = "=SUM(A1:A10)";
      const result = escapeCsvCell(formulaInput);
      expect(result).toBe('"\'=SUM(A1:A10)"');
    });

    it("escapes malicious command injection formulas like '=cmd|' /C calc'!A0'", () => {
      const malicious = "=cmd|' /C calc'!A0";
      const result = escapeCsvCell(malicious);
      expect(result).toBe("\"'=cmd|' /C calc'!A0\"");
    });

    it("escapes formula character '+' by prepending single quote", () => {
      const plusInput = "+919876543210";
      const result = escapeCsvCell(plusInput);
      expect(result).toBe('"\'+919876543210"');
    });

    it("escapes formula character '-' in string input by prepending single quote", () => {
      const minusInput = "-5+2+cmd|' /C calc'!A0";
      const result = escapeCsvCell(minusInput);
      expect(result).toBe("\"'-5+2+cmd|' /C calc'!A0\"");
    });

    it("escapes formula character '@' by prepending single quote", () => {
      const atInput = "@SUM(B1:B5)";
      const result = escapeCsvCell(atInput);
      expect(result).toBe('"\'@SUM(B1:B5)"');
    });

    it("escapes horizontal tab '\\t' preceding a formula", () => {
      const tabInput = "\t=1+1";
      const result = escapeCsvCell(tabInput);
      expect(result).toBe('"\'\t=1+1"');
    });

    it("escapes carriage return '\\r' preceding a formula", () => {
      const crInput = "\r=1+1";
      const result = escapeCsvCell(crInput);
      expect(result).toBe('"\'\r=1+1"');
    });

    it("escapes formula character when preceded by leading whitespace", () => {
      const spaceThenFormula = "   =1+1";
      const result = escapeCsvCell(spaceThenFormula);
      expect(result.startsWith('"\'   =1+1"')).toBe(true);
    });

    it("escapes pipe '|' character", () => {
      const pipeInput = "|test";
      const result = escapeCsvCell(pipeInput);
      expect(result).toBe('"\'|test"');
    });

    it("escapes percent '%' character when leading", () => {
      const percentInput = "%total";
      const result = escapeCsvCell(percentInput);
      expect(result).toBe('"\'%total"');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CSV EXPORT FOR CLAIMS REGISTRY & SINGLE CLAIMS
  // ───────────────────────────────────────────────────────────────────────────
  describe("CSV Generation & Formatting", () => {
    it("generates registry CSV starting with UTF-8 BOM", () => {
      const csv = generateClaimsRegistryCsv(sampleClaims);
      expect(csv.startsWith(CSV_BOM)).toBe(true);
    });

    it("includes metadata comments and schema version in registry CSV", () => {
      const csv = generateClaimsRegistryCsv(sampleClaims);
      expect(csv).toContain(`# Schema Version: ${EXPORT_SCHEMA_VERSION}`);
      expect(csv).toContain("# BillBridge Claims Registry Export");
      expect(csv).toContain("Data Classification");
    });

    it("labels synthetic demo records in registry CSV columns", () => {
      const csv = generateClaimsRegistryCsv(sampleClaims);
      expect(csv).toContain("[DEMO] Synthetic Record");
      expect(csv).toContain("BB-DEMO-1001");
      expect(csv).toContain("BB-DEMO-1003");
      expect(csv).toContain("BB-DEMO-1002");
    });

    it("computes totals summary row from actual records in registry CSV", () => {
      const csv = generateClaimsRegistryCsv(sampleClaims);
      expect(csv).toContain(`TOTALS (${sampleClaims.length} CLAIMS)`);
      // Total billed should match sum of 48500 + 76200 + 32750 = 157450
      expect(csv).toContain("157450");
    });

    it("generates detailed single claim CSV with line items, UTF-8 BOM and reconciliation rows", () => {
      const csv = generateSingleClaimCsv(claimDiscrepancy);
      expect(csv.startsWith(CSV_BOM)).toBe(true);
      expect(csv).toContain(
        `# Claim Reference: ${claimDiscrepancy.claimNumber}`,
      );
      expect(csv).toContain("Emergency room intensive care evaluation");
      expect(csv).toContain("99285");
      expect(csv).toContain(
        "Computed tomography (CT scan), head or brain; without contrast",
      );
      expect(csv).toContain("HEADER_TOTAL");
      expect(csv).toContain("ITEMIZED_SUM");
      expect(csv).toContain("VARIANCE");
    });

    it("escapes formula-like descriptions inside single claim line items", () => {
      const firstItem = claimDiscrepancy.lineItems[0]!;
      const taintedClaim: Claim = {
        ...claimDiscrepancy,
        lineItems: [
          ...claimDiscrepancy.lineItems,
          {
            ...firstItem,
            lineNumber: 8,
            id: "li-tainted",
            description: {
              ...firstItem.description,
              value: "=cmd|' /C calc'!A0",
            },
            notes: "+91-9876543210 formula injection attempt",
          },
        ],
      };

      const csv = generateSingleClaimCsv(taintedClaim);
      expect(csv).toContain("\"'=cmd|' /C calc'!A0\"");
      expect(csv).toContain('"\'+91-9876543210 formula injection attempt"');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. JSON EXPORT & SCHEMA VERSIONING
  // ───────────────────────────────────────────────────────────────────────────
  describe("JSON Export & Schema Versioning", () => {
    it("includes schemaVersion '1.0.0' in claims registry JSON", () => {
      const jsonStr = generateClaimsRegistryJson(sampleClaims, {
        userRole: "hospital_staff",
        user: { id: "u-1", role: "hospital_staff", displayName: "Dr. Test" },
      });
      const parsed = JSON.parse(jsonStr);

      expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
      expect(parsed.schemaVersion).toBe("1.0.0");
      expect(parsed.$schema).toContain("claims-export.json");
      expect(parsed.exportMetadata.system).toBe("BillBridge");
      expect(parsed.exportMetadata.recordCount).toBe(3);
    });

    it("labels synthetic demo metrics and notes in registry JSON", () => {
      const jsonStr = generateClaimsRegistryJson(sampleClaims);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.exportMetadata.isSyntheticDemo).toBe(true);
      expect(parsed.exportMetadata.dataClassification).toBe("SYNTHETIC_DEMO");
      expect(parsed.exportMetadata.demoNotice).toBeDefined();
      expect(parsed.exportMetadata.actualMetricsSummary.isDemoCalculated).toBe(
        true,
      );
      expect(parsed.exportMetadata.actualMetricsSummary.demoLabel).toContain(
        "[DEMO METRICS",
      );
      expect(parsed.exportMetadata.actualMetricsSummary.totalBilledINR).toBe(
        157450,
      );
    });

    it("includes schemaVersion '1.0.0' in single claim JSON", () => {
      const jsonStr = generateSingleClaimJson(claimDiscrepancy, {
        userRole: "insurer_reviewer",
      });
      const parsed = JSON.parse(jsonStr);

      expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
      expect(parsed.schemaVersion).toBe("1.0.0");
      expect(parsed.claim.claimNumber).toBe("BB-DEMO-1001");
      expect(parsed.exportMetadata.actualMetricsSummary.claimNumber).toBe(
        "BB-DEMO-1001",
      );
      expect(parsed.exportMetadata.actualMetricsSummary.hasVariance).toBe(true);
    });

    it("preserves Telugu unicode strings and rupee values intact in JSON output", () => {
      const teluguClaim: Claim = {
        ...claimClean,
        patient: {
          ...claimClean.patient,
          fullName: {
            ...claimClean.patient.fullName,
            value: "విక్రమ్ మల్హోత్రా",
          },
        },
        hospital: {
          ...claimClean.hospital,
          providerName: {
            ...claimClean.hospital.providerName,
            value: "ఫోర్టిస్ మెమోరియల్ రీసెర్చ్ ఇన్స్టిట్యూట్",
          },
        },
      };

      const jsonStr = generateSingleClaimJson(teluguClaim);
      expect(jsonStr).toContain("విక్రమ్ మల్హోత్రా");
      expect(jsonStr).toContain("ఫోర్టిస్ మెమోరియల్ రీసెర్చ్ ఇన్స్టిట్యూట్");

      const parsed = JSON.parse(jsonStr);
      expect(parsed.claim.patient.fullName.value).toBe("విక్రమ్ మల్హోత్రా");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. METRICS ACCURACY BASED ON ACTUAL AVAILABLE DATA
  // ───────────────────────────────────────────────────────────────────────────
  describe("Metrics Computation Based on Actual Available Data", () => {
    it("dynamically sums actual billed total, itemized total, and variance", () => {
      const summary = computeActualMetricsSummary(sampleClaims);

      const expectedBilled =
        (claimDiscrepancy.totals.statedBilledTotal.value || 0) +
        (claimClean.totals.statedBilledTotal.value || 0) +
        (claimMissingCodes.totals.statedBilledTotal.value || 0);

      const expectedItemized =
        claimDiscrepancy.totals.itemizedSumTotal +
        claimClean.totals.itemizedSumTotal +
        claimMissingCodes.totals.itemizedSumTotal;

      expect(summary.recordCount).toBe(3);
      expect(summary.totalBilledINR).toBe(expectedBilled);
      expect(summary.totalItemizedINR).toBe(expectedItemized);
      expect(summary.flaggedCount).toBe(1);
      expect(summary.approvedCount).toBe(1);
      expect(summary.underReviewCount).toBe(1);
      expect(summary.rejectedCount).toBe(0);
      expect(summary.isSyntheticDemo).toBe(true);
    });

    it("computes empty metrics correctly for an empty collection", () => {
      const summary = computeActualMetricsSummary([]);
      expect(summary.recordCount).toBe(0);
      expect(summary.totalBilledINR).toBe(0);
      expect(summary.totalItemizedINR).toBe(0);
      expect(summary.totalVarianceINR).toBe(0);
      expect(summary.isSyntheticDemo).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. EXCEL SUPPORT RELIABILITY EVALUATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("Excel Support Reliability Verification", () => {
    it("reports that Excel is not supported natively by the current lean stack", () => {
      expect(isExcelSupported()).toBe(false);
      const status = getExcelSupportStatus();
      expect(status.supported).toBe(false);
      expect(status.reason).toContain(
        "Modern .xlsx binary workbook generation is not supported",
      );
    });

    it("throws UnsupportedExportFormatError when attempting to export as Excel", async () => {
      await expect(
        exportClaimsRegistry(sampleClaims, {
          format: "excel",
          userRole: "hospital_staff",
        }),
      ).rejects.toThrow(UnsupportedExportFormatError);

      await expect(
        exportSingleReviewedClaim(claimClean, {
          format: "excel",
          userRole: "hospital_staff",
        }),
      ).rejects.toThrow(UnsupportedExportFormatError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. AUTHORIZATION ENFORCEMENT & PATIENT DATA ISOLATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("Authorization & Access Control", () => {
    it("allows hospital_staff to export all encounters in their queue", () => {
      const authorized = filterAuthorizedClaims(sampleClaims, "hospital_staff");
      expect(authorized.length).toBe(3);
    });

    it("allows insurer_reviewer to export claims in their queue", () => {
      const authorized = filterAuthorizedClaims(
        sampleClaims,
        "insurer_reviewer",
      );
      expect(authorized.length).toBe(3);
    });

    it("restricts patient role to ONLY their own claim encounters by patientId", () => {
      const patientUser = {
        id: "usr-aarav",
        role: "patient" as const,
        patientId: "PT-34901",
        displayName: "Aarav Sharma",
      };

      const authorized = filterAuthorizedClaims(
        sampleClaims,
        "patient",
        patientUser,
      );
      expect(authorized.length).toBe(1);
      expect(authorized[0]!.patient.id).toBe("PT-34901");
      expect(authorized[0]!.claimNumber).toBe("BB-DEMO-1001");
    });

    it("does not leak another patient's claim to a patient user", () => {
      const patientVikram = {
        id: "usr-vikram",
        role: "patient" as const,
        patientId: "PT-89412",
        displayName: "Vikram Malhotra",
      };

      const authorized = filterAuthorizedClaims(
        sampleClaims,
        "patient",
        patientVikram,
      );
      expect(authorized.length).toBe(1);
      expect(authorized[0]!.patient.id).toBe("PT-89412");
      expect(authorized[0]!.claimNumber).toBe("BB-DEMO-1003");

      // Verify that Aarav's claim (PT-34901) and Priya's claim (PT-55102) are excluded
      const ids = authorized.map((c) => c.patient.id);
      expect(ids).not.toContain("PT-34901");
      expect(ids).not.toContain("PT-55102");
    });

    it("prevents single claim export if patient is unauthorized for that record", () => {
      const patientVikram = {
        id: "usr-vikram",
        role: "patient" as const,
        patientId: "PT-89412",
        displayName: "Vikram Malhotra",
      };

      // Attempting to export Aarav's claim (claimDiscrepancy) as Vikram
      expect(() => {
        validateSingleClaimAccess(claimDiscrepancy, "patient", patientVikram);
      }).toThrow(UnauthorizedExportError);
    });

    it("allows patient to export their own single claim", () => {
      const patientAarav = {
        id: "usr-aarav",
        role: "patient" as const,
        patientId: "PT-34901",
        displayName: "Aarav Sharma",
      };

      expect(() => {
        validateSingleClaimAccess(claimDiscrepancy, "patient", patientAarav);
      }).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. HIGH-LEVEL EXPORT ACTIONS & DOWNLOAD HANDLING
  // ───────────────────────────────────────────────────────────────────────────
  describe("High-Level Export Actions", () => {
    beforeEach(() => {
      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue({
          setAttribute: vi.fn(),
          style: {},
          click: vi.fn(),
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
        revokeObjectURL: vi.fn(),
      });
    });

    it("successfully exports claims registry as CSV", async () => {
      const result = await exportClaimsRegistry(sampleClaims, {
        format: "csv",
        userRole: "hospital_staff",
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.recordCount).toBe(3);
      expect(result.filename).toContain("billbridge_claims_registry");
      expect(result.filename.endsWith(".csv")).toBe(true);
      expect(result.content.startsWith(CSV_BOM)).toBe(true);
    });

    it("successfully exports claims registry as JSON", async () => {
      const result = await exportClaimsRegistry(sampleClaims, {
        format: "json",
        userRole: "insurer_reviewer",
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
      expect(result.recordCount).toBe(3);
      expect(result.filename.endsWith(".json")).toBe(true);
      expect(result.schemaVersion).toBe("1.0.0");
    });

    it("throws when patient has 0 matching records", async () => {
      const patientNobody = {
        id: "usr-ghost",
        role: "patient" as const,
        patientId: "PT-NONEXISTENT",
        displayName: "Ghost User",
      };

      await expect(
        exportClaimsRegistry(sampleClaims, {
          format: "csv",
          userRole: "patient",
          user: patientNobody,
        }),
      ).rejects.toThrow("No authorized claim encounters found to export.");
    });

    it("successfully exports single reviewed claim as CSV", async () => {
      const result = await exportSingleReviewedClaim(claimClean, {
        format: "csv",
        userRole: "hospital_staff",
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.recordCount).toBe(1);
      expect(result.filename).toContain("bb_demo_1003");
      expect(result.content).toContain("Arthroscopy, knee, surgical");
    });

    it("successfully exports single reviewed claim as JSON", async () => {
      const result = await exportSingleReviewedClaim(claimDiscrepancy, {
        format: "json",
        userRole: "insurer_reviewer",
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
      expect(result.schemaVersion).toBe("1.0.0");
      expect(result.content).toContain(
        "apollo_emergency_admission_discrepancy.pdf",
      );
    });
  });
});
