import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  XCircle,
  HelpCircle,
  Building2,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Shield,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  History,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import type { Claim, DecisionOutcome } from "@/types/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateCompletenessIndicator } from "@/services/audit-engine";
import { DocumentViewer } from "@/components/review/DocumentViewer";
import { DecisionDialog } from "@/components/review/DecisionDialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export function InsurerReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, roleConfig } = useRole();
  const { toast } = useToast();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active view tab for right column
  const [activeTab, setActiveTab] = useState<"audit" | "data" | "timeline">(
    "audit",
  );
  // Mobile toggle between source document and extracted audit data
  const [mobileView, setMobileView] = useState<"document" | "data">("data");

  // Audit issues filter
  const [issueFilter, setIssueFilter] = useState<
    "all" | "critical" | "warning" | "info"
  >("all");

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionOutcome, setDecisionOutcome] =
    useState<DecisionOutcome>("approved");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const fetchClaim = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dataAccess = getDataAccess();
      const found = await dataAccess.getClaimById(id || "claim-memorial-002");
      if (found) {
        setClaim(found);
      } else {
        setLoadError(`Claim encounter record with ID "${id}" was not found.`);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load claim detail.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  // Derived audit issues & missing fields
  const missingFields = useMemo(() => {
    if (!claim) return [];
    return claim.issues.filter((i) => i.category === "missing_required_field");
  }, [claim]);

  const filteredIssues = useMemo(() => {
    if (!claim) return [];
    if (issueFilter === "all") return claim.issues;
    if (issueFilter === "critical")
      return claim.issues.filter(
        (i) => i.severity === "critical" || i.severity === "error",
      );
    if (issueFilter === "warning")
      return claim.issues.filter((i) => i.severity === "warning");
    return claim.issues.filter((i) => i.severity === "info");
  }, [claim, issueFilter]);

  const completeness = useMemo(() => {
    if (!claim) return null;
    return calculateCompletenessIndicator(claim.issues);
  }, [claim]);

  // Record Decision Handler (Approve, Query, Reject)
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
          role === "insurer_reviewer"
            ? "David Senior Adjudicator"
            : "Unauthorized User",
      });

      setClaim(updated);
      setDecisionModalOpen(false);

      const outcomeLabels: Record<string, string> = {
        approved: "Claim Approved",
        query: "Query Dispatched to Provider",
        requires_information: "Information Requested",
        rejected: "Claim Rejected",
      };

      toast({
        title: outcomeLabels[decisionOutcome] || "Adjudication Recorded",
        description: `Encounter ${claim.claimNumber} status transitioned to ${updated.status}. Decision recorded in audit log.`,
        variant: decisionOutcome === "approved" ? "success" : "default",
      });
    } catch (err) {
      toast({
        title: "Decision Blocked by Backend Policy",
        description:
          err instanceof Error
            ? err.message
            : "Adjudication action rejected by backend access rules.",
        variant: "error",
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const openDecisionModal = (outcome: DecisionOutcome) => {
    setDecisionOutcome(outcome);
    setDecisionModalOpen(true);
  };

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (loadError || !claim) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Encounter Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {loadError ||
            "The requested claim encounter was not found in the review queue."}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/queue">Return to Review Queue</Link>
          </Button>
          <Button asChild size="sm" className="text-xs">
            <Link to="/claims">View Claims Registry</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isInsurer = role === "insurer_reviewer";

  return (
    <div className="space-y-5 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* ── HEADER & PRIMARY ADJUDICATOR ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/queue">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Review Queue
              </Link>
            </Button>
            <span className="text-muted-foreground/60">•</span>
            <span className="font-mono text-xs font-bold text-foreground">
              {claim.claimNumber}
            </span>
            <Badge
              variant={
                claim.status === "approved"
                  ? "success"
                  : claim.status === "rejected"
                    ? "destructive"
                    : claim.status === "flagged"
                      ? "warning"
                      : "info"
              }
              className="text-[10px] capitalize font-mono"
            >
              {claim.status.replace("_", " ")}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/40 text-primary"
            >
              SIMULATED ADJUDICATION
            </Badge>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
            {claim.hospital.providerName.value || "Healthcare Facility"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Patient:{" "}
            <span className="font-medium text-foreground">
              {claim.patient.fullName.value || "—"}
            </span>{" "}
            ({claim.patient.id}) • Statement Date:{" "}
            {formatDate(claim.hospital.statementDate.value || claim.createdAt)}
          </p>
        </div>

        {/* ── ADJUDICATOR ACTION BUTTONS (APPROVE, QUERY, REJECT) ── */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Query Action */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openDecisionModal("query")}
            className="h-8 px-3 text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
            title="Query healthcare provider for missing information or line item clarification"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
            Query Provider
          </Button>

          {/* Reject Action */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openDecisionModal("rejected")}
            className="h-8 px-3 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Issue formal adverse benefit denial determination"
          >
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            Reject Claim
          </Button>

          {/* Approve Action */}
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => openDecisionModal("approved")}
            className="h-8 px-3.5 text-xs gap-1.5 font-medium cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            title="Approve encounter for electronic claims reimbursement"
          >
            <Check className="h-3.5 w-3.5" />
            Approve Claim
          </Button>
        </div>
      </div>

      {/* ── POLICY ENFORCEMENT & DEMO DISCLAIMER BANNER ── */}
      <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-[11px] leading-relaxed">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div>
              <strong>Backend Policy Enforcement:</strong> Adjudication actions
              are validated against the server-side RBAC policy. Active role:{" "}
              <Badge
                variant={roleConfig.badgeVariant}
                className="text-[10px] py-0 px-1 font-mono"
              >
                {roleConfig.badgeLabel}
              </Badge>
              {!isInsurer && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                  (Read-only observation: Adjudication requires
                  'insurer_reviewer')
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Decisions recorded in this queue are simulated in demo mode.
              BillBridge does not transmit live transactions to commercial
              health insurance TPAs or government health schemes.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Toggle Bar (< lg) */}
      <div className="flex lg:hidden rounded-lg bg-muted p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMobileView("document")}
          className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
            mobileView === "document"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground"
          }`}
        >
          Source Document
        </button>
        <button
          type="button"
          onClick={() => setMobileView("data")}
          className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
            mobileView === "data"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground"
          }`}
        >
          Audit & Extracted Data ({claim.issues.length} Issues)
        </button>
      </div>

      {/* ── SIDE-BY-SIDE REVIEW WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: SOURCE DOCUMENT PREVIEW ── */}
        <div
          className={`lg:col-span-6 space-y-3 ${mobileView === "document" ? "block" : "hidden lg:block"}`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Source Medical Bill Document
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {claim.document.fileName}
            </span>
          </div>

          <DocumentViewer claim={claim} />
        </div>

        {/* ── RIGHT COLUMN: AUDIT ISSUES, MISSING FIELDS & EXTRACTED DATA ── */}
        <div
          className={`lg:col-span-6 space-y-4 ${mobileView === "data" ? "block" : "hidden lg:block"}`}
        >
          {/* Navigation Tabs for Right Column */}
          <div className="flex items-center gap-1 border-b border-border/80 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "audit"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Audit & Missing Fields ({claim.issues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("data")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "data"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Extracted Charges & Totals
            </button>
            <button
              type="button"
              data-testid="timeline-tab-button"
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "timeline"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Activity Timeline ({claim.auditLog.length})
            </button>
          </div>

          {/* ── TAB 1: AUDIT & MISSING FIELDS ── */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              {/* Financial Parity Quick Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-border/80 bg-muted/20 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                    Stated Billed
                  </span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(claim.totals.statedBilledTotal.value || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                    Itemized Sum
                  </span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(claim.totals.itemizedSumTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                    Variance
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      !claim.totals.hasVariance
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {!claim.totals.hasVariance
                      ? "0.00 Parity"
                      : `${claim.totals.variance > 0 ? "+" : ""}${formatCurrency(claim.totals.variance)}`}
                  </span>
                </div>
              </div>

              {/* Missing Required Fields Section */}
              <Card className="border-border">
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-amber-500" />
                      Missing Required Fields Checklist ({missingFields.length})
                    </CardTitle>
                    {missingFields.length === 0 ? (
                      <Badge variant="success" className="text-[10px]">
                        ✓ All Required Fields Present
                      </Badge>
                    ) : (
                      <Badge
                        variant="warning"
                        className="text-[10px] font-mono"
                      >
                        {missingFields.length} Required Field
                        {missingFields.length === 1 ? "" : "s"} Missing
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-[11px]">
                    Identifies missing demographic, clinical, or provider
                    identifiers required for claims submission.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {missingFields.length === 0 ? (
                    <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                      ✓ No missing mandatory fields. Patient name, date of
                      birth, provider NPI, and statement dates are validated.
                    </div>
                  ) : (
                    missingFields.map((iss) => (
                      <div
                        key={iss.id}
                        className="p-2.5 rounded-lg border border-amber-300/50 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground font-mono text-[11px]">
                            {iss.code}
                          </span>
                          <Badge variant="warning" className="text-[9px]">
                            {iss.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {iss.message}
                        </p>
                        {iss.suggestedAction && (
                          <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                            Fix: {iss.suggestedAction}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Deterministic Audit Issues List */}
              <Card className="border-border">
                <CardHeader className="pb-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                      Deterministic Audit Findings ({claim.issues.length})
                    </CardTitle>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md text-[11px]">
                      {(["all", "critical", "warning", "info"] as const).map(
                        (lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setIssueFilter(lvl)}
                            className={`px-2 py-0.5 rounded capitalize ${
                              issueFilter === lvl
                                ? "bg-background text-foreground font-semibold shadow-xs"
                                : "text-muted-foreground"
                            }`}
                          >
                            {lvl}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {filteredIssues.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No issues found for active filter "{issueFilter}".
                    </p>
                  ) : (
                    filteredIssues.map((iss) => (
                      <div
                        key={iss.id}
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          iss.severity === "critical" ||
                          iss.severity === "error"
                            ? "border-destructive/30 bg-destructive/5"
                            : iss.severity === "warning"
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border/60 bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-foreground">
                            {iss.code}
                          </span>
                          <Badge
                            variant={
                              iss.severity === "critical" ||
                              iss.severity === "error"
                                ? "destructive"
                                : iss.severity === "warning"
                                  ? "warning"
                                  : "secondary"
                            }
                            className="text-[9px] uppercase font-mono"
                          >
                            {iss.severity}
                          </Badge>
                        </div>
                        <p className="text-foreground text-[11px] leading-relaxed">
                          {iss.message}
                        </p>
                        {iss.suggestedAction && (
                          <p className="text-[10px] text-primary font-medium">
                            Action: {iss.suggestedAction}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Completeness Indicator */}
              {completeness && (
                <div className="p-3 rounded-lg border border-border/80 bg-muted/15 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Completeness & Adjudication Readiness
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {completeness.score}/100
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    {completeness.disclaimer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: EXTRACTED ENCOUNTER DATA & CHARGES ── */}
          {activeTab === "data" && (
            <div className="space-y-4">
              {/* Encounter Metadata Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />{" "}
                      Provider Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 text-xs space-y-1">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Facility
                      </span>
                      <span className="font-medium text-foreground">
                        {claim.hospital.providerName.value || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        NPI
                      </span>
                      <span className="font-mono text-foreground">
                        {claim.hospital.npi.value || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Statement Date
                      </span>
                      <span className="font-mono text-foreground">
                        {formatDate(claim.hospital.statementDate.value || "")}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" /> Patient &
                      Policy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 text-xs space-y-1">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Patient Name
                      </span>
                      <span className="font-medium text-foreground">
                        {claim.patient.fullName.value || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Patient ID
                      </span>
                      <span className="font-mono text-foreground">
                        {claim.patient.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Policy / Group
                      </span>
                      <span className="font-mono text-foreground">
                        {claim.insurance?.policyNumber || "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Itemized Line Items Table */}
              <Card className="border-border">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                    Itemized Charge Line Items ({claim.lineItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent text-[11px]">
                        <TableHead className="w-[50px] text-xs">#</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-right text-xs">
                          Qty
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Unit Rate
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claim.lineItems.map((li) => (
                        <TableRow key={li.id} className="text-xs">
                          <TableCell className="font-mono text-muted-foreground text-[11px]">
                            {li.lineNumber}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                            {li.serviceDate?.value
                              ? formatDate(li.serviceDate.value)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-foreground text-xs">
                              {li.code.value || (
                                <span className="text-amber-600 italic">
                                  Missing
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-foreground max-w-[180px] truncate"
                            title={li.description.value || ""}
                          >
                            {li.description.value || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {li.quantity.value}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatCurrency(li.unitPrice.value || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                            {formatCurrency(li.totalPrice.value || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB 3: ACTIVITY TIMELINE & DECISION HISTORY ── */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {claim.latestDecision && (
                <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Recorded Decision:{" "}
                      {claim.latestDecision.outcome.toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {formatDate(claim.latestDecision.decidedAt)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    <strong>Adjudicator:</strong>{" "}
                    {claim.latestDecision.adjudicatorName} (
                    {claim.latestDecision.adjudicatorRole})
                  </p>
                  <p className="text-foreground text-[11px] bg-background/80 p-2 rounded border border-border/60">
                    <strong>Rationale Note:</strong>{" "}
                    {claim.latestDecision.rationale}
                  </p>
                </div>
              )}

              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" />
                    Encounter Audit History ({claim.auditLog.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3 pt-0">
                  {claim.auditLog.map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono py-0 px-1"
                          >
                            {event.eventType}
                          </Badge>
                          <span className="font-semibold text-foreground text-[11px]">
                            {event.actorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({event.actorRole})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {event.summary}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── ACCESSIBLE ADJUDICATION MODAL (APPROVE, QUERY, REJECT) ── */}
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
