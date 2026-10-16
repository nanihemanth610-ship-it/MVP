import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Building2,
  User,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import type { Claim, ClaimStatus } from "@/types/contracts";
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
import { ExportDropdown } from "@/components/export/ExportDropdown";

export function ClaimsListPage() {
  const navigate = useNavigate();
  const { role, roleConfig } = useRole();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<
    "statementDate" | "claimedTotal" | "patientName" | "providerName"
  >("statementDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dataAccess = getDataAccess();
      const res = await dataAccess.getClaims({
        page,
        pageSize,
        search: searchQuery,
        statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDirection,
      });

      setClaims(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load claims registry.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    statusFilter,
    startDate,
    endDate,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("statementDate");
    setSortDirection("desc");
    setPage(1);
  };

  const getStatusBadge = (
    status: ClaimStatus,
    issuesCount: number,
    hasVariance: boolean,
  ) => {
    if (status === "approved") {
      return (
        <Badge variant="success" className="text-[10px] gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    }
    if (status === "flagged" || hasVariance) {
      return (
        <Badge variant="warning" className="text-[10px] gap-1">
          <AlertTriangle className="h-3 w-3" />{" "}
          {hasVariance ? "Math Mismatch" : `${issuesCount} Flag(s)`}
        </Badge>
      );
    }
    if (status === "under_review") {
      return (
        <Badge variant="info" className="text-[10px] gap-1">
          <Clock className="h-3 w-3" /> Under Review
        </Badge>
      );
    }
    if (status === "extracted") {
      return (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Sparkles className="h-3 w-3" /> Extracted
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Claims Registry
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/40 text-primary"
            >
              DEMO SYNTHETIC DATA
            </Badge>
            <Badge variant={roleConfig.badgeVariant} className="text-[10px]">
              {roleConfig.badgeLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Search, filter, and audit itemized healthcare encounters. Navigate
            from claims list to readable encounter summary or deep extraction
            workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown
            claims={claims}
            filenamePrefix="billbridge_claims_registry"
            buttonText="Export Registry"
            size="sm"
          />
          <Button asChild size="sm">
            <Link to="/upload">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Upload Document
            </Link>
          </Button>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <Card variant="glass" className="border-border/80">
        <CardContent className="p-4 space-y-3">
          {/* Top row: Search input & Status filter pills */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search patient, provider, NPI, or claim #..."
                className="pl-9 h-9 text-xs"
                aria-label="Search claims"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
              {[
                { id: "all", label: "All Claims" },
                { id: "flagged", label: "Flagged" },
                { id: "under_review", label: "Under Review" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
                { id: "extracted", label: "Extracted" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.id as any);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                    statusFilter === st.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary row: Date range & Sorting controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px]">Date Range:</span>
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-xs w-32 font-mono"
                aria-label="Filter start date"
              />
              <span className="text-[11px]">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-xs w-32 font-mono"
                aria-label="Filter end date"
              />
              {(searchQuery ||
                statusFilter !== "all" ||
                startDate ||
                endDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Clear Filters
                </Button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-7 text-xs bg-background border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Sort claims"
              >
                <option value="statementDate">Statement Date</option>
                <option value="claimedTotal">Billed Amount</option>
                <option value="patientName">Patient Name</option>
                <option value="providerName">Provider</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="h-7 px-2 text-xs border border-input rounded-md hover:bg-muted font-mono"
                title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
              >
                {sortDirection === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CLAIMS DATA TABLE ── */}
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim & Statement</TableHead>
                <TableHead>Hospital Provider</TableHead>
                <TableHead>Patient Identification</TableHead>
                <TableHead className="text-right">Billed & Variance</TableHead>
                <TableHead className="text-center">Audit Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-28" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-20 ml-auto mb-1" />
                      <Skeleton className="h-3 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-5 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-7 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : loadError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 space-y-2"
                  >
                    <p className="text-xs text-destructive font-medium">
                      {loadError}
                    </p>
                    <Button size="sm" variant="outline" onClick={fetchClaims}>
                      Retry Loading
                    </Button>
                  </TableCell>
                </TableRow>
              ) : claims.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-14 space-y-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        No matching claims found
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {searchQuery ||
                        statusFilter !== "all" ||
                        startDate ||
                        endDate
                          ? "Try adjusting search terms, dates, or clearing your active filters."
                          : "Upload a synthetic medical bill to begin reconciliation."}
                      </p>
                    </div>
                    {searchQuery ||
                    statusFilter !== "all" ||
                    startDate ||
                    endDate ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetFilters}
                        className="text-xs"
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <Button asChild size="sm" className="text-xs">
                        <Link to="/upload">Upload First Document</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                claims.map((claim) => (
                  <TableRow
                    key={claim.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={(e) => {
                      // Don't trigger if clicked a button or link
                      const target = e.target as HTMLElement;
                      if (!target.closest("button") && !target.closest("a")) {
                        navigate(`/claims/${claim.id}`);
                      }
                    }}
                  >
                    {/* Column 1: Claim ID, Statement Date, DEMO badge */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/claims/${claim.id}`}
                          className="font-mono font-bold text-xs text-foreground hover:text-primary transition-colors"
                        >
                          {claim.claimNumber}
                        </Link>
                        {claim.isSyntheticDemo && (
                          <span className="text-[9px] font-mono uppercase bg-muted/90 px-1 py-0.2 rounded text-muted-foreground">
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

                    {/* Column 2: Provider & NPI */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs text-foreground truncate max-w-[200px]">
                          {claim.hospital.providerName.value ||
                            "Unknown Facility"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        NPI: {claim.hospital.npi.value || "—"}
                      </div>
                    </TableCell>

                    {/* Column 3: Patient & Account # */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {claim.patient.fullName.value || "Patient Record"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        ID: {claim.patient.id} • Acct:{" "}
                        {claim.patient.accountNumber.value || "—"}
                      </div>
                    </TableCell>

                    {/* Column 4: Billed Amount & Variance */}
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
                          Exact Parity
                        </div>
                      )}
                    </TableCell>

                    {/* Column 5: Status Badge */}
                    <TableCell className="text-center">
                      {getStatusBadge(
                        claim.status,
                        claim.issues.length,
                        claim.totals.hasVariance,
                      )}
                    </TableCell>

                    {/* Column 6: Action Buttons (Detail View & Review Workspace) */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          title="View Readable Encounter Summary"
                        >
                          <Link to={`/claims/${claim.id}`}>
                            <Eye className="h-3 w-3 mr-1" /> Details
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
                          title="Open Adjudication or Extraction Review Workspace"
                        >
                          <Link
                            to={
                              role === "insurer_reviewer"
                                ? `/queue/${claim.id}`
                                : `/review/${claim.id}`
                            }
                          >
                            {role === "insurer_reviewer"
                              ? "Adjudicate"
                              : role === "patient"
                                ? "Inspect"
                                : "Review"}{" "}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* ── PAGINATION CONTROLS ── */}
          {!isLoading && claims.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/80 text-xs text-muted-foreground">
              <div>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * pageSize, totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalCount}
                </span>{" "}
                claims encounters
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>

                <span className="font-mono text-xs px-2">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
