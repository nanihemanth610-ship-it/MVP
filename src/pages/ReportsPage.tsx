import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Building2,
  ShieldCheck,
  RefreshCw,
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
import { useToast } from "@/components/ui/toast";
import { getDataAccess } from "@/services/data-access";
import {
  generateCsvExport,
  generateJsonExport,
  downloadBlob,
} from "@/services/export-service";
import { formatRupees } from "@/lib/utils";
import type { Claim } from "@/types/contracts";

export function ReportsPage() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const dataAccess = getDataAccess();
      const res = await dataAccess.getClaims({ pageSize: 100 });
      setClaims(res.items);
    } catch (err) {
      console.error("Failed to load claims for reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBilled = claims.reduce(
    (sum, c) => sum + (c.totals.statedBilledTotal.value || 0),
    0,
  );
  const totalVariance = claims.reduce(
    (sum, c) => sum + Math.abs(c.totals.variance),
    0,
  );
  const approvedClaims = claims.filter((c) => c.status === "approved");
  const flaggedClaims = claims.filter((c) => c.status === "flagged");
  const underReviewClaims = claims.filter((c) => c.status === "under_review");

  const approvedSum = approvedClaims.reduce(
    (sum, c) => sum + (c.totals.statedBilledTotal.value || 0),
    0,
  );

  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      const csvData = generateCsvExport(claims);
      downloadBlob(
        csvData,
        `billbridge_claims_report_${Date.now()}.csv`,
        "text/csv;charset=utf-8;",
      );
      toast({
        title: "CSV Export Generated",
        description: `Exported ${claims.length} claims with escaped formula cells and sanitized headers.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description:
          err instanceof Error ? err.message : "Failed to compile CSV export.",
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    try {
      setIsExporting(true);
      const jsonData = generateJsonExport(claims);
      downloadBlob(
        jsonData,
        `billbridge_claims_schema_v1_${Date.now()}.json`,
        "application/json",
      );
      toast({
        title: "JSON Export Generated",
        description: `Exported schema-versioned audit payload (${claims.length} records).`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description:
          err instanceof Error
            ? err.message
            : "Failed to generate JSON export.",
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Analytics & Adjudication Reports
            </h1>
            <Badge variant="secondary" className="text-xs">
              DEMO METRICS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Financial reconciliation statistics, audit variance summaries, and
            regulatory exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={isExporting || loading || claims.length === 0}
            className="gap-1.5 text-xs font-medium"
          >
            <FileJson className="h-4 w-4 text-primary" />
            Export JSON (Schema v1)
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || loading || claims.length === 0}
            className="gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">
              Gross Invoiced Billed
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {formatRupees(totalBilled)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Across {claims.length} total hospital claims
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">
              Approved Payout Amount
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatRupees(approvedSum)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {approvedClaims.length} approved encounters
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">
              Audit Variance Detected
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatRupees(totalVariance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {flaggedClaims.length} flagged for tariff reconciliation
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">
              Queue Clearance Rate
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {claims.length > 0
                ? `${Math.round((approvedClaims.length / claims.length) * 100)}%`
                : "0%"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {underReviewClaims.length} remaining in triage queue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role-Specific Variance Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hospital Breakdown */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Hospital Provider Tariff Audit Summary
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Itemized discrepancies broken down by institutional provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {claim.hospital.providerName.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {claim.claimNumber} • {claim.patient.fullName.value}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium text-foreground">
                    {formatRupees(claim.totals.statedBilledTotal.value || 0)}
                  </p>
                  <Badge
                    variant={claim.totals.hasVariance ? "warning" : "success"}
                    className="text-[10px] mt-0.5"
                  >
                    {claim.totals.hasVariance
                      ? `Variance -${formatRupees(Math.abs(claim.totals.variance))}`
                      : "Clean 100%"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Standards Compliance */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Data Integrity & Export Governance
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Audit-grade CSV and JSON schema specifications enforced on all
              exports.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-xs leading-relaxed">
            <div className="p-3 rounded-lg bg-muted/40 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Formula Injection Protection
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Cells starting with =, +, -, @, or tab are safely escaped
                    with single quote prefixes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Indian Rupee & Unicode Encoding
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    UTF-8 BOM encoding ensures proper display of Indian Rupee
                    symbols (₹) and regional scripts in Excel and LibreOffice.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Single Source of Truth
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Exports dynamically derive from the identical repository
                    data queried by dashboard and registry.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleExportCsv}
              >
                Download Full Registry CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
