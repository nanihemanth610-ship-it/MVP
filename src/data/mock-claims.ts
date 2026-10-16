/**
 * BillBridge Synthetic Demo Datasets
 * Authentic, high-fidelity Indian healthcare encounters with synthetic patient & provider records.
 * Complies with Indian Rupee (₹), Indian numbering format, and NABH/Rohini hospital references.
 * Strictly synthetic - safe for hackathon demonstrations, test suites, and offline review.
 */

import type { ClaimRecord } from "@/types/claim";
import { reconcileBill } from "@/services/arithmetic-engine";

export const MOCK_CLAIM_CLEAN: ClaimRecord = (() => {
  const lineItems = [
    {
      id: "li-clean-1",
      code: "29881",
      codeType: "CPT" as const,
      description:
        "Arthroscopy, knee, surgical; with meniscectomy (medial or lateral)",
      serviceDate: "2026-09-12",
      quantity: 1,
      unitPrice: 45000.0,
      totalPrice: 45000.0,
      confidence: "high" as const,
      confidenceScore: 0.99,
      notes: "Right knee medial meniscectomy, day-care surgical schedule",
    },
    {
      id: "li-clean-2",
      code: "01400",
      codeType: "CPT" as const,
      description:
        "Monitored anesthesia care (MAC) for arthroscopic knee procedure",
      serviceDate: "2026-09-12",
      quantity: 1,
      unitPrice: 15000.0,
      totalPrice: 15000.0,
      confidence: "high" as const,
      confidenceScore: 0.98,
      notes: "90 min monitored anesthesia care",
    },
    {
      id: "li-clean-3",
      code: "73721",
      codeType: "CPT" as const,
      description:
        "High-resolution MRI knee joint without contrast (pre-op planning)",
      serviceDate: "2026-09-08",
      quantity: 1,
      unitPrice: 11500.0,
      totalPrice: 11500.0,
      confidence: "high" as const,
      confidenceScore: 0.97,
    },
    {
      id: "li-clean-4",
      code: "99214",
      codeType: "CPT" as const,
      description:
        "Consultation, senior orthopedic surgeon pre-admission clinical evaluation",
      serviceDate: "2026-09-08",
      quantity: 1,
      unitPrice: 4700.0,
      totalPrice: 4700.0,
      confidence: "high" as const,
      confidenceScore: 0.99,
    },
  ];

  const claimedTotal = 76200.0;
  const reconciliation = reconcileBill(claimedTotal, lineItems);

  return {
    id: "claim-apex-001",
    claimNumber: "BB-DEMO-1003",
    bill: {
      id: "doc-apex-001",
      fileName: "fortis_surgical_inpatient_clean.pdf",
      fileSize: 428100,
      mimeType: "application/pdf",
      uploadedAt: "2026-09-15T09:30:00Z",
      previewUrl: "/samples/fortis_surgical_clean.pdf",
      providerName: "Fortis Memorial Research Institute",
      providerNpi: "ROHINI-GUR-7731",
      providerAddress:
        "Sector 44, Opposite HUDA City Centre, Gurugram, Haryana 122002",
      patientName: "Vikram Malhotra",
      patientId: "PT-89412",
      accountNumber: "ACC-2026-9041",
      statementDate: "2026-09-14",
      serviceStartDate: "2026-09-08",
      serviceEndDate: "2026-09-12",
      billedTotal: claimedTotal,
      patientResponsibility: 7600.0,
      insurancePaid: 68600.0,
    },
    lineItems,
    claimedTotal,
    calculatedTotal: reconciliation.calculatedTotal,
    variance: reconciliation.variance,
    discrepancies: reconciliation.discrepancies,
    status: "approved",
    auditTrail: [
      {
        id: "audit-1",
        timestamp: "2026-09-15T09:30:00Z",
        action: "DOCUMENT_UPLOADED",
        userRole: "hospital_staff",
        actorName: "Pooja Hegde, Billing Operations",
        details:
          "Clean inpatient electronic statement ingested for vision extraction.",
      },
      {
        id: "audit-2",
        timestamp: "2026-09-15T09:30:15Z",
        action: "EXTRACTION_COMPLETED",
        userRole: "hospital_staff",
        actorName: "BillBridge AI Engine (Gemini)",
        details:
          "All 4 tariff lines extracted with 98.4% average confidence. Arithmetic 100% reconciled.",
      },
      {
        id: "audit-3",
        timestamp: "2026-09-15T11:20:00Z",
        action: "CLAIM_APPROVED",
        userRole: "insurer_reviewer",
        actorName: "Sunil Narang, Senior TPA Adjudicator",
        details:
          "Cashless pre-auth verified (#TPA-GUR-6710). Math validated without variance. Claim approved in demo mode.",
      },
    ],
    createdAt: "2026-09-15T09:30:00Z",
    updatedAt: "2026-09-15T11:20:00Z",
    assignedReviewer: "Sunil Narang",
    reviewerNotes:
      "Approved under GIPSA PPN agreed tariff schedule for day-care meniscectomy.",
  };
})();

