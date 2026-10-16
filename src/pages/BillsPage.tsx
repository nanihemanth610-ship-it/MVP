import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Building2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import { formatRupees } from "@/lib/utils";
import type { Claim } from "@/types/contracts";

export function BillsPage() {
  const { role } = useRole();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadBills = async () => {
    setLoading(true);
    try {
      const dataAccess = getDataAccess();
      const res = await dataAccess.getClaims({ pageSize: 50 });
      setClaims(res.items);
    } catch (err) {
      console.error("Failed to load medical bills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const filteredBills = claims.filter((claim) => {
    const matchesSearch =
      claim.hospital.providerName.value
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      claim.patient.fullName.value
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.document.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "discrepant" && claim.totals.hasVariance) ||
      (statusFilter === "clean" && !claim.totals.hasVariance);

    return matchesSearch && matchesStatus;
  });

  const totalBilledValue = claims.reduce(
    (sum, c) => sum + (c.totals.statedBilledTotal.value || 0),
    0,
  );
  const discrepantCount = claims.filter((c) => c.totals.hasVariance).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Medical Bills & Statements
            </h1>
            <Badge variant="secondary" className="text-xs">
              DEMO DATASET
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ingested hospital statements, OCR line item status, and arithmetic
            reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBills}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {(role === "hospital_staff" || role === "patient") && (
            <Button
              size="sm"
              onClick={() => navigate("/upload")}
              className="gap-1.5 text-xs font-semibold"
            >
              <UploadCloud className="h-4 w-4" />
              Upload New Bill
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Ingested Bills
              </p>
              <p className="text-xl font-bold text-foreground">
                {claims.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Invoiced Amount
              </p>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatRupees(totalBilledValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Arithmetic Discrepancies
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {discrepantCount} Statements
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by hospital, patient, file name, or claim #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs h-8"
          >
            All Statements
          </Button>
          <Button
            variant={statusFilter === "discrepant" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("discrepant")}
            className="text-xs h-8 gap-1.5"
          >
            <AlertTriangle className="h-3 w-3" />
            Discrepant Only
          </Button>
          <Button
            variant={statusFilter === "clean" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("clean")}
            className="text-xs h-8 gap-1.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            100% Clean
          </Button>
        </div>
      </div>

      {/* Bills Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
          Loading medical statements...
        </div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">
            No Medical Bills Found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Try adjusting your search query or upload a new statement.
          </p>
          {(role === "hospital_staff" || role === "patient") && (
            <Button size="sm" onClick={() => navigate("/upload")}>
              Upload Bill
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBills.map((claim) => {
            const hasMathMismatch = claim.totals.hasVariance;
            return (
              <Card
                key={claim.id}
                className="flex flex-col justify-between border-border/80 hover:border-primary/50 transition-all hover:shadow-sm"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={hasMathMismatch ? "warning" : "success"}
                      className="text-[10px]"
                    >
                      {hasMathMismatch
                        ? `Variance: -${formatRupees(Math.abs(claim.totals.variance))}`
                        : "100% Math Reconciled"}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {claim.claimNumber}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground truncate">
                    {claim.hospital.providerName.value || "Unknown Hospital"}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">
                    Patient: {claim.patient.fullName.value} ({claim.patient.id})
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="p-2.5 rounded-md bg-muted/40 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Stated Total:
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatRupees(
                          claim.totals.statedBilledTotal.value || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Itemized Sum:
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatRupees(claim.totals.itemizedSumTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tariff Line Items:
                      </span>
                      <span className="font-medium text-foreground">
                        {claim.lineItems.length} lines
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="truncate flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {claim.document.fileName}
                    </span>
                    <span className="font-mono">
                      {new Date(claim.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => navigate(`/review/${claim.id}`)}
                    >
                      Audit Workspace
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-8 px-2.5"
                      onClick={() => navigate(`/claims/${claim.id}`)}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
