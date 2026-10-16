import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UploadCloud,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
  Building2,
  ShieldCheck,
  RotateCcw,
  FileSpreadsheet,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import type { Claim } from "@/types/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportDropdown } from "@/components/export/ExportDropdown";

export function DashboardPage() {
  const navigate = useNavigate();
  const { role, roleConfig } = useRole();
  const { toast } = useToast();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "date" | "amount_desc" | "amount_asc" | "provider"
  >("date");

  // Selected claim for interactive lifecycle journey panel
  const [selectedJourneyClaimId, setSelectedJourneyClaimId] =
    useState<string>("claim-memorial-002");

  // Reset confirmation modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const dataAccess = getDataAccess();
      const res = await dataAccess.getClaims();
      setClaims(res.items);
      if (
        res.items.length > 0 &&
        !res.items.some((c) => c.id === selectedJourneyClaimId)
      ) {
        setSelectedJourneyClaimId(res.items[0]?.id || "claim-memorial-002");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load claims from local database.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJourneyClaimId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Seed demo data recovery
  const handleSeedData = async () => {
    setIsResetting(true);
    try {
      const dataAccess = getDataAccess();
      const restored = await dataAccess.resetDemoData();
      setClaims(restored);
      setSelectedJourneyClaimId(restored[0]?.id || "claim-memorial-002");
      setResetModalOpen(false);
      toast({
        title: "Demo Records Restored",
        description:
          "Successfully re-seeded synthetic Indian healthcare claims.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Restore Failed",
        description: "Could not reset local storage encounters.",
        variant: "error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // ── 4 KEY METRIC CARDS DERIVED STRICTLY FROM REAL DISPLAYED RECORDS ──
  const metrics = useMemo(() => {
    let totalStated = 0;
    let totalCalculated = 0;
    let flaggedCount = 0;
    let approvedCount = 0;
    let awaitingReviewCount = 0;
    let mathErrorCount = 0;
    let decidedAmount = 0;
    let decidedCount = 0;

    for (const c of claims) {
      const stated = c.totals.statedBilledTotal.value || 0;
      totalStated += stated;
      totalCalculated += c.totals.itemizedSumTotal;

      if (c.status === "approved") {
        approvedCount++;
        decidedCount++;
        decidedAmount += stated;
      } else if (c.status === "rejected") {
        decidedCount++;
      } else if (c.status === "flagged" || c.issues.length > 0) {
        flaggedCount++;
      } else if (c.status === "under_review" || c.status === "extracted") {
        awaitingReviewCount++;
      }

      if (
        c.totals.hasVariance ||
        c.issues.some((iss) => iss.category === "line_item_math_error")
      ) {
        mathErrorCount++;
      }
    }

    return {
      totalStated,
      totalCalculated,
      flaggedCount,
      approvedCount,
      awaitingReviewCount,
      mathErrorCount,
      decidedCount,
      decidedAmount,
      totalEncounters: claims.length,
    };
  }, [claims]);

  // Priority Attention Queue: Claims with active discrepancies or under review
  const attentionClaims = useMemo(() => {
    return claims.filter(
      (c) =>
        c.status === "flagged" || c.issues.length > 0 || c.totals.hasVariance,
    );
  }, [claims]);

  // Filtered & Sorted Claims Table
  const filteredClaims = useMemo(() => {
    const list = claims.filter((claim) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        claim.claimNumber.toLowerCase().includes(q) ||
        (claim.patient.fullName.value?.toLowerCase() || "").includes(q) ||
        (claim.hospital.providerName.value?.toLowerCase() || "").includes(q) ||
        (claim.patient.accountNumber.value?.toLowerCase() || "").includes(q) ||
        (claim.insurance?.payerName?.toLowerCase() || "").includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "flagged" &&
          (claim.status === "flagged" || claim.issues.length > 0)) ||
        claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return list.sort((a, b) => {
      if (sortBy === "date") {
        const da = new Date(
          a.hospital.statementDate.value || a.createdAt,
        ).getTime();
        const db = new Date(
          b.hospital.statementDate.value || b.createdAt,
        ).getTime();
        return db - da;
      }
      if (sortBy === "amount_desc") {
        return (
          (b.totals.statedBilledTotal.value || 0) -
          (a.totals.statedBilledTotal.value || 0)
        );
      }
      if (sortBy === "amount_asc") {
        return (
          (a.totals.statedBilledTotal.value || 0) -
          (b.totals.statedBilledTotal.value || 0)
        );
      }
      const pa = a.hospital.providerName.value || "";
      const pb = b.hospital.providerName.value || "";
      return pa.localeCompare(pb);
    });
  }, [claims, searchQuery, statusFilter, sortBy]);

  // Active claim for lifecycle journey inspection
  const selectedJourneyClaim = useMemo(() => {
    return (
      claims.find((c) => c.id === selectedJourneyClaimId) || claims[0] || null
    );
  }, [claims, selectedJourneyClaimId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-150 max-w-7xl mx-auto pb-10">
      {/* ── 1. RESTRAINED, PREMIUM WELCOME SECTION ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card/90 to-muted/20 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
                <Sparkles className="h-3 w-3" />
                Demo workspace • Indian Healthcare Synthetic Records
              </span>
              <Badge
                variant={roleConfig.badgeVariant}
                className="text-[10px] py-0 px-2 font-mono"
              >
                {roleConfig.badgeLabel}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Your healthcare claims, in one clear view.
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Review medical bills, resolve discrepancies, and follow claim
              progress from submission to settlement across Indian hospitals and
              health insurance TPAs.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              size="default"
              onClick={() => navigate("/upload")}
              className="gap-2 shadow-xs font-semibold px-4 cursor-pointer"
              aria-label="Upload document to start extraction"
            >
              <UploadCloud className="h-4 w-4 stroke-[2]" />
              Upload medical bill
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => navigate("/claims")}
              className="gap-2 px-4 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              View claims
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadDashboardData}
              title="Refresh dashboard data"
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Persona Guidance Banner */}
        <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">
            {role === "patient" && (
              <>
                <strong>Policyholder Perspective:</strong> Track out-of-pocket
                hospital expenses, itemized pharmacy bills, and insurer
                settlement status.
              </>
            )}
            {role === "hospital_staff" && (
              <>
                <strong>Hospital Billing Team:</strong> Reconcile inpatient
                line-item tariffs, identify discharge package variances, and
                prepare cashless TPA submissions.
              </>
            )}
            {role === "insurer_reviewer" && (
              <>
                <strong>Claims Adjudication Desk:</strong> Review arithmetic
                parity, verify package inclusions, and record formal simulated
                benefit determinations.
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── 2. ERROR & RECOVERY STATE ── */}
      {errorMessage && (
        <ErrorState
          title="Could not load claims database"
          message={errorMessage}
          actionLabel="Retry Loading"
          onRetry={loadDashboardData}
        />
      )}

      {/* ── 3. FOUR KEY DERIVED METRIC CARDS (CALCULATED FROM ACTIVE RECORDS) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Key Healthcare Metrics
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
            DEMO • {metrics.totalEncounters} LOCAL RECORDS • INDIAN RUPEES (₹)
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1: Bills Processed */}
            <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-xs">
              <div className="absolute top-3 right-3">
                <Badge
                  variant="secondary"
                  className="text-[9px] font-mono py-0 px-1.5"
                >
                  DEMO
                </Badge>
              </div>
              <CardHeader className="pb-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  Bills processed
                </CardDescription>
                <CardTitle className="text-2xl font-bold tracking-tight mt-1 font-mono text-foreground">
                  {formatCurrency(metrics.totalStated)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] text-muted-foreground">
                  {metrics.totalEncounters} hospital statements analyzed by OCR
                </p>
              </CardContent>
            </Card>

            {/* Metric 2: Claims Awaiting Review */}
            <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-xs">
              <div className="absolute top-3 right-3">
                <Badge
                  variant="info"
                  className="text-[9px] font-mono py-0 px-1.5"
                >
                  DEMO
                </Badge>
              </div>
              <CardHeader className="pb-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  Claims awaiting review
                </CardDescription>
                <CardTitle className="text-2xl font-bold tracking-tight mt-1 font-mono text-foreground">
                  {metrics.awaitingReviewCount} Claims
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] text-muted-foreground">
                  Awaiting TPA review or coding validation
                </p>
              </CardContent>
            </Card>

            {/* Metric 3: Bill Discrepancies */}
            <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-xs">
              <div className="absolute top-3 right-3">
                <Badge
                  variant="warning"
                  className="text-[9px] font-mono py-0 px-1.5"
                >
                  DEMO
                </Badge>
              </div>
              <CardHeader className="pb-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  Bill discrepancies
                </CardDescription>
                <CardTitle className="text-2xl font-bold tracking-tight mt-1 font-mono text-amber-600 dark:text-amber-400">
                  {metrics.flaggedCount} Flagged
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] text-muted-foreground">
                  {metrics.mathErrorCount} with arithmetic tariff variances
                </p>
              </CardContent>
            </Card>

            {/* Metric 4: Claims with a Recorded Decision */}
            <Card className="relative overflow-hidden border-border/80 transition-shadow hover:shadow-xs">
              <div className="absolute top-3 right-3">
                <Badge
                  variant="teal"
                  className="text-[9px] font-mono py-0 px-1.5"
                >
                  DEMO
                </Badge>
              </div>
              <CardHeader className="pb-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Claims with recorded decision
                </CardDescription>
                <CardTitle className="text-2xl font-bold tracking-tight mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.decidedCount} Decided
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] text-muted-foreground">
                  {formatCurrency(metrics.decidedAmount)} approved in demo mode
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── 4. PRIORITY REVIEW SECTION ("NEEDS ATTENTION") ── */}
      {attentionClaims.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Claims Requiring Immediate Human Review
                </CardTitle>
                <Badge variant="warning" className="text-[10px] font-mono">
                  {attentionClaims.length} Action Needed
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Deterministic audit detected tariff arithmetic mismatches or
                unbundled items. Never automatically labeled as fraud.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {attentionClaims.map((c) => (
              <div
                key={c.id}
                className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-500/25 bg-background shadow-xs transition-colors hover:border-amber-500/40"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {c.claimNumber}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="font-medium text-xs text-foreground truncate">
                      {c.hospital.providerName.value || "Healthcare Facility"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {c.claimType || "Reimbursement"}
                    </Badge>
                    <Badge
                      variant="warning"
                      className="text-[10px] py-0 px-1.5 shrink-0"
                    >
                      {c.totals.hasVariance
                        ? `₹${Math.abs(c.totals.variance).toLocaleString("en-IN")} Variance`
                        : "Documentation Flag"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Patient:{" "}
                    <span className="font-medium text-foreground">
                      {c.patient.fullName.value || "Patient Record"}
                    </span>{" "}
                    ({c.patient.id}) • Statement Total:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(c.totals.statedBilledTotal.value || 0)}
                    </span>{" "}
                    vs Itemized Sum:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(c.totals.itemizedSumTotal)}
                    </span>
                  </p>

                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    Issue:{" "}
                    {c.totals.hasVariance
                      ? `Invoice stated total differs from the itemized charge sum by ₹${Math.abs(c.totals.variance).toLocaleString("en-IN")}. Requires tariff breakdown verification.`
                      : "Missing mandatory billing code or documentation requires clarification."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/claims/${c.id}`)}
                    className="text-xs h-8 cursor-pointer"
                  >
                    View claim
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => navigate(`/review/${c.id}`)}
                    className="text-xs h-8 gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Review bill
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 5. RECENT CLAIMS TABLE WITH SEARCH, FILTERS, SORTING & CSV EXPORT ── */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Recent Claims Encounters
            </h2>
            <p className="text-xs text-muted-foreground">
              Synthetic demonstration records with Indian healthcare tariffs and
              Rupees (₹).
            </p>
          </div>

          {/* Table Search, Filters, Sort & CSV Export */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hospital, patient, ID..."
                className="pl-8 h-8 text-xs"
                aria-label="Filter recent claims"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "flagged", label: "Flagged" },
                { id: "under_review", label: "Review" },
                { id: "approved", label: "Approved" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer select-none ${
                    statusFilter === f.id
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              aria-label="Sort claims by"
            >
              <option value="date">Sort: Date</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="provider">Sort: Hospital</option>
            </select>

            {/* Export Dropdown with CSV & JSON & Formula Escaping */}
            <ExportDropdown
              claims={filteredClaims}
              filenamePrefix="billbridge_claims_report"
              buttonText="Export Report"
              size="sm"
            />
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <Card className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </Card>
        ) : claims.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={FileText}
            title="No Claims Records in Storage"
            description="Your local billing database has no claims encounters. You can upload a new bill document or seed sample demo encounters."
            actionLabel="Upload Medical Bill"
            onAction={() => navigate("/upload")}
            secondaryActionLabel="Seed Sample Demo Encounters"
            onSecondaryAction={handleSeedData}
          />
        ) : filteredClaims.length === 0 ? (
          /* No Match State */
          <Card className="p-8 text-center text-xs text-muted-foreground">
            <p>
              No claims match your active filters or search query &quot;
              {searchQuery}&quot;.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-3 text-xs"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Card className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs bg-muted/30">
                        <TableHead>Claim Reference</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Healthcare Provider</TableHead>
                        <TableHead>Claim Type</TableHead>
                        <TableHead className="text-right">
                          Amount Claimed
                        </TableHead>
                        <TableHead className="text-center">
                          Bill Status
                        </TableHead>
                        <TableHead className="text-center">
                          Insurer Status
                        </TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.map((claim) => (
                        <TableRow
                          key={claim.id}
                          className={`text-xs transition-colors cursor-pointer ${
                            selectedJourneyClaimId === claim.id
                              ? "bg-primary/5 font-medium"
                              : ""
                          }`}
                          onClick={() => setSelectedJourneyClaimId(claim.id)}
                        >
                          {/* Claim Reference */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to={`/claims/${claim.id}`}
                                className="font-mono font-bold text-xs text-foreground hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {claim.claimNumber}
                              </Link>
                              <span className="text-[9px] font-mono uppercase bg-muted/80 px-1 py-0.2 rounded text-muted-foreground border border-border/40">
                                DEMO
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Patient: {claim.patient.fullName.value}
                            </div>
                          </TableCell>

                          {/* Date Submitted */}
                          <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDate(
                              claim.hospital.statementDate.value ||
                                claim.createdAt,
                            )}
                          </TableCell>

                          {/* Hospital */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 max-w-[220px]">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span
                                className="font-medium text-xs text-foreground truncate"
                                title={claim.hospital.providerName.value || ""}
                              >
                                {claim.hospital.providerName.value ||
                                  "Unknown Facility"}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono pl-5">
                              {claim.hospital.npi.value || "ROHINI ID"}
                            </div>
                          </TableCell>

                          {/* Claim Type */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono"
                            >
                              {claim.claimType || "Reimbursement"}
                            </Badge>
                          </TableCell>

                          {/* Amount Claimed & Variance */}
                          <TableCell className="text-right font-mono text-xs">
                            <div className="font-bold text-foreground">
                              {formatCurrency(
                                claim.totals.statedBilledTotal.value || 0,
                              )}
                            </div>
                            {claim.totals.hasVariance ? (
                              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                {claim.totals.variance > 0 ? "+" : ""}
                                {formatCurrency(claim.totals.variance)}
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Exact Parity
                              </div>
                            )}
                          </TableCell>

                          {/* Bill Verification Status */}
                          <TableCell className="text-center">
                            {claim.totals.hasVariance ? (
                              <Badge
                                variant="warning"
                                className="text-[10px] gap-1"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />{" "}
                                Discrepancy
                              </Badge>
                            ) : claim.issues.length > 0 ? (
                              <Badge
                                variant="warning"
                                className="text-[10px] gap-1"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" /> Code
                                Review
                              </Badge>
                            ) : (
                              <Badge
                                variant="success"
                                className="text-[10px] gap-1"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />{" "}
                                Verified
                              </Badge>
                            )}
                          </TableCell>

                          {/* Insurer Status */}
                          <TableCell className="text-center">
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
                              {claim.status === "approved"
                                ? "Approved (Demo)"
                                : claim.status === "rejected"
                                  ? "Rejected (Demo)"
                                  : claim.status.replace("_", " ")}
                            </Badge>
                          </TableCell>

                          {/* Row Actions */}
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/claims/${claim.id}`)}
                                className="h-7 px-2 text-xs cursor-pointer"
                                title="View Claim Details"
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/review/${claim.id}`)}
                                className="h-7 px-2.5 text-xs gap-1 cursor-pointer text-primary border-primary/30 hover:bg-primary/10"
                              >
                                {role === "insurer_reviewer"
                                  ? "Adjudicate"
                                  : role === "patient"
                                    ? "Inspect"
                                    : "Review"}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Responsive Cards (< sm) */}
            <div className="block sm:hidden space-y-3">
              {filteredClaims.map((claim) => (
                <Card
                  key={claim.id}
                  className={`p-3.5 space-y-2.5 border-border ${
                    selectedJourneyClaimId === claim.id
                      ? "ring-2 ring-primary/40"
                      : ""
                  }`}
                  onClick={() => setSelectedJourneyClaimId(claim.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {claim.claimNumber}
                    </span>
                    <Badge
                      variant={
                        claim.status === "approved"
                          ? "success"
                          : claim.status === "flagged"
                            ? "warning"
                            : "info"
                      }
                      className="text-[10px] font-mono"
                    >
                      {claim.status}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <div className="font-medium text-foreground">
                      {claim.hospital.providerName.value}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Patient: {claim.patient.fullName.value} • Date:{" "}
                      {formatDate(
                        claim.hospital.statementDate.value || claim.createdAt,
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Claimed Amount
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(
                          claim.totals.statedBilledTotal.value || 0,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/claims/${claim.id}`);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/review/${claim.id}`);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 6. CLAIM JOURNEY / ACTIVITY LIFECYCLE PANEL ── */}
      {selectedJourneyClaim && (
        <Card className="border-border/80 bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Claim Lifecycle Journey
                </CardTitle>
                <CardDescription className="text-xs">
                  Step-by-step audit progression from document intake to final
                  settlement.
                </CardDescription>
              </div>

              {/* Selector Pills to Inspect Any Claim */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                  Inspect:
                </span>
                {claims.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedJourneyClaimId(c.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      selectedJourneyClaimId === c.id
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.claimNumber}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-foreground font-mono">
                  {selectedJourneyClaim.claimNumber}
                </span>
                <span className="text-muted-foreground mx-1.5">•</span>
                <span className="text-foreground">
                  {selectedJourneyClaim.hospital.providerName.value}
                </span>
                <span className="text-muted-foreground mx-1.5">•</span>
                <span className="text-muted-foreground">
                  Patient: {selectedJourneyClaim.patient.fullName.value}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(
                    selectedJourneyClaim.totals.statedBilledTotal.value || 0,
                  )}
                </span>
                <Badge
                  variant={
                    selectedJourneyClaim.status === "approved"
                      ? "success"
                      : "warning"
                  }
                  className="text-[10px] font-mono"
                >
                  {selectedJourneyClaim.status}
                </Badge>
              </div>
            </div>

            {/* 7-Step Horizontal / Vertical Progress Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
              {[
                {
                  step: 1,
                  title: "Claim Created",
                  status: "completed",
                  time: formatDate(selectedJourneyClaim.createdAt),
                  detail: "Encounter registered",
                  simulated: false,
                },
                {
                  step: 2,
                  title: "Documents Received",
                  status: "completed",
                  time: formatDate(selectedJourneyClaim.document.uploadedAt),
                  detail: selectedJourneyClaim.document.fileName,
                  simulated: false,
                },
                {
                  step: 3,
                  title: "Bill Validation",
                  status: selectedJourneyClaim.totals.hasVariance
                    ? "warning"
                    : "completed",
                  time: formatDate(selectedJourneyClaim.updatedAt),
                  detail: selectedJourneyClaim.totals.hasVariance
                    ? "Variance detected"
                    : "100% Math verified",
                  simulated: false,
                },
                {
                  step: 4,
                  title: "Eligibility Verified",
                  status: "completed",
                  time: "Confirmed",
                  detail: `${selectedJourneyClaim.insurance?.payerName || "Payer"} Policy Active`,
                  simulated: true,
                },
                {
                  step: 5,
                  title: "Insurer Response",
                  status:
                    selectedJourneyClaim.status === "flagged"
                      ? "active"
                      : "completed",
                  time:
                    selectedJourneyClaim.status === "flagged"
                      ? "Inquiry Pending"
                      : "Response logged",
                  detail:
                    selectedJourneyClaim.status === "flagged"
                      ? "Information queried"
                      : "Payer acknowledged",
                  simulated: true,
                },
                {
                  step: 6,
                  title: "Claim Decision",
                  status:
                    selectedJourneyClaim.status === "approved"
                      ? "completed"
                      : selectedJourneyClaim.status === "rejected"
                        ? "error"
                        : "pending",
                  time: selectedJourneyClaim.latestDecision
                    ? formatDate(selectedJourneyClaim.latestDecision.decidedAt)
                    : "Pending",
                  detail: selectedJourneyClaim.latestDecision
                    ? `Decided: ${selectedJourneyClaim.latestDecision.outcome}`
                    : "Adjudication in progress",
                  simulated: true,
                },
                {
                  step: 7,
                  title: "Settlement Status",
                  status:
                    selectedJourneyClaim.status === "approved"
                      ? "completed"
                      : "pending",
                  time:
                    selectedJourneyClaim.status === "approved"
                      ? "Scheduled"
                      : "Awaiting settlement",
                  detail:
                    selectedJourneyClaim.status === "approved"
                      ? "Electronic payout queued"
                      : "Pre-settlement stage",
                  simulated: true,
                },
              ].map((stage) => {
                const isCompleted = stage.status === "completed";
                const isWarning = stage.status === "warning";
                const isActive = stage.status === "active";
                const isError = stage.status === "error";

                return (
                  <div
                    key={stage.step}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                      isCompleted
                        ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20"
                        : isWarning
                          ? "border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20"
                          : isActive
                            ? "border-primary/40 bg-primary/5"
                            : isError
                              ? "border-destructive/30 bg-destructive/10"
                              : "border-border/60 bg-muted/20 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground font-bold">
                        0{stage.step}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {isWarning && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {isActive && (
                        <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                      )}
                      {isError && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>

                    <h4 className="font-semibold text-foreground text-xs leading-tight">
                      {stage.title}
                    </h4>

                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                      {stage.detail}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-muted-foreground border-t border-border/40">
                      <span>{stage.time}</span>
                      {stage.simulated && (
                        <span className="text-amber-800 dark:text-amber-300 font-semibold">
                          DEMO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 7. DATA AUDIT SUMMARY & RE-SEED CONTROL ── */}
      <div className="rounded-xl border border-border/70 bg-card/70 p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal shrink-0" />
          <span>
            Displaying {filteredClaims.length} of {claims.length} claims. Indian
            Rupees (₹) format • Client-side local persistence • Safe
            demonstration workspace.
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setResetModalOpen(true)}
          className="text-xs h-7.5 gap-1.5 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          title="Reset to default synthetic demo encounters"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Demo Records
        </Button>
      </div>

      {/* ── 8. ACCESSIBLE RESET CONFIRMATION MODAL ── */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Reset Demo Records
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will restore the 3 default Indian healthcare demonstration
              claims (Apollo Hospitals Bengaluru, Max Super Speciality New
              Delhi, and Fortis Memorial Gurugram) and clear any local session
              edits.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <strong>Demonstration Data Only:</strong>
            <p className="text-[11px] text-amber-800 dark:text-amber-400">
              No live insurance networks or real patient PII will be affected.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetModalOpen(false)}
              disabled={isResetting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleSeedData}
              disabled={isResetting}
              className="text-xs cursor-pointer"
            >
              {isResetting ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