export const MOCK_CLAIM_DISCREPANCY: ClaimRecord = (() => {
  const lineItems = [
    {
      id: "li-disc-1",
      code: "99285",
      codeType: "CPT" as const,
      description: "Emergency room intensive care evaluation (High Severity)",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 12500.0,
      totalPrice: 12500.0,
      confidence: "high" as const,
      confidenceScore: 0.96,
    },
    {
      id: "li-disc-2",
      code: "70450",
      codeType: "CPT" as const,
      description:
        "Computed tomography (CT scan), head or brain; without contrast",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 8500.0,
      totalPrice: 8500.0,
      confidence: "high" as const,
      confidenceScore: 0.94,
    },
    {
      id: "li-disc-3",
      code: "80053",
      codeType: "CPT" as const,
      description: "Comprehensive metabolic panel & critical electrolyte panel",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 2400.0,
      totalPrice: 2400.0,
      confidence: "high" as const,
      confidenceScore: 0.98,
    },
    {
      id: "li-disc-4",
      code: "93000",
      codeType: "CPT" as const,
      description:
        "12-lead digital electrocardiogram (ECG) with interpretation",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 1600.0,
      totalPrice: 1600.0,
      confidence: "high" as const,
      confidenceScore: 0.95,
    },
    {
      id: "li-disc-5",
      code: "99285",
      codeType: "CPT" as const,
      description: "Emergency room evaluation (Duplicate Charge Flagged)",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 7500.0,
      totalPrice: 7500.0,
      confidence: "medium" as const,
      confidenceScore: 0.76,
      notes:
        "Duplicate emergency evaluation charge on same admission date. Possible unbundling.",
    },
    {
      id: "li-disc-6",
      code: "96374",
      codeType: "CPT" as const,
      description: "Therapeutic IV infusion push medication administration",
      serviceDate: "2026-10-02",
      quantity: 1,
      unitPrice: 1500.0,
      totalPrice: 1500.0,
      confidence: "high" as const,
      confidenceScore: 0.92,
    },
    {
      id: "li-disc-7",
      code: "96360",
      codeType: "CPT" as const,
      description:
        "Intravenous clinical hydration infusion (Sterile Consumable Kit)",
      serviceDate: "2026-10-02",
      quantity: 2,
      unitPrice: 7250.0,
      totalPrice: 16000.0, // Line math error: 2 x 7,250 = 14,500, billed as 16,000 (creates ₹1,500 variance vs stated ₹48,500!)
      confidence: "medium" as const,
      confidenceScore: 0.72,
      notes:
        "Line math mismatch: 2 × ₹7,250 = ₹14,500, but entered as ₹16,000. Causes ₹1,500 bill variance.",
    },
  ];

  // Stated total on the hospital invoice header
  const claimedTotal = 48500.0;
  const reconciliation = reconcileBill(claimedTotal, lineItems);

  return {
    id: "claim-memorial-002",
    claimNumber: "BB-DEMO-1001",
    bill: {
      id: "doc-memorial-002",
      fileName: "apollo_emergency_admission_discrepancy.pdf",
      fileSize: 618400,
      mimeType: "application/pdf",
      uploadedAt: "2026-10-04T14:15:00Z",
      previewUrl: "/samples/apollo_emergency_admission.pdf",
      providerName: "Apollo Hospitals, Bengaluru",
      providerNpi: "ROHINI-BLR-0412",
      providerAddress:
        "154/11, Opp IIM-B, Bannerghatta Road, Bengaluru, Karnataka 560076",
      patientName: "Aarav Sharma",
      patientId: "PT-34901",
      accountNumber: "ACC-2026-1182",
      statementDate: "2026-10-04",
      serviceStartDate: "2026-10-02",
      serviceEndDate: "2026-10-03",
      billedTotal: claimedTotal,
      patientResponsibility: 8500.0,
      insurancePaid: 0.0,
    },
    lineItems,
    claimedTotal,
    calculatedTotal: reconciliation.calculatedTotal,
    variance: reconciliation.variance,
    discrepancies: reconciliation.discrepancies,
    status: "flagged",
    auditTrail: [
      {
        id: "audit-disc-1",
        timestamp: "2026-10-04T14:15:00Z",
        action: "DOCUMENT_UPLOADED",
        userRole: "hospital_staff",
        actorName: "Ramesh Kumar, Patient Access",
        details:
          "Emergency trauma intake invoice uploaded for automated OCR verification.",
      },
      {
        id: "audit-disc-2",
        timestamp: "2026-10-04T14:15:22Z",
        action: "DISCREPANCY_FLAGGED",
        userRole: "hospital_staff",
        actorName: "BillBridge AI Engine (Gemini)",
        details:
          "Flags triggered: (1) ₹1,500 variance between stated total and line items sum, (2) Duplicate ER code 99285.",
      },
    ],
    createdAt: "2026-10-04T14:15:00Z",
    updatedAt: "2026-10-04T14:15:22Z",
    reviewerNotes:
      "Requires review by hospital billing desk before electronic transmission to insurance TPA.",
  };
})();

