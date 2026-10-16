/**
 * BillBridge n8n Webhook Integration Boundary
 * Typed stub for workflow orchestration triggers (review notifications, insurer dispatch).
 *
 * SAFETY CONSTRAINT:
 * Automation remains deactivated and runs in "simulated" mode until official
 * n8n workflow templates are provided and approved by the user.
 */

import type { ClaimRecord, UserRole } from "@/types/claim";

export type WebhookEventType =
  | "claim.created"
  | "claim.flagged_for_review"
  | "claim.correction_applied"
  | "claim.approved"
  | "claim.rejected"
  | "notification.patient_alert";

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  claimId: string;
  claimNumber: string;
  status: string;
  actorRole: UserRole;
  discrepancyCount: number;
  variance: number;
  providerName: string;
  patientId: string;
}

export interface WebhookDispatchResult {
  dispatched: boolean;
  mode: "simulated" | "live";
  receiptId: string;
  message: string;
}

export interface IN8nWebhookService {
  dispatch(
    eventType: WebhookEventType,
    claim: ClaimRecord,
    actorRole: UserRole,
  ): Promise<WebhookDispatchResult>;
}

export class N8nWebhookStubService implements IN8nWebhookService {
  async dispatch(
    eventType: WebhookEventType,
    claim: ClaimRecord,
    actorRole: UserRole,
  ): Promise<WebhookDispatchResult> {
    const payload: WebhookPayload = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      timestamp: new Date().toISOString(),
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      status: claim.status,
      actorRole,
      discrepancyCount: claim.discrepancies.length,
      variance: claim.variance,
      providerName: claim.bill.providerName,
      patientId: claim.bill.patientId,
    };

    // Safe simulated execution — zero network calls until template approval
    console.info(
      `[BillBridge n8n Boundary] (Simulated Webhook Trigger): Event "${eventType}" recorded for claim ${claim.claimNumber}. Live dispatch dormant until templates approved.`,
    );

    return {
      dispatched: true,
      mode: "simulated",
      receiptId: payload.eventId,
      message:
        "Webhook event simulated in dev environment. Live transmission is held pending workflow template approval.",
    };
  }
}

let activeN8nService: IN8nWebhookService | null = null;

export function getN8nWebhookService(): IN8nWebhookService {
  if (!activeN8nService) {
    activeN8nService = new N8nWebhookStubService();
  }
  return activeN8nService;
}
