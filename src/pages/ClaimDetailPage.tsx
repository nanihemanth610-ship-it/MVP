import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  AlertTriangle,
  ShieldAlert,
  FileSpreadsheet,
  Send,
  Check,
  X,
  History,
  AlertCircle,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import {
  getAllowedNextStatuses,
  type Claim,
  type ClaimStatus,
  type StatusTransitionRule,
} from "@/types/contracts";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportDropdown } from "@/components/export/ExportDropdown";

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, roleConfig } = useRole();
  const { toast } = useToast();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Status transition state
  const [transitioningStatus, setTransitioningStatus] =
    useState<ClaimStatus | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

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

  // Execute permitted status transition via data layer
  const handleExecuteTransition = async (targetRule: StatusTransitionRule) => {
    if (!claim) return;
    setIsSubmittingTransition(true);
    try {
      const dataAccess = getDataAccess();
      const updated = await dataAccess.updateClaimStatus(
        claim.id,
        targetRule.to,
        role,
        transitionReason.trim() || targetRule.description,
      );
      setClaim(updated);
      setTransitioningStatus(null);
      setTransitionReason("");
      toast({
        title: "Status Transition Complete",
        description: `Encounter ${claim.claimNumber} moved from ${claim.status} to ${targetRule.to}.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Status Transition Prohibited",
        description:
          err instanceof Error
            ? err.message
            : "Action blocked by data layer validation rules.",
        variant: "error",
      });
    } finally {
      setIsSubmittingTransition(false);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
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

  const allowedTransitions = getAllowedNextStatuses(claim.status, role);

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* ── TOP BAR WITH BREADCRUMB, ACTIONS & ROLE NEXT ACTION ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/claims")}
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
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-muted-foreground"
            >
              SYNTHETIC DEMO
            </Badge>
            {claim.claimType && (
              <Badge variant="teal" className="text-[10px] font-medium">
                {claim.claimType}
              </Badge>
            )}
            {claim.claimRef && (
              <span className="text-[11px] font-mono text-muted-foreground">
                Ref: {claim.claimRef}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
            {claim.hospital.providerName.value || "Hospital Facility"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Patient: {claim.patient.fullName.value || "—"} ({claim.patient.id})
            • Statement Date:{" "}
            {formatDate(claim.hospital.statementDate.value || claim.createdAt)}
          </p>
        </div>

        {/* Primary Action: Direct jump to Patient Plain View, Extraction Review Workspace or Adjudication */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <ExportDropdown
            mode="single"
            singleClaim={claim}
            size="sm"
            variant="outline"
            buttonText="Export"
          />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="text-xs font-medium border-teal/40 text-teal-700 dark:text-teal-300 hover:bg-teal/10"
          >
            <Link to={`/claims/${claim.id}/patient`}>
              <User className="h-3.5 w-3.5 mr-1.5" />
              Patient Plain View (EN/తెలుగు)
            </Link>
          </Button>
          {(role === "insurer_reviewer" || role === "hospital_staff") && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="text-xs font-medium"
            >
              <Link to={`/queue/${claim.id}`}>
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Adjudication Review
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant="default"
            className="text-xs font-medium"
          >
            <Link to={`/review/${claim.id}`}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Open Extraction Workspace
              <ArrowRight className="h-3 w-3 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── FINANCIAL OVERVIEW METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Stated Billed Total
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              {formatCurrency(claim.totals.statedBilledTotal.value || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Printed on hospital bill
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Itemized Sum
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              {formatCurrency(claim.totals.itemizedSumTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sum of {claim.lineItems.length} charge line items
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Arithmetic Variance
            </p>
            <p
              className={`text-2xl font-bold font-mono tracking-tight mt-1 ${
                !claim.totals.hasVariance
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {!claim.totals.hasVariance
                ? "₹0.00 Exact"
                : `${claim.totals.variance > 0 ? "+" : ""}${formatCurrency(claim.totals.variance)}`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {!claim.totals.hasVariance
                ? "100% mathematical parity"
                : "Discrepancy identified"}
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Patient Responsibility
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              {formatCurrency(claim.totals.patientResponsibilityEstimated || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Copay / deductible applied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── ALLOWED STATUS TRANSITIONS WORKFLOW (DATA LAYER ENFORCED) ── */}
      <Card className="border-border/80 bg-muted/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Workflow Adjudication State:
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize font-mono"
                >
                  Current: {claim.status.replace("_", " ")}
                </Badge>
                <Badge
                  variant={roleConfig.badgeVariant}
                  className="text-[10px]"
                >
                  Acting as: {roleConfig.badgeLabel}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Allowed state transitions are strictly validated in the data
                access layer. Unauthorized role actions are rejected.
              </p>
            </div>

            {/* Allowed transition actions for current role */}
            <div className="flex items-center gap-2 flex-wrap">
              {allowedTransitions.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">
                  {claim.status === "approved"
                    ? "Encounter is approved and locked."
                    : "No further status transitions available for your role."}
                </span>
              ) : (
                allowedTransitions.map((rule) => (
                  <Button
                    key={`${rule.from}-${rule.to}`}
                    size="sm"
                    variant={
                      rule.to === "approved"
                        ? "default"
                        : rule.to === "rejected"
                          ? "outline"
                          : "secondary"
                    }
                    className="h-8 text-xs font-medium cursor-pointer"
                    onClick={() => {
                      setTransitioningStatus(rule.to);
                      setTransitionReason(rule.description);
                    }}
                  >
                    {rule.to === "approved" ? (
                      <Check className="h-3 w-3 mr-1 text-emerald-500" />
                    ) : rule.to === "rejected" ? (
                      <X className="h-3 w-3 mr-1 text-destructive" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Transition to {rule.to.replace("_", " ").toUpperCase()}
                  </Button>
                ))
              )}
            </div>
          </div>

          {/* Prompt modal / inline confirmation when executing transition */}
          {transitioningStatus && (
            <div className="mt-3 p-3 rounded-lg bg-background border border-primary/30 space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Confirm Transition: {claim.status} → {transitioningStatus}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setTransitioningStatus(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter an audit rationale for this encounter status change. This
                event will be recorded in the chronological activity timeline.
              </p>
              <input
                type="text"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Rationale note for status transition..."
                className="w-full h-8 text-xs px-2 rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Transition rationale note"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTransitioningStatus(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-7 text-xs font-medium"
                  disabled={isSubmittingTransition}
                  onClick={() => {
                    const rule = allowedTransitions.find(
                      (r) => r.to === transitioningStatus,
                    );
                    if (rule) handleExecuteTransition(rule);
                  }}
                >
                  {isSubmittingTransition
                    ? "Recording Transition..."
                    : "Confirm Transition"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TWO-COLUMN ENCOUNTER METADATA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital & Facility Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Hospital & Billing Provider
            </CardTitle>
            <CardDescription className="text-xs">
              Facility identifiers, billing credentials, and encounter dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Facility Name
                </span>
                <span className="font-medium text-foreground">
                  {claim.hospital.providerName.value || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  NPI Number
                </span>
                <span className="font-mono text-foreground">
                  {claim.hospital.npi.value || "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Encounter Type
                </span>
                <span className="capitalize font-medium text-foreground">
                  {claim.hospital.facilityType}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Statement Date
                </span>
                <span className="font-mono text-foreground">
                  {formatDate(claim.hospital.statementDate.value || "")}
                </span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">
                Billing Address
              </span>
              <span className="text-foreground">
                {claim.hospital.billingAddress.value || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Patient & Policy Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Patient & Insurance Plan
            </CardTitle>
            <CardDescription className="text-xs">
              Patient identity, account ID, and policy coverage parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Patient Full Name
                </span>
                <span className="font-medium text-foreground">
                  {claim.patient.fullName.value || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Date of Birth
                </span>
                <span className="font-mono text-foreground">
                  {claim.patient.dateOfBirth.value
                    ? formatDate(claim.patient.dateOfBirth.value)
                    : "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Insurance Member ID
                </span>
                <span className="font-mono text-foreground">
                  {claim.patient.memberId.value || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Hospital Account #
                </span>
                <span className="font-mono text-foreground">
                  {claim.patient.accountNumber.value || "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Insurer / Payer Name
                </span>
                <span className="font-medium text-foreground">
                  {claim.insurance?.payerName || "Commercial Carrier"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">
                  Policy / Group #
                </span>
                <span className="font-mono text-foreground">
                  {claim.insurance?.policyNumber || "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ITEMIZED LINE CHARGES SUMMARY TABLE ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Itemized Charges ({claim.lineItems.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Clinical procedure codes, billed quantities, unit rates, and
                totals.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to={`/review/${claim.id}`}>Edit Line Items →</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Code & Type</TableHead>
                <TableHead>Procedure / Charge Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Rate</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claim.lineItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.isMathMismatch ? "bg-amber-500/5" : undefined}
                >
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {item.lineNumber}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {item.code.value ? (
                      <div className="flex items-center gap-1">
                        <span>{item.code.value}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-normal">
                          ({item.codeType})
                        </span>
                      </div>
                    ) : (
                      <span className="text-destructive font-normal text-[11px]">
                        — Null
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{item.description.value || "—"}</div>
                    {item.isMathMismatch && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3" /> Math mismatch
                        detected
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {item.quantity.value ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {item.unitPrice.value !== null
                      ? formatCurrency(item.unitPrice.value)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {item.totalPrice.value !== null
                      ? formatCurrency(item.totalPrice.value)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        item.totalPrice.confidence >= 0.9
                          ? "success"
                          : item.totalPrice.confidence >= 0.7
                            ? "secondary"
                            : "warning"
                      }
                      className="text-[9px]"
                    >
                      {Math.round(item.totalPrice.confidence * 100)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── DETERMINISTIC AUDIT FINDINGS (IF ANY) ── */}
      {claim.issues.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Deterministic Audit Findings ({claim.issues.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Automated validation flags identified by the deterministic audit
              engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {claim.issues.map((iss) => (
              <div
                key={iss.id}
                className={`p-3 rounded-lg border text-xs ${
                  iss.severity === "critical" || iss.severity === "error"
                    ? "border-destructive/30 bg-destructive/5"
                    : iss.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={
                      iss.severity === "critical" || iss.severity === "error"
                        ? "destructive"
                        : iss.severity === "warning"
                          ? "warning"
                          : "secondary"
                    }
                    className="text-[10px] font-mono uppercase font-bold"
                  >
                    {iss.code}
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {iss.severity === "critical"
                      ? "Critical Blocker"
                      : iss.severity === "warning"
                        ? "Warning"
                        : "Info"}
                  </span>
                </div>
                <p className="text-foreground text-xs">{iss.message}</p>
                {iss.suggestedAction && (
                  <p className="text-[11px] text-primary mt-1 font-medium">
                    Suggested Action: {iss.suggestedAction}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── ACTIVITY TIMELINE (TIMESTAMP, ACTOR, ACTION, NOTE) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Encounter Activity Timeline & Audit Trail
          </CardTitle>
          <CardDescription className="text-xs">
            Chronological log of document ingestions, vision extractions,
            corrections, and decision events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {claim.auditLog.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No activity recorded for this encounter.
            </p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {claim.auditLog.map((event) => (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {event.eventType.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {event.actorRole.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-foreground font-medium">
                          by {event.actorName}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2 rounded border border-border/40">
                      {event.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