export const MOCK_CLAIM_MISSING_CODES: ClaimRecord = (() => {
  const lineItems = [
    {
      id: "li-rx-1",
      code: "J9355",
      codeType: "HCPCS" as const,
      description: "Trastuzumab injection, 10 mg (Herceptin targeted biologic)",
      serviceDate: "2026-10-08",
      quantity: 15,
      unitPrice: 1500.0,
      totalPrice: 22500.0,
      confidence: "high" as const,
      confidenceScore: 0.95,
    },
    {
      id: "li-rx-2",
      code: "", // Missing CPT/HCPCS code
      codeType: "UNKNOWN" as const,
      description:
        "Specialized compounding & laminar airflow hood preparation fee",
      serviceDate: "2026-10-08",
      quantity: 1,
      unitPrice: 4750.0,
      totalPrice: 4750.0,
      confidence: "low" as const,
      confidenceScore: 0.45,
      notes:
        "Code missing from invoice. Likely unmapped hospital pharmacy revenue code 0250.",
    },
    {
      id: "li-rx-3",
      code: "96413",
      codeType: "CPT" as const,
      description: "Chemotherapy administration, IV infusion; up to 1 hr",
      serviceDate: "2026-10-08",
      quantity: 1,
      unitPrice: 3500.0,
      totalPrice: 3500.0,
      confidence: "high" as const,
      confidenceScore: 0.94,
    },
    {
      id: "li-rx-4",
      code: "UNKNOWN",
      codeType: "UNKNOWN" as const,
      description:
        "Post-infusion clinical monitoring & sterile hydration flush kit",
      serviceDate: "2026-10-08",
      quantity: 1,
      unitPrice: 2000.0,
      totalPrice: 2000.0,
      confidence: "low" as const,
      confidenceScore: 0.52,
    },
  ];

  const claimedTotal = 32750.0;
  const reconciliation = reconcileBill(claimedTotal, lineItems);

  return {
    id: "claim-beacon-003",
    claimNumber: "BB-DEMO-1002",
    bill: {
      id: "doc-beacon-003",
      fileName: "max_oncology_specialty_rx.pdf",
      fileSize: 382900,
      mimeType: "application/pdf",
      uploadedAt: "2026-10-10T16:00:00Z",
      previewUrl: "/samples/max_oncology_rx.pdf",
      providerName: "Max Super Speciality Hospital, New Delhi",
      providerNpi: "ROHINI-DEL-1102",
      providerAddress:
        "1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi 110017",
      patientName: "Priya Patel",
      patientId: "PT-55102",
      accountNumber: "ACC-2026-4773",
      statementDate: "2026-10-09",
      serviceStartDate: "2026-10-08",
      serviceEndDate: "2026-10-08",
      billedTotal: claimedTotal,
      patientResponsibility: 4500.0,
      insurancePaid: 28250.0,
    },
    lineItems,
    claimedTotal,
    calculatedTotal: reconciliation.calculatedTotal,
    variance: reconciliation.variance,
    discrepancies: reconciliation.discrepancies,
    status: "under_review",
    auditTrail: [
      {
        id: "audit-rx-1",
        timestamp: "2026-10-10T16:00:00Z",
        action: "DOCUMENT_UPLOADED",
        userRole: "hospital_staff",
        actorName: "Dr. Meera Iyer, Oncology Coordinator",
        details:
          "Day-care infusion chemotherapy statement submitted for tariff audit.",
      },
      {
        id: "audit-rx-2",
        timestamp: "2026-10-10T16:00:18Z",
        action: "CODE_VALIDATION_ALERT",
        userRole: "hospital_staff",
        actorName: "BillBridge AI Engine (Gemini)",
        details:
          "Two items flagged for missing billing codes. Requires tariff code mapping.",
      },
    ],
    createdAt: "2026-10-10T16:00:00Z",
    updatedAt: "2026-10-10T16:00:18Z",
    assignedReviewer: "Kavita Nair (TPA Adjudication)",
  };
})();

