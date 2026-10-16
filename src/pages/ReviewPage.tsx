import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  XCircle,
  FileSpreadsheet,
  Building2,
  User,
  Calendar,
  Layers,
  ShieldCheck,
  FileText,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Save,
  Send,
  Eye,
  Clock,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import type { Claim, LineItem, AuditIssue } from "@/types/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import {
  runDeterministicAudit,
  diffAuditIssues,
  calculateCompletenessIndicator,
  roundToCents,
  type AuditDiff,
} from "@/services/audit-engine";

import { DocumentViewer } from "@/components/review/DocumentViewer";
import { ReviewFieldInput } from "@/components/review/ReviewFieldInput";
import { LineItemsEditor } from "@/components/review/LineItemsEditor";
import { DecisionDialog } from "@/components/review/DecisionDialog";

type ReviewSection =
  | "document"
  | "hospital"
  | "patient"
  | "admission_discharge"
  | "line_items"
  | "totals"
  | "insurance"
  | "notes";

const SECTIONS: {
  id: ReviewSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "document", label: "Document", icon: FileText },
  { id: "hospital", label: "Hospital", icon: Building2 },
  { id: "patient", label: "Patient", icon: User },
  { id: "admission_discharge", label: "Admission / Discharge", icon: Calendar },
  { id: "line_items", label: "Line Items", icon: FileSpreadsheet },
  { id: "totals", label: "Totals", icon: Layers },
  { id: "insurance", label: "Insurance / Claim", icon: ShieldCheck },
  { id: "notes", label: "Extraction Notes", icon: Clock },
];

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, roleConfig } = useRole();
  const { toast } = useToast();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [originalClaim, setOriginalClaim] = useState<Claim | null>(null);
  const [initialIssues, setInitialIssues] = useState<AuditIssue[]>([]);
  const [auditDiff, setAuditDiff] = useState<AuditDiff | null>(null);
  const [activeIssueFilter, setActiveIssueFilter] = useState<
    "all" | "critical" | "warning" | "info"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active section for mobile view and quick jump navigation
  const [activeSection, setActiveSection] =
    useState<ReviewSection>("line_items");
  const [mobileTab, setMobileTab] = useState<"document" | "fields">("fields");

  // Dirty state tracking for unsaved change protection
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Decision & Action Dialogs
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<
    "approved" | "rejected"
  >("approved");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Highlighted line item sync between document preview and table
  const [highlightedLineItemId, setHighlightedLineItemId] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function loadClaim() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const dataAccess = getDataAccess();
        const found = await dataAccess.getClaimById(id || "claim-memorial-002");
        if (found) {
          // Run initial deterministic audit
          const initialAudit = runDeterministicAudit(found);
          const claimWithAudit: Claim = {
            ...found,
            issues: initialAudit.issues,
            totals: {
              ...found.totals,
              itemizedSumTotal: initialAudit.reconciledTotals.itemizedSum,
              variance: initialAudit.reconciledTotals.variance,
              hasVariance: initialAudit.reconciledTotals.hasVariance,
            },
          };
          setClaim(claimWithAudit);
          setOriginalClaim(JSON.parse(JSON.stringify(claimWithAudit)));
          setInitialIssues(initialAudit.issues);
          setAuditDiff(null);
          setIsDirty(false);
        } else {
          setLoadError(`Claim record with ID "${id}" was not found.`);
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load claim record.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadClaim();
  }, [id]);

  // Recalculate deterministic audit rules and totals when line items are updated
  const handleLineItemsChange = (updatedItems: LineItem[]) => {
    if (!claim) return;

    const baseClaim: Claim = {
      ...claim,
      lineItems: updatedItems,
    };

    // Re-run deterministic audit rules on modified state
    const auditResult = runDeterministicAudit(baseClaim);
    const diff = diffAuditIssues(
      originalClaim?.issues || initialIssues,
      auditResult.issues,
    );
    setAuditDiff(diff);

    setClaim({
      ...baseClaim,
      issues: auditResult.issues,
      totals: {
        ...claim.totals,
        itemizedSumTotal: auditResult.reconciledTotals.itemizedSum,
        variance: auditResult.reconciledTotals.variance,
        hasVariance: auditResult.reconciledTotals.hasVariance,
      },
    });
    setIsDirty(true);
  };

  const handleFieldChange = (path: string, val: any) => {
    if (!claim) return;

    const next = JSON.parse(JSON.stringify(claim)) as Claim;
    const parts = path.split(".");
    let current: any = next;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1]!;
    if (
      current[lastPart] &&
      typeof current[lastPart] === "object" &&
      "value" in current[lastPart]
    ) {
      current[lastPart].value = val;
      current[lastPart].status = "corrected";
    } else {
      current[lastPart] = val;
    }

    // Re-run deterministic audit rules
    const auditResult = runDeterministicAudit(next);
    const diff = diffAuditIssues(
      originalClaim?.issues || initialIssues,
      auditResult.issues,
    );
    setAuditDiff(diff);

    next.issues = auditResult.issues;
    next.totals.itemizedSumTotal = auditResult.reconciledTotals.itemizedSum;
    next.totals.variance = auditResult.reconciledTotals.variance;
    next.totals.hasVariance = auditResult.reconciledTotals.hasVariance;

    setClaim(next);
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    if (!claim) return;
    setIsSaving(true);
    try {
      const dataAccess = getDataAccess();
      await dataAccess.saveClaim(claim);
      setOriginalClaim(JSON.parse(JSON.stringify(claim)));
      setAuditDiff(null);
      setIsDirty(false);
      toast({
        title: "Changes Saved",
        description: `Encounter ${claim.claimNumber} has been updated in local storage.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Save Failed",
        description: "Could not persist claim modifications. Please retry.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (originalClaim) {
      setClaim(JSON.parse(JSON.stringify(originalClaim)));
      setAuditDiff(null);
      setIsDirty(false);
      toast({
        title: "Edits Discarded",
        description: "Reverted fields to original saved extraction.",
        variant: "default",
      });
    }
  };

  const handleNavigateWithCheck = (targetPath: string) => {
    if (isDirty) {
      setPendingNavigation(targetPath);
      setConfirmDiscardOpen(true);
    } else {
      navigate(targetPath);
    }
  };

  const handleConfirmDiscard = () => {
    setIsDirty(false);
    setConfirmDiscardOpen(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    } else {
      handleDiscardChanges();
    }
  };

  // Submit to Payer (Hospital Staff Next Action)
  const handleSubmitToPayer = async () => {
    if (!claim) return;
    try {
      const dataAccess = getDataAccess();
      const updated = await dataAccess.updateClaimStatus(
        claim.id,
        "under_review",
        role,
        "Hospital billing specialist verified arithmetic and submitted to insurer adjudication.",
      );
      setClaim(updated);
      setOriginalClaim(JSON.parse(JSON.stringify(updated)));
      setIsDirty(false);
      toast({
        title: "Claim Submitted to Insurer",
        description: `${claim.claimNumber} is now in the insurer adjudication review queue.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Submission Error",
        description: "Failed to submit claim to insurer.",
        variant: "error",
      });
    }
  };

  // Record Adjudicator Decision (Insurer Reviewer Next Action)
  const handleRecordDecision = async (rationale: string) => {
    if (!claim) return;
    setIsSubmittingDecision(true);
    try {
      const dataAccess = getDataAccess();
      const updated = await dataAccess.recordDecision({
        claimId: claim.id,
        outcome: decisionOutcome,
        rationale,
        adjudicatorRole: role,
        adjudicatorName:
          role === "insurer_reviewer" ? "Senior Adjudicator" : "Staff Reviewer",
      });
      setClaim(updated);
      setOriginalClaim(JSON.parse(JSON.stringify(updated)));
      setIsDirty(false);
      toast({
        title:
          decisionOutcome === "approved" ? "Claim Approved" : "Claim Rejected",
        description: `Adjudication decision recorded for ${claim.claimNumber}.`,
        variant: decisionOutcome === "approved" ? "success" : "error",
      });
    } catch {
      toast({
        title: "Decision Error",
        description: "Failed to record adjudicator decision.",
        variant: "error",
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE (RECOVERABLE) ──
  if (loadError || !claim) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Claim Record Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {loadError ||
            `Encounter "${id}" does not exist in local-first storage.`}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/claims">Return to Claims Registry</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/upload">Upload New Document</Link>
          </Button>
        </div>
      </div>
    );
  }

  const completeness = claim
    ? calculateCompletenessIndicator(claim.issues)
    : null;
  const criticalCount = claim
    ? claim.issues.filter(
        (i) => i.severity === "critical" || i.severity === "error",
      ).length
    : 0;
  const warningCount = claim
    ? claim.issues.filter((i) => i.severity === "warning").length
    : 0;
  const infoCount = claim
    ? claim.issues.filter((i) => i.severity === "info").length
    : 0;

  const filteredIssues = claim
    ? claim.issues.filter((iss) => {
        if (activeIssueFilter === "critical")
          return iss.severity === "critical" || iss.severity === "error";
        if (activeIssueFilter === "warning") return iss.severity === "warning";
        if (activeIssueFilter === "info") return iss.severity === "info";
        return true;
      })
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* Top Bar with Navigation and Next Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleNavigateWithCheck("/claims")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All Claims
            </Button>
            <span className="text-muted-foreground/60">•</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {claim.claimNumber}
            </span>
            <Badge
              variant={
                claim.status === "approved"
                  ? "success"
                  : claim.status === "flagged"
                    ? "warning"
                    : claim.status === "rejected"
                      ? "destructive"
                      : "info"
              }
              className="text-[10px] capitalize"
            >
              {claim.status.replace("_", " ")}
            </Badge>
            {isDirty && (
              <Badge
                variant="warning"
                className="text-[10px] py-0 px-1.5 animate-pulse"
              >
                Unsaved Edits
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
            {claim.hospital.providerName.value || "Hospital Provider"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Patient: {claim.patient.fullName.value || "—"} ({claim.patient.id})
            • Statement Date:{" "}
            {formatDate(claim.hospital.statementDate.value || "")}
          </p>
        </div>

        {/* Action Header Controls & Role-Specific Clear Next Action */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Save & Discard buttons when isDirty */}
          {isDirty && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="h-8 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="h-8 text-xs font-medium shadow-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}

          {/* Insurer Adjudicator Next Action */}
          {roleConfig.permissions.canApproveOrReject &&
            claim.status !== "approved" && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                  onClick={() => {
                    setDecisionOutcome("rejected");
                    setDecisionModalOpen(true);
                  }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setDecisionOutcome("approved");
                    setDecisionModalOpen(true);
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Approve Claim
                </Button>
              </>
            )}

          {/* Hospital Staff Next Action: Submit to Payer if clean/reconciled */}
          {role === "hospital_staff" &&
            claim.status !== "approved" &&
            claim.status !== "under_review" && (
              <Button
                size="sm"
                variant={claim.totals.hasVariance ? "outline" : "default"}
                className="h-8 text-xs font-medium"
                onClick={handleSubmitToPayer}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Submit to Payer
              </Button>
            )}

          {/* Export Reviewed Claim Dropdown (CSV & JSON) */}
          <ExportDropdown
            mode="single"
            singleClaim={claim}
            size="sm"
            variant="outline"
            buttonText={
              role === "patient" ? "Export EOB / Claim" : "Export Claim"
            }
            className="h-8 text-xs font-medium"
          />
        </div>
      </div>

      {/* Arithmetic Reconciliation Banner */}
      <Card variant="glass" className="border-border/80">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Stated Bill Header Total
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {claim.totals.statedBilledTotal.value !== null
                  ? formatCurrency(claim.totals.statedBilledTotal.value)
                  : "— Not detected (null)"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Printed amount on provider statement
              </p>
            </div>

            <div className="pt-3 sm:pt-0 sm:pl-6">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Sum of Itemized Lines
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {formatCurrency(claim.totals.itemizedSumTotal)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Calculated from {claim.lineItems.length} charges
              </p>
            </div>

            <div className="pt-3 sm:pt-0 sm:pl-6">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Reconciliation Variance
              </p>
              <p
                className={`text-2xl font-bold tracking-tight mt-1 font-mono ${
                  !claim.totals.hasVariance
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {!claim.totals.hasVariance
                  ? "₹0.00 Exact Match"
                  : `${claim.totals.variance > 0 ? "+" : ""}${formatCurrency(claim.totals.variance)}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {!claim.totals.hasVariance
                  ? "100% mathematical parity"
                  : "Discrepancy identified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transparent Completeness Indicator (Readiness Score) */}
      {completeness && (
        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Data Completeness & Validation Indicator
                  </h3>
                  <Badge
                    variant={completeness.badgeVariant}
                    className="text-xs"
                  >
                    {completeness.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {completeness.weightedRuleDocumentation}
                </p>
                <p className="text-[11px] text-muted-foreground/80 italic">
                  {completeness.disclaimer}
                </p>
              </div>

              <div className="flex items-center gap-5 shrink-0 self-start md:self-center">
                <div className="text-right">
                  <div className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                    {completeness.score}
                    <span className="text-xs font-normal text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">
                    Completeness Score
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs border-l pl-4 border-border/60">
                  <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {criticalCount} Critical Blocker
                    {criticalCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {warningCount} Warning{warningCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    {infoCount} Info / Review
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Audit Re-Run & What Changed Banner */}
      {auditDiff && auditDiff.hasChanges && (
        <Alert
          variant={auditDiff.newIssues.length > 0 ? "warning" : "default"}
          className="border-primary/30 bg-primary/5 py-3"
        >
          <div className="flex items-start gap-2.5">
            {auditDiff.resolvedIssues.length > 0 &&
            auditDiff.newIssues.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <RefreshCw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <AlertTitle className="text-xs font-semibold">
                {auditDiff.summary}
              </AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                {auditDiff.resolvedIssues.length > 0 && (
                  <div className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1 flex-wrap">
                    <span>✓ Resolved:</span>
                    {auditDiff.resolvedIssues.map((iss) => (
                      <Badge
                        key={iss.id}
                        variant="secondary"
                        className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-mono"
                      >
                        {iss.code}
                      </Badge>
                    ))}
                  </div>
                )}
                {auditDiff.newIssues.length > 0 && (
                  <div className="text-destructive font-medium flex items-center gap-1 flex-wrap">
                    <span>⚠ Flagged:</span>
                    {auditDiff.newIssues.map((iss) => (
                      <Badge
                        key={iss.id}
                        variant="destructive"
                        className="text-[10px] font-mono"
                      >
                        {iss.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Filterable Deterministic Audit Issues List */}
      {claim.issues.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Deterministic Audit Findings ({claim.issues.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated checks for line math, total parity, dates, codes,
                  and OCR confidence.
                </CardDescription>
              </div>

              {/* Severity filter tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveIssueFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeIssueFilter === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({claim.issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIssueFilter("critical")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeIssueFilter === "critical"
                      ? "bg-background text-destructive shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIssueFilter("warning")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeIssueFilter === "warning"
                      ? "bg-background text-amber-600 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Warnings ({warningCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIssueFilter("info")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeIssueFilter === "info"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Info ({infoCount})
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {filteredIssues.map((iss) => (
              <div
                key={iss.id}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  iss.severity === "critical" || iss.severity === "error"
                    ? "border-destructive/30 bg-destructive/5"
                    : iss.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border bg-muted/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        iss.severity === "critical" || iss.severity === "error"
                          ? "destructive"
                          : iss.severity === "warning"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-[10px] uppercase font-mono font-bold"
                    >
                      {iss.code || iss.category}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {iss.severity === "critical" || iss.severity === "error"
                        ? "Critical Blocker"
                        : iss.severity === "warning"
                          ? "Warning"
                          : "Informational Check"}
                    </span>
                    {iss.fieldKey && (
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Field: {iss.fieldKey}
                      </span>
                    )}
                  </div>

                  {iss.lineItemId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setHighlightedLineItemId(iss.lineItemId || null);
                        setActiveSection("line_items");
                      }}
                    >
                      Jump to Line Item →
                    </Button>
                  )}
                </div>

                <p className="text-foreground text-xs leading-relaxed">
                  {iss.message}
                </p>

                {(iss.expectedValue !== undefined ||
                  iss.actualValue !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-sans">
                        Expected Value
                      </span>
                      <span className="font-medium text-foreground">
                        {typeof iss.expectedValue === "number"
                          ? formatCurrency(iss.expectedValue)
                          : iss.expectedValue !== null &&
                              iss.expectedValue !== undefined
                            ? String(iss.expectedValue)
                            : "— Not detected (null)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-sans">
                        Observed Value
                      </span>
                      <span className="font-medium text-foreground">
                        {typeof iss.actualValue === "number"
                          ? formatCurrency(iss.actualValue)
                          : iss.actualValue !== null &&
                              iss.actualValue !== undefined
                            ? String(iss.actualValue)
                            : "— Not detected (null)"}
                      </span>
                    </div>
                  </div>
                )}

                {iss.suggestedAction && (
                  <div className="mt-2 text-[11px] bg-background/80 p-2 rounded border border-border/40 text-foreground">
                    <span className="text-primary font-semibold">
                      Suggested Human Fix:{" "}
                    </span>
                    {iss.suggestedAction}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mobile Stack Switcher (Toggle between Document View & Structured Sections) */}
      <div className="flex lg:hidden items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mobileTab === "fields" ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setMobileTab("fields")}
          >
            Structured Fields ({SECTIONS.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mobileTab === "document" ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setMobileTab("document")}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Source Document
          </Button>
        </div>
      </div>

      {/* Main Grid: On wide screens, 5 cols Document beside 7 cols Structured Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Source Document Preview */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-20 ${
            mobileTab === "document" ? "block" : "hidden lg:block"
          }`}
        >
          <DocumentViewer
            claim={claim}
            highlightedLineItemId={highlightedLineItemId}
            onSelectLineItem={(lineId) => {
              setHighlightedLineItemId(lineId);
              setActiveSection("line_items");
            }}
          />
        </div>

        {/* Right Column: Structured Review Workspace with Section Navigation */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            mobileTab === "fields" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Section Navigation Tabs / Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* 1. DOCUMENT SECTION */}
          {activeSection === "document" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Document Metadata
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical and digital attributes of the scanned bill document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="doc-filename"
                    label="File Name"
                    value={claim.document.fileName}
                    onChange={(val) =>
                      handleFieldChange(
                        "document.fileName",
                        val || "document.pdf",
                      )
                    }
                  />
                  <ReviewFieldInput
                    id="doc-type"
                    label="Document Format Hint"
                    value={claim.document.documentType}
                    onChange={(val) =>
                      handleFieldChange(
                        "document.documentType",
                        val || "ITEMIZED_STATEMENT",
                      )
                    }
                  />
                  <ReviewFieldInput
                    id="doc-pages"
                    label="Page Count"
                    type="number"
                    value={claim.document.pageCount}
                    onChange={(val) =>
                      handleFieldChange("document.pageCount", val || 1)
                    }
                  />
                  <ReviewFieldInput
                    id="doc-size"
                    label="File Size (Bytes)"
                    type="number"
                    value={claim.document.fileSizeBytes}
                    onChange={(val) =>
                      handleFieldChange("document.fileSizeBytes", val || 0)
                    }
                  />
                </div>
                <div className="pt-2 border-t">
                  <span className="text-[11px] text-muted-foreground block font-mono">
                    SHA-256 Checksum: {claim.document.checksumSha256}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Uploaded: {formatDate(claim.document.uploadedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. HOSPITAL SECTION */}
          {activeSection === "hospital" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Hospital & Facility Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Healthcare billing entity and facility identifiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="hosp-name"
                    label="Provider Name"
                    field={claim.hospital.providerName}
                    value={claim.hospital.providerName.value}
                    onChange={(val) =>
                      handleFieldChange("hospital.providerName.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="hosp-npi"
                    label="National Provider Identifier (NPI)"
                    field={claim.hospital.npi}
                    value={claim.hospital.npi.value}
                    onChange={(val) =>
                      handleFieldChange("hospital.npi.value", val)
                    }
                    placeholder="10-digit NPI"
                  />
                  <div className="sm:col-span-2">
                    <ReviewFieldInput
                      id="hosp-address"
                      label="Billing Address"
                      field={claim.hospital.billingAddress}
                      value={claim.hospital.billingAddress.value}
                      onChange={(val) =>
                        handleFieldChange("hospital.billingAddress.value", val)
                      }
                    />
                  </div>
                  <ReviewFieldInput
                    id="hosp-facility-type"
                    label="Facility Classification"
                    value={claim.hospital.facilityType}
                    onChange={(val) =>
                      handleFieldChange(
                        "hospital.facilityType",
                        val || "outpatient",
                      )
                    }
                  />
                  <ReviewFieldInput
                    id="hosp-statement-date"
                    label="Statement Billing Date"
                    type="date"
                    field={claim.hospital.statementDate}
                    value={claim.hospital.statementDate.value}
                    onChange={(val) =>
                      handleFieldChange("hospital.statementDate.value", val)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. PATIENT SECTION */}
          {activeSection === "patient" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Patient Demographics & Identifiers
                </CardTitle>
                <CardDescription className="text-xs">
                  Encounter patient identity and account identifiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="patient-name"
                    label="Patient Full Name"
                    field={claim.patient.fullName}
                    value={claim.patient.fullName.value}
                    onChange={(val) =>
                      handleFieldChange("patient.fullName.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="patient-dob"
                    label="Date of Birth"
                    field={claim.patient.dateOfBirth}
                    value={claim.patient.dateOfBirth.value}
                    onChange={(val) =>
                      handleFieldChange("patient.dateOfBirth.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="patient-member-id"
                    label="Insurance Member ID"
                    field={claim.patient.memberId}
                    value={claim.patient.memberId.value}
                    onChange={(val) =>
                      handleFieldChange("patient.memberId.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="patient-account"
                    label="Hospital Patient Account #"
                    field={claim.patient.accountNumber}
                    value={claim.patient.accountNumber.value}
                    onChange={(val) =>
                      handleFieldChange("patient.accountNumber.value", val)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. ADMISSION / DISCHARGE SECTION */}
          {activeSection === "admission_discharge" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Admission & Discharge Dates
                </CardTitle>
                <CardDescription className="text-xs">
                  Encounter clinical timeline and stay boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="enc-admission"
                    label="Admission / Service Start Date"
                    type="date"
                    field={claim.hospital.admissionDate}
                    value={claim.hospital.admissionDate?.value || null}
                    onChange={(val) =>
                      handleFieldChange("hospital.admissionDate.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="enc-discharge"
                    label="Discharge / Service End Date"
                    type="date"
                    field={claim.hospital.dischargeDate}
                    value={claim.hospital.dischargeDate?.value || null}
                    onChange={(val) =>
                      handleFieldChange("hospital.dischargeDate.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="enc-statement"
                    label="Invoice Statement Date"
                    type="date"
                    field={claim.hospital.statementDate}
                    value={claim.hospital.statementDate.value}
                    onChange={(val) =>
                      handleFieldChange("hospital.statementDate.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="enc-facility"
                    label="Encounter Type"
                    value={claim.hospital.facilityType}
                    onChange={(val) =>
                      handleFieldChange(
                        "hospital.facilityType",
                        val || "outpatient",
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. LINE ITEMS SECTION */}
          {activeSection === "line_items" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Itemized Line Items
                </CardTitle>
                <CardDescription className="text-xs">
                  Medical codes, descriptions, quantities, and line totals with
                  arithmetic validation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineItemsEditor
                  lineItems={claim.lineItems}
                  onChange={handleLineItemsChange}
                  selectedLineItemId={highlightedLineItemId}
                  onSelectItem={(lineId) => setHighlightedLineItemId(lineId)}
                  readOnly={!roleConfig.permissions.canEditLineItems}
                />
              </CardContent>
            </Card>
          )}

          {/* 6. TOTALS SECTION */}
          {activeSection === "totals" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Financial Totals & Arithmetic Reconciliation
                </CardTitle>
                <CardDescription className="text-xs">
                  Itemized summation, invoice stated amount, and variance audit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="totals-stated"
                    label="Printed Stated Billed Total (₹)"
                    type="number"
                    field={claim.totals.statedBilledTotal}
                    value={claim.totals.statedBilledTotal.value}
                    onChange={(val) =>
                      handleFieldChange("totals.statedBilledTotal.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="totals-calculated"
                    label="Sum of Itemized Lines (₹)"
                    type="number"
                    value={claim.totals.itemizedSumTotal}
                    onChange={() => {}}
                    disabled
                    helpText="Computed dynamically from all individual line items."
                  />
                  <ReviewFieldInput
                    id="totals-subtotal"
                    label="Printed Subtotal (₹)"
                    type="number"
                    field={claim.totals.subtotal}
                    value={claim.totals.subtotal?.value ?? null}
                    onChange={(val) =>
                      handleFieldChange("totals.subtotal.value", val)
                    }
                    helpText="Stated invoice subtotal prior to taxes or discounts."
                  />
                  <ReviewFieldInput
                    id="totals-tax"
                    label="Taxes / Surcharges (₹)"
                    type="number"
                    field={claim.totals.taxAmount}
                    value={claim.totals.taxAmount?.value ?? null}
                    onChange={(val) =>
                      handleFieldChange("totals.taxAmount.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="totals-discount"
                    label="Discount / Adjustments (₹)"
                    type="number"
                    field={claim.totals.discountAmount}
                    value={claim.totals.discountAmount?.value ?? null}
                    onChange={(val) =>
                      handleFieldChange("totals.discountAmount.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="totals-advance"
                    label="Advance / Copay Collected (₹)"
                    type="number"
                    field={claim.totals.advancePaid}
                    value={claim.totals.advancePaid?.value ?? null}
                    onChange={(val) =>
                      handleFieldChange("totals.advancePaid.value", val)
                    }
                  />
                  <ReviewFieldInput
                    id="totals-patient-resp"
                    label="Estimated Patient Responsibility (₹)"
                    type="number"
                    value={claim.totals.patientResponsibilityEstimated || 0}
                    onChange={(val) =>
                      handleFieldChange(
                        "totals.patientResponsibilityEstimated",
                        val || 0,
                      )
                    }
                  />
                  <ReviewFieldInput
                    id="totals-payer-net"
                    label="Expected Net Payer Payment (₹)"
                    type="number"
                    value={claim.totals.netPayerExpectedAmount || 0}
                    onChange={(val) =>
                      handleFieldChange(
                        "totals.netPayerExpectedAmount",
                        val || 0,
                      )
                    }
                  />
                </div>

                {/* Explicit Formula Reconciliation Box */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Deterministic Reconciliation Formula:</span>
                    <Badge
                      variant={
                        !claim.totals.hasVariance ? "success" : "warning"
                      }
                      className="text-[10px]"
                    >
                      {!claim.totals.hasVariance
                        ? "Reconciled Parity"
                        : "Variance Flagged"}
                    </Badge>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 bg-background/80 p-2 rounded border border-border/40">
                    <span>
                      Lines: {formatCurrency(claim.totals.itemizedSumTotal)}
                    </span>
                    {claim.totals.taxAmount?.value ? (
                      <span>
                        + Tax: {formatCurrency(claim.totals.taxAmount.value)}
                      </span>
                    ) : null}
                    {claim.totals.discountAmount?.value ? (
                      <span>
                        - Discount:{" "}
                        {formatCurrency(claim.totals.discountAmount.value)}
                      </span>
                    ) : null}
                    {claim.totals.advancePaid?.value ? (
                      <span>
                        - Advance:{" "}
                        {formatCurrency(claim.totals.advancePaid.value)}
                      </span>
                    ) : null}
                    <span>
                      = Expected:{" "}
                      {formatCurrency(
                        roundToCents(
                          claim.totals.itemizedSumTotal +
                            (claim.totals.taxAmount?.value || 0) -
                            (claim.totals.discountAmount?.value || 0) -
                            (claim.totals.advancePaid?.value || 0),
                        ),
                      )}
                    </span>
                    <span className="font-sans font-bold text-foreground">
                      vs
                    </span>
                    <span className="text-foreground font-semibold">
                      Stated:{" "}
                      {formatCurrency(
                        claim.totals.statedBilledTotal.value || 0,
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All calculations rounded to 2 decimal places with fractional
                    penny parity. Unknown values remain null rather than
                    guessed.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7. INSURANCE / CLAIM SECTION */}
          {activeSection === "insurance" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Insurance Policy & Payer Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Payer adjudication identifiers and prior authorization data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReviewFieldInput
                    id="ins-payer-name"
                    label="Payer / Insurer Name"
                    value={
                      claim.insurance?.payerName ||
                      "Blue Cross Shield (Simulated)"
                    }
                    onChange={(val) =>
                      handleFieldChange("insurance.payerName", val || "")
                    }
                  />
                  <ReviewFieldInput
                    id="ins-policy-number"
                    label="Policy / Group Number"
                    value={claim.insurance?.policyNumber || "POL-984124"}
                    onChange={(val) =>
                      handleFieldChange("insurance.policyNumber", val || "")
                    }
                  />
                  <ReviewFieldInput
                    id="ins-prior-auth"
                    label="Prior Authorization Number"
                    value={claim.insurance?.priorAuthNumber || "PA-77391"}
                    onChange={(val) =>
                      handleFieldChange("insurance.priorAuthNumber", val || "")
                    }
                  />
                  <ReviewFieldInput
                    id="ins-coverage-status"
                    label="Coverage Verification Status"
                    value={claim.insurance?.coverageStatus || "active"}
                    onChange={(val) =>
                      handleFieldChange(
                        "insurance.coverageStatus",
                        val || "active",
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 8. EXTRACTION NOTES & AUDIT TRAIL */}
          {activeSection === "notes" && (
            <div className="space-y-4">
              {/* Discrepancies Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Flagged Discrepancies ({claim.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {claim.issues.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No unresolved discrepancies found on this encounter.
                    </p>
                  ) : (
                    claim.issues.map((iss) => (
                      <div
                        key={iss.id}
                        className="p-3 rounded-lg border border-border/80 bg-muted/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {iss.category.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <Badge
                            variant={
                              iss.severity === "error"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[9px]"
                          >
                            {iss.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{iss.message}</p>
                        {iss.suggestedAction && (
                          <p className="text-[11px] font-medium text-foreground">
                            Recommendation: {iss.suggestedAction}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Encounter Audit History ({claim.auditLog.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {claim.auditLog.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-muted/15 border border-border/60"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono py-0 px-1"
                          >
                            {event.eventType}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {event.actorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({event.actorRole.replace("_", " ")})
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {event.summary}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Unsaved Modifications"
        description="You have made changes to this encounter that have not been saved. Are you sure you want to discard your edits?"
        confirmLabel="Discard Edits"
        cancelLabel="Continue Editing"
        variant="destructive"
        onConfirm={handleConfirmDiscard}
      />

      {/* Adjudicator Decision Rationale Dialog */}
      <DecisionDialog
        open={decisionModalOpen}
        onOpenChange={setDecisionModalOpen}
        claim={claim}
        outcome={decisionOutcome}
        onConfirm={handleRecordDecision}
        isLoading={isSubmittingDecision}
      />
    </div>
  );
}
