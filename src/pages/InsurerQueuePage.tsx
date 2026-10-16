import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Building2,
  User,
  ShieldAlert,
  RotateCcw,
  HelpCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import type { Claim } from "@/types/contracts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InsurerQueuePage() {
  const navigate = useNavigate();
  const { role, roleConfig } = useRole();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<
    | "all"
    | "needs_review"
    | "missing_fields"
    | "discrepancies"
    | "approved"
    | "rejected"
  >("all");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "critical" | "warning" | "clean"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dataAccess = getDataAccess();
      const res = await dataAccess.getClaims({
        page: 1,
        pageSize: 50,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setClaims(res.items);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Failed to load adjudication queue.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Client-side filtering across search, queue tabs, and severity
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          claim.claimNumber.toLowerCase().includes(q) ||
          (claim.patient.fullName.value?.toLowerCase() || "").includes(q) ||
          (claim.hospital.providerName.value?.toLowerCase() || "").includes(
            q,
          ) ||
          (claim.patient.id?.toLowerCase() || "").includes(q) ||
          (claim.patient.accountNumber.value?.toLowerCase() || "").includes(
            q,
          ) ||
          claim.lineItems.some((li) =>
            (li.code.value?.toLowerCase() || "").includes(q),
          );
        if (!matchesSearch) return false;
      }

      // 2. Status Tab Filtering
      const missingFieldsCount = claim.issues.filter(
        (i) => i.category === "missing_required_field",
      ).length;
      const hasMathDiscrepancy =
        claim.totals.hasVariance ||
        claim.issues.some(
          (i) =>
            i.category === "line_item_math_error" ||
            i.category === "arithmetic_mismatch",
        );

      if (statusTab === "needs_review") {
        if (claim.status !== "under_review" && claim.status !== "flagged")
          return false;
      } else if (statusTab === "missing_fields") {
        if (missingFieldsCount === 0) return false;
      } else if (statusTab === "discrepancies") {
        if (!hasMathDiscrepancy) return false;
      } else if (statusTab === "approved") {
        if (claim.status !== "approved") return false;
      } else if (statusTab === "rejected") {
        if (claim.status !== "rejected") return false;
      }

      // 3. Severity Filtering
      const hasCritical = claim.issues.some(
        (i) => i.severity === "critical" || i.severity === "error",
      );
      const hasWarning = claim.issues.some((i) => i.severity === "warning");

      if (severityFilter === "critical") {
        if (!hasCritical) return false;
      } else if (severityFilter === "warning") {
        if (!hasWarning) return false;
      } else if (severityFilter === "clean") {
        if (claim.issues.length > 0 || claim.totals.hasVariance) return false;
      }

      return true;
    });
  }, [claims, searchQuery, statusTab, severityFilter]);

  // Derived Queue Counts
  const counts = useMemo(() => {
    const total = claims.length;
    const needsReview = claims.filter(
      (c) => c.status === "under_review" || c.status === "flagged",
    ).length;
    const missingFields = claims.filter((c) =>
      c.issues.some((i) => i.category === "missing_required_field"),
    ).length;
    const discrepancies = claims.filter(
      (c) =>
        c.totals.hasVariance ||
        c.issues.some(
          (i) =>
            i.category === "line_item_math_error" ||
            i.category === "arithmetic_mismatch",
        ),
    ).length;
    const approved = claims.filter((c) => c.status === "approved").length;
    const rejected = claims.filter((c) => c.status === "rejected").length;
    return {
      total,
      needsReview,
      missingFields,
      discrepancies,
      approved,
      rejected,
    };
  }, [claims]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusTab("all");
    setSeverityFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Insurer Review Queue
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/40 text-primary"
            >
              DEMO MODE - SIMULATED ADJUDICATION
            </Badge>
            <Badge variant={roleConfig.badgeVariant} className="text-[10px]">
              {roleConfig.badgeLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
            Triage incoming healthcare encounters, inspect deterministic audit
            findings, verify missing fields, and execute authorized adjudication
            decisions (Approve, Query, Reject).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/claims">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Claims Registry
            </Link>
          </Button>
        </div>
      </div>

      {/* ── POLICY ENFORCEMENT & DEMO DISCLAIMER BANNER ── */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Shield className="h-4 w-4 shrink-0" />
            <span>Backend Policy Enforcement Notice</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            Session: {roleConfig.title} ({role})
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          All adjudication state transitions (Approve, Query, Reject) are
          cryptographically enforced by backend access control policies. UI
          controls reflect permitted actions, but authorization is strictly
          verified at the data access boundary. Hiding a button is not
          authorization.
        </p>
        <p className="text-[10px] text-muted-foreground/80 italic border-t border-border/60 pt-1">
          Simulated Adjudication Disclaimer: BillBridge is operating in Demo
          Mode using synthetic medical bills. Decisions recorded here are
          simulated and do not transmit live transactions to commercial health
          plans, Medicare, Medicaid, or clearinghouse portals.
        </p>
      </div>

      {/* ── QUEUE SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Awaiting Adjudication
              </span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                counts.needsReview
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Claims under review or flagged
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Missing Fields
              </span>
              <HelpCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                counts.missingFields
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Incomplete provider or patient fields
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Audit Discrepancies
              </span>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-destructive mt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                counts.discrepancies
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Math mismatches or duplicate codes
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Decisions Recorded
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                `${counts.approved + counts.rejected}`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {counts.approved} approved • {counts.rejected} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── QUEUE FILTER TOOLBAR ── */}
      <Card className="border-border/80">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queue by claim #, patient, provider, account, or code..."
                className="pl-9 h-9 text-xs"
                aria-label="Search review queue"
              />
            </div>

            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                Severity:
              </span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                aria-label="Filter by issue severity"
                className="h-9 text-xs rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Severity Levels</option>
                <option value="critical">Critical Blockers Only</option>
                <option value="warning">Warnings Only</option>
                <option value="clean">100% Reconciled Clean</option>
              </select>
            </div>

            {/* Date Range Pickers */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                Dates:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date filter"
                className="h-9 text-xs px-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date filter"
                className="h-9 text-xs px-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery ||
              statusTab !== "all" ||
              severityFilter !== "all" ||
              startDate ||
              endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Queue Views:
            </span>

            {[
              { id: "all", label: "All Encounters", count: counts.total },
              {
                id: "needs_review",
                label: "Needs Review",
                count: counts.needsReview,
              },
              {
                id: "missing_fields",
                label: "Missing Fields",
                count: counts.missingFields,
              },
              {
                id: "discrepancies",
                label: "Math Discrepancies",
                count: counts.discrepancies,
              },
              { id: "approved", label: "Approved", count: counts.approved },
              { id: "rejected", label: "Rejected", count: counts.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  statusTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── QUEUE TABLE ── */}
      <Card className="border-border/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[170px] text-xs font-semibold">
                Claim # & Date
              </TableHead>
              <TableHead className="text-xs font-semibold">
                Healthcare Facility
              </TableHead>
              <TableHead className="text-xs font-semibold">
                Patient & Policy
              </TableHead>
              <TableHead className="text-right text-xs font-semibold">
                Billed & Variance
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                Missing Fields
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                Audit Issues
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold">
                Adjudication Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-7 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : loadError ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-destructive text-xs"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <span>{loadError}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchClaims}
                      className="mt-2 text-xs"
                    >
                      Retry Loading Queue
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClaims.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-xs"
                >
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      No encounters match active queue filters
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ||
                      statusTab !== "all" ||
                      severityFilter !== "all" ||
                      startDate ||
                      endDate
                        ? "Try adjusting search terms, dates, or clearing your active filters."
                        : "The adjudication queue is currently clear."}
                    </p>
                    {(searchQuery ||
                      statusTab !== "all" ||
                      severityFilter !== "all" ||
                      startDate ||
                      endDate) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetFilters}
                        className="text-xs"
                      >
                        Clear Active Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClaims.map((claim) => {
                const missingFields = claim.issues.filter(
                  (i) => i.category === "missing_required_field",
                );
                const criticalCount = claim.issues.filter(
                  (i) => i.severity === "critical" || i.severity === "error",
                ).length;
                const warningCount = claim.issues.filter(
                  (i) => i.severity === "warning",
                ).length;

                return (
                  <TableRow
                    key={claim.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest("button") && !target.closest("a")) {
                        navigate(`/queue/${claim.id}`);
                      }
                    }}
                  >
                    {/* Claim # & Date */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/queue/${claim.id}`}
                          className="font-mono font-bold text-xs text-foreground hover:text-primary transition-colors"
                        >
                          {claim.claimNumber}
                        </Link>
                        {claim.isSyntheticDemo && (
                          <span className="text-[9px] font-mono uppercase bg-muted/90 px-1 rounded text-muted-foreground">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(
                          claim.hospital.statementDate.value || claim.createdAt,
                        )}
                      </div>
                    </TableCell>

                    {/* Facility */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs text-foreground truncate max-w-[200px]">
                          {claim.hospital.providerName.value ||
                            "Unknown Facility"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        NPI: {claim.hospital.npi.value || "N/A"}
                      </div>
                    </TableCell>

                    {/* Patient & Policy */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {claim.patient.fullName.value || "Patient Record"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        ID: {claim.patient.id} • Pol:{" "}
                        {claim.insurance?.policyNumber || "Pending"}
                      </div>
                    </TableCell>

                    {/* Financials & Variance */}
                    <TableCell className="text-right font-mono text-xs">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(
                          claim.totals.statedBilledTotal.value || 0,
                        )}
                      </div>
                      {claim.totals.hasVariance ? (
                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Var: {claim.totals.variance > 0 ? "+" : ""}
                          {formatCurrency(claim.totals.variance)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Exact match
                        </div>
                      )}
                    </TableCell>

                    {/* Missing Fields Column */}
                    <TableCell className="text-center">
                      {missingFields.length > 0 ? (
                        <Badge
                          variant="warning"
                          className="text-[10px] gap-1 font-mono"
                        >
                          <HelpCircle className="h-3 w-3" />
                          {missingFields.length} Missing
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Complete
                        </Badge>
                      )}
                    </TableCell>

                    {/* Audit Issues Column */}
                    <TableCell className="text-center">
                      {criticalCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] gap-1 font-mono"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          {criticalCount} Critical
                        </Badge>
                      ) : warningCount > 0 ? (
                        <Badge
                          variant="warning"
                          className="text-[10px] gap-1 font-mono"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {warningCount} Warning{warningCount > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        >
                          Clean Parity
                        </Badge>
                      )}
                    </TableCell>

                    {/* Lifecycle Status */}
                    <TableCell className="text-center">
                      {claim.status === "approved" ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </Badge>
                      ) : claim.status === "rejected" ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Rejected
                        </Badge>
                      ) : claim.status === "flagged" ? (
                        <Badge variant="warning" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </Badge>
                      ) : (
                        <Badge variant="info" className="text-[10px] gap-1">
                          <Clock className="h-3 w-3" /> Under Review
                        </Badge>
                      )}
                    </TableCell>

                    {/* Adjudication Action Button */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          variant="default"
                          className="h-7 px-2.5 text-xs gap-1 font-medium cursor-pointer"
                        >
                          <Link to={`/queue/${claim.id}`}>
                            Review & Adjudicate
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