export const MOCK_CLAIM_INFO_REQUESTED: ClaimRecord = (() => {
  const lineItems = [
    {
      id: "li-req-1",
      code: "27447",
      codeType: "CPT" as const,
      description: "Total Knee Arthroplasty (TKR) Implantation",
      serviceDate: "2026-10-11",
      quantity: 1,
      unitPrice: 52000.0,
      totalPrice: 52000.0,
      confidence: "high" as const,
      confidenceScore: 0.98,
    },
    {
      id: "li-req-2",
      code: "99232",
      codeType: "CPT" as const,
      description: "Subsequent Hospital Inpatient Day Care (2 Days)",
      serviceDate: "2026-10-12",
      quantity: 2,
      unitPrice: 5000.0,
      totalPrice: 10000.0,
      confidence: "high" as const,
      confidenceScore: 0.97,
    },
  ];
  const claimedTotal = 62000.0;
  const reconciliation = reconcileBill(claimedTotal, lineItems);

  return {
    id: "claim-demo-1004",
    claimRef: "BB-DEMO-1004",
    claimNumber: "BB-DEMO-1004",
    patientRef: "PT-88312",
    policyRef: "POL-STAR-449102",
    hospitalRef: "ROHINI-DEL-4412",
    hospitalId: "ROHINI-DEL-4412",
    admissionDate: "2026-11-01",
    dischargeDate: "2026-11-04",
    claimType: "Cashless",
    payerName: "Star Health & Allied Insurance",
    policyNumber: "POL-STAR-449102",
    idempotencyKey: "idem-synthetic-1004",
    isSyntheticDemo: true,
    bill: {
      id: "doc-req-1",
      fileName: "max_saket_tkr_query.pdf",
      fileSize: 490200,
      mimeType: "application/pdf",
      uploadedAt: "2026-11-05T11:00:00Z",
      previewUrl: "/samples/max_saket_query.pdf",
      providerName: "Max Super Speciality Hospital, Saket",
      providerNpi: "ROHINI-DEL-4412",
      providerAddress: "1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi 110017",
      patientName: "Suresh Menon",
      patientId: "PT-88312",
      accountNumber: "ACC-2026-9932",
      statementDate: "2026-11-05",
      serviceStartDate: "2026-11-01",
      serviceEndDate: "2026-11-04",
      billedTotal: claimedTotal,
      patientResponsibility: 12000.0,
      insurancePaid: 50000.0,
    },
    lineItems,
    claimedTotal,
    calculatedTotal: reconciliation.calculatedTotal,
    variance: reconciliation.variance,
    discrepancies: reconciliation.discrepancies,
    status: "requires_information",
    reviewerNotes:
      "TPA Medical Officer Query: Please provide operative surgical notes and implant batch barcode stickers.",
    auditTrail: [
      {
        id: "audit-req-1",
        timestamp: "2026-10-11T11:00:00Z",
        action: "CLAIM_SUBMITTED",
        userRole: "hospital_staff",
        actorName: "Apollo TPA Desk",
        details: "Cashless pre-authorization submitted for ₹62,000.00",
      },
      {
        id: "audit-req-2",
        timestamp: "2026-10-11T14:30:00Z",
        action: "INFORMATION_REQUESTED",
        userRole: "insurer_reviewer",
        actorName: "Kavita Nair (Star Health TPA)",
        details:
          "Official query raised: Operative surgical notes and implant invoice required before approval.",
      },
    ],
    createdAt: "2026-10-11T11:00:00Z",
    updatedAt: "2026-10-11T14:30:00Z",
    assignedReviewer: "Kavita Nair (Star Health TPA)",
  };
})();

