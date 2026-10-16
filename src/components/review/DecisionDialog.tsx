import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Claim, DecisionOutcome } from "@/types/contracts";

interface DecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim;
  outcome: DecisionOutcome;
  onConfirm: (rationale: string) => Promise<void>;
  isLoading?: boolean;
}

export function DecisionDialog({
  open,
  onOpenChange,
  claim,
  outcome,
  onConfirm,
  isLoading = false,
}: DecisionDialogProps) {
  const isApprove = outcome === "approved";
  const isQuery = outcome === "query" || outcome === "requires_information";
  const isReject = outcome === "rejected";

  const getDefaultRationale = () => {
    if (isApprove) {
      return "Line item calculations verified against provider statement. Approved under policy guidelines.";
    }
    return "";
  };

  const [rationale, setRationale] = useState(getDefaultRationale());
  const [errorText, setErrorText] = useState<string | null>(null);

  // Update rationale when outcome changes or modal opens
  useEffect(() => {
    if (open) {
      setRationale(getDefaultRationale());
      setErrorText(null);
    }
  }, [open, outcome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((isQuery || isReject) && rationale.trim() === "") {
      setErrorText(
        "A detailed rationale note is mandatory when issuing a Query or Rejection.",
      );
      return;
    }
    setErrorText(null);
    await onConfirm(rationale);
    onOpenChange(false);
  };

  const getBadgeVariant = () => {
    if (isApprove) return "success";
    if (isQuery) return "warning";
    return "destructive";
  };

  const getTitle = () => {
    if (isApprove) return "Confirm Claim Approval";
    if (isQuery) return "Query Healthcare Provider";
    return "Confirm Claim Rejection";
  };

  const getDescription = () => {
    if (isApprove) {
      return `Authorizing payment for ${claim.hospital.providerName.value} in the amount of ${formatCurrency(
        claim.totals.itemizedSumTotal,
      )}. A formal electronic Explanation of Benefits will be generated.`;
    }
    if (isQuery) {
      return `Flagging encounter for provider clarification. An inquiry request will be routed to ${claim.hospital.providerName.value} billing staff.`;
    }
    return `Denying claim submission for ${claim.hospital.providerName.value}. A formal adverse benefit determination will be dispatched.`;
  };

  const getConfirmButtonLabel = () => {
    if (isLoading) return "Recording Decision...";
    if (isApprove) return "Confirm Approval";
    if (isQuery) return "Send Query to Provider";
    return "Confirm Rejection";
  };

  const isNoteRequired = isQuery || isReject;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={getBadgeVariant()}>
                {isApprove
                  ? "Approval Action"
                  : isQuery
                    ? "Provider Query Action"
                    : "Rejection Action"}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-primary/40 text-primary"
              >
                SIMULATED ADJUDICATION
              </Badge>
              <span className="text-xs font-mono text-muted-foreground ml-auto">
                {claim.claimNumber}
              </span>
            </div>

            <DialogTitle className="text-base font-bold text-foreground">
              {getTitle()}
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>

          {/* Policy & Audit Enforcement Notice */}
          <div className="my-3 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-[11px] text-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Adjudication Audit &amp; Policy Enforcement</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              This adjudication decision will be recorded in the audit trail with your reviewer ID and timestamp.
              Ensure that all itemized charges and clinical justifications have been verified prior to confirmation.
            </p>
          </div>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="decision-rationale"
                  className="text-xs font-semibold text-foreground"
                >
                  Adjudication Rationale & Audit Note{" "}
                  {isNoteRequired ? "(Mandatory)" : "(Optional)"}
                </Label>
                {isNoteRequired && (
                  <span className="text-[10px] font-medium text-destructive">
                    Required for {isQuery ? "query" : "rejection"}
                  </span>
                )}
              </div>

              <textarea
                id="decision-rationale"
                required={isNoteRequired}
                rows={4}
                value={rationale}
                onChange={(e) => {
                  setRationale(e.target.value);
                  if (errorText && e.target.value.trim().length > 0) {
                    setErrorText(null);
                  }
                }}
                className={`w-full rounded-md border p-2.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  errorText
                    ? "border-destructive bg-destructive/5"
                    : "border-input bg-background"
                }`}
                placeholder={
                  isQuery
                    ? "Specify the clarification requested from provider (e.g., provide unitemized charges breakdown)..."
                    : isReject
                      ? "Specify the denial rationale (e.g., non-covered elective service without prior auth)..."
                      : "Specify review notes for the audit trail..."
                }
                aria-describedby={errorText ? "rationale-error" : undefined}
                aria-invalid={!!errorText}
              />

              {errorText && (
                <p
                  id="rationale-error"
                  className="text-[11px] text-destructive font-medium flex items-center gap-1"
                >
                  <ShieldAlert className="h-3 w-3 shrink-0" /> {errorText}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={
                isApprove ? "default" : isQuery ? "secondary" : "destructive"
              }
              size="sm"
              disabled={
                isLoading || (isNoteRequired && rationale.trim() === "")
              }
              className={`text-xs font-medium cursor-pointer ${
                isQuery ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
              }`}
            >
              {getConfirmButtonLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