export const MOCK_CLAIM_SETTLED: ClaimRecord = (() => {
  const lineItems = [
    {
      id: "li-set-1",
      code: "99215",
      codeType: "CPT" as const,
      description: "Complex Inpatient Pulmonary Medicine Care",
      serviceDate: "2026-09-28",
      quantity: 1,
      unitPrice: 28000.0,
      totalPrice: 28000.0,
      confidence: "high" as const,
      confidenceScore: 0.99,
    },
    {
      id: "li-set-2",
      code: "94010",
      codeType: "CPT" as const,
      description: "Spirometry and Bronchodilator Responsiveness",
      serviceDate: "2026-09-28",
      quantity: 1,
      unitPrice: 14000.0,
      totalPrice: 14000.0,
      confidence: "high" as const,
      confidenceScore: 0.98,
    },
  ];
  const claimedTotal = 42000.0;
  const reconciliation = reconcileBill(claimedTotal, lineItems);

  return {
    id: "claim-demo-1005",
    claimRef: "BB-DEMO-1005",
    claimNumber: "BB-DEMO-1005",
    patientRef: "PT-77219",
    policyRef: "POL-STAR-110294",
    hospitalRef: "ROHINI-MED-9912",
    hospitalId: "ROHINI-MED-9912",
    admissionDate: "2026-08-15",
    dischargeDate: "2026-08-18",
    claimType: "Reimbursement",
    payerName: "Star Health & Allied Insurance",
    policyNumber: "POL-STAR-110294",
    idempotencyKey: "idem-synthetic-1005",
    isSyntheticDemo: true,
    bill: {
      id: "doc-set-1",
      fileName: "medanta_pulmonary_settled.pdf",
      fileSize: 412500,
      mimeType: "application/pdf",
      uploadedAt: "2026-08-20T09:00:00Z",
      previewUrl: "/samples/medanta_pulmonary.pdf",
      providerName: "Medanta - The Medicity, Gurugram",
      providerNpi: "ROHINI-MED-9912",
      providerAddress: "CH Bakhtawar Singh Rd, Sector 38, Gurugram, Haryana 122001",
      patientName: "Vandana Rao",
      patientId: "PT-77219",
      accountNumber: "ACC-2026-8812",
      statementDate: "2026-08-20",
      serviceStartDate: "2026-08-15",
      serviceEndDate: "2026-08-18",
      billedTotal: claimedTotal,
      patientResponsibility: 2000.0,
      insurancePaid: 40000.0,
    },
    lineItems,
    claimedTotal,
    calculatedTotal: reconciliation.calculatedTotal,
    variance: reconciliation.variance,
    discrepancies: reconciliation.discrepancies,
    status: "settled",
    reviewerNotes:
      "Claim approved for ₹40,000.00 and settled via NEFT Banking. Transaction Ref: UTR-SBI-20261014-99120.",
    auditTrail: [
      {
        id: "audit-set-1",
        timestamp: "2026-09-28T09:00:00Z",
        action: "CLAIM_SUBMITTED",
        userRole: "patient",
        actorName: "Vandana Rao (Patient)",
        details: "Reimbursement claim submitted for post-op respiratory care.",
      },
      {
        id: "audit-set-2",
        timestamp: "2026-10-02T15:00:00Z",
        action: "CLAIM_APPROVED",
        userRole: "insurer_reviewer",
        actorName: "Kavita Nair (Senior Adjudicator)",
        details: "Full medical approval granted for ₹40,000.00 after co-pay deduction.",
      },
      {
        id: "audit-set-3",
        timestamp: "2026-10-14T11:45:00Z",
        action: "CLAIM_SETTLED",
        userRole: "insurer_admin",
        actorName: "Star Health Finance Desk",
        details: "Banking disbursement complete. NEFT UTR-SBI-20261014-99120.",
      },
    ],
    createdAt: "2026-09-28T09:00:00Z",
    updatedAt: "2026-10-14T11:45:00Z",
    assignedReviewer: "Kavita Nair (Senior Adjudicator)",
  };
})();

export const INITIAL_MOCK_CLAIMS: ClaimRecord[] = [
  MOCK_CLAIM_DISCREPANCY,
  MOCK_CLAIM_CLEAN,
  MOCK_CLAIM_MISSING_CODES,
  MOCK_CLAIM_INFO_REQUESTED,
  MOCK_CLAIM_SETTLED,
];

