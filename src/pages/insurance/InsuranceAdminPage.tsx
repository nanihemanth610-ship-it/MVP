import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FileSearch,
  AlertTriangle,
  Gavel,
  Landmark,
  BarChart3,
  Users,
  Bell,
  History,
  Settings,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Send,
  FileCheck,
  FileX,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getDataAccess } from "@/services/data-access";
import { formatRupees } from "@/lib/utils";
import type { Claim, ClaimStatus, DecisionOutcome } from "@/types/contracts";
import { generateCsvExport, generateJsonExport, downloadBlob } from "@/services/export-service";

type InsuranceAdminTab =
  | "overview"
  | "incoming"
  | "queue"
  | "documents"
  | "audit"
  | "decisions"
  | "settlement"
  | "reports"
  | "staff"
  | "notifications"
  | "logs"
  | "settings";

interface InsurerStaffMember {
  id: string;
  name: string;
  email: string;
  designation: "Chief Claims Officer" | "Senior Adjudicator" | "Medical Officer" | "Settlement Officer";
  status: "Active" | "Away";
  approvalLimit: number;
}

const INITIAL_INSURER_STAFF: InsurerStaffMember[] = [
  {
    id: "ins-1",
    name: "Sunil Mehta",
    email: "claims.head@starhealth.in",
    designation: "Chief Claims Officer",
    status: "Active",
    approvalLimit: 1000000,
  },
  {
    id: "ins-2",
    name: "Kavita Nair",
    email: "kavita.nair@starhealth.in",
    designation: "Senior Adjudicator",
    status: "Active",
    approvalLimit: 250000,
  },
  {
    id: "ins-3",
    name: "Dr. Sandeep Kulkarni",
    email: "medical.officer@starhealth.in",
    designation: "Medical Officer",
    status: "Active",
    approvalLimit: 100000,
  },
  {
    id: "ins-4",
    name: "Rajiv Singhania",
    email: "settlement.desk@starhealth.in",
    designation: "Settlement Officer",
    status: "Active",
    approvalLimit: 500000,
  },
];

export function InsuranceAdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<InsuranceAdminTab>("overview");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [staffList, setStaffList] = useState<InsurerStaffMember[]>(INITIAL_INSURER_STAFF);

  // Active claim selected for detailed review screen
  const [adjudicatingClaim, setAdjudicatingClaim] = useState<Claim | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: "approve" | "reject" | "query" | "settle";
    title: string;
    description: string;
  } | null>(null);

  const PAYER_NAME = "Star Health & Allied Insurance Co.";
  const TPA_ORGANIZATION = "Medvantage TPA Services";

  useEffect(() => {
    async function loadClaims() {
      setLoading(true);
      try {
        const da = getDataAccess();
        const res = await da.getClaims({ page: 1, pageSize: 50 });
        setClaims(res.items);
      } catch (err) {
        console.warn("Failed loading claims for insurer panel:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, []);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const q = searchQuery.toLowerCase();
      const claimRef = c.claimRef || c.claimNumber;
      const patientName = c.patient.fullName.value || "";
      const providerName = c.hospital.providerName.value || "";
      const policyNumber = c.insurance?.policyNumber || "";

      return (
        claimRef.toLowerCase().includes(q) ||
        patientName.toLowerCase().includes(q) ||
        providerName.toLowerCase().includes(q) ||
        policyNumber.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      );
    });
  }, [claims, searchQuery]);

  // Dashboard 6 Metrics
  const metrics = useMemo(() => {
    const newlyReceived = claims.filter((c) => c.status === "extracted" || c.status === "draft").length;
    const awaitingReview = claims.filter((c) => c.status === "under_review").length;
    const requiringDocs = claims.filter((c) => c.status === "requires_information" || c.status === "flagged").length;
    const withDiscrepancies = claims.filter((c) => c.totals.variance !== 0).length;
    const decisionsRecorded = claims.filter((c) => c.status === "approved" || c.status === "rejected" || c.latestDecision).length;
    const settlementsPending = claims.filter((c) => c.status === "approved").length;
    const settledCount = claims.filter((c) => c.status === "settled").length;

    return {
      newlyReceived,
      awaitingReview,
      requiringDocs,
      withDiscrepancies,
      decisionsRecorded,
      settlementsPending,
      settledCount,
    };
  }, [claims]);

  // Execute confirmed consequential decision
  const handleExecuteConsequentialDecision = async () => {
    if (!showConfirmModal || !adjudicatingClaim) return;

    let targetOutcome: DecisionOutcome;
    let nextStatus: ClaimStatus;

    switch (showConfirmModal.action) {
      case "approve":
        targetOutcome = "approved";
        nextStatus = "approved";
        break;
      case "reject":
        targetOutcome = "rejected";
        nextStatus = "rejected";
        break;
      case "query":
        targetOutcome = "requires_information";
        nextStatus = "requires_information";
        break;
      case "settle":
        targetOutcome = "settled";
        nextStatus = "settled";
        break;
    }

    try {
      const da = getDataAccess();
      let updatedClaim: Claim;

      if (targetOutcome === "settled") {
        updatedClaim = await da.updateClaimStatus(
          adjudicatingClaim.id,
          "settled",
          "insurer_admin",
          reviewerNotes || "NEFT settlement banking transfer completed",
        );
      } else {
        updatedClaim = await da.recordDecision({
          claimId: adjudicatingClaim.id,
          outcome: targetOutcome,
          rationale: reviewerNotes || `Adjudication decision: ${targetOutcome.toUpperCase()}`,
          adjudicatorRole: "insurer_admin",
          adjudicatorName: "Sunil Mehta (Chief Claims Officer)",
        });
      }

      setClaims((prev) => prev.map((c) => (c.id === updatedClaim.id ? updatedClaim : c)));
      setAdjudicatingClaim(updatedClaim);
      toast({
        title: `Decision Recorded: ${nextStatus.toUpperCase()}`,
        description: `Claim ${updatedClaim.claimRef || updatedClaim.claimNumber} updated in secure ledger.`,
      });
    } catch (err) {
      toast({
        title: "Action Failed",
        description: err instanceof Error ? err.message : "Failed saving review decision to backend repository.",
        variant: "error",
      });
    } finally {
      setShowConfirmModal(null);
    }
  };

  const handleExportCsv = () => {
    try {
      const csv = generateCsvExport(claims, { userRole: "insurer_admin" });
      downloadBlob(csv, `StarHealth-Claims-Report-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
      toast({
        title: "Export Generated",
        description: `Exported ${claims.length} claims to secure sanitized CSV.`,
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV export.",
        variant: "error",
      });
    }
  };

  const handleExportJson = () => {
    try {
      const json = generateJsonExport(claims, { userRole: "insurer_admin" });
      downloadBlob(json, `StarHealth-Claims-Audit-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      toast({
        title: "JSON Export Generated",
        description: "Exported audit ledger with schema validation version 1.0.",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to generate JSON export.",
        variant: "error",
      });
    }
  };

  const handleToggleStaffStatus = (id: string) => {
    setStaffList((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === "Active" ? "Away" : "Active" } : m,
      ),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading Star Health TPA claims ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Payer / TPA Scope Header (Violet Theme) ── */}
      <div className="insurance-glass p-4 sm:p-6 rounded-2xl border border-violet-200/80 dark:border-violet-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-violet-600/15 text-violet-600 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Insurance & TPA Administration Panel
              </h1>
              <Badge variant="secondary" className="text-[10px] text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800">
                PAYER ADJUDICATION
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authorized Carrier: <strong className="text-foreground">{PAYER_NAME}</strong> • Third-Party Administrator: <span className="text-foreground font-medium">{TPA_ORGANIZATION}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("settlement")}
            className="text-xs h-9 gap-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
          >
            <Landmark className="h-3.5 w-3.5" />
            Settlements ({metrics.settlementsPending} Pending)
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (claims.length > 0) {
                setAdjudicatingClaim(claims[0]!);
                setReviewerNotes(claims[0]!.latestDecision?.rationale || "");
              }
            }}
            className="text-xs h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5 shadow-xs"
          >
            <Gavel className="h-3.5 w-3.5" />
            Adjudicate Next Claim
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Subnav + Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Insurance Admin Sidebar Menu (12 views) */}
        <div className="lg:col-span-1 insurance-glass rounded-xl p-3 border border-violet-200/60 dark:border-violet-900/40 space-y-1">
          <span className="text-[10px] font-bold text-violet-900/60 dark:text-violet-300/60 uppercase tracking-wider px-3 py-1.5 block">
            Adjudication Navigation
          </span>

          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "incoming", label: "Incoming Claims", icon: Inbox, badge: `${metrics.newlyReceived}` },
            { id: "queue", label: "Claims Review Queue", icon: CheckSquare, badge: `${metrics.awaitingReview}` },
            { id: "documents", label: "Document Verification", icon: FileSearch, badge: `${metrics.requiringDocs}` },
            { id: "audit", label: "Bill Audit Results", icon: AlertTriangle, badge: `${metrics.withDiscrepancies}` },
            { id: "decisions", label: "Decisions Recorded", icon: Gavel, badge: `${metrics.decisionsRecorded}` },
            { id: "settlement", label: "Settlement Tracking", icon: Landmark, badge: `${metrics.settlementsPending}` },
            { id: "reports", label: "Reports & Loss Ratios", icon: BarChart3 },
            { id: "staff", label: "Staff & Adjudicators", icon: Users },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "logs", label: "Audit Logs", icon: History },
            { id: "settings", label: "Insurance Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as InsuranceAdminTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-violet-600/15 text-violet-700 dark:text-violet-300 font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? "text-violet-600" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Dashboard 6 KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Newly Received Claims</span>
                    <CardTitle className="text-2xl font-bold font-mono text-blue-600">{metrics.newlyReceived}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Awaiting initial intake review
                  </CardContent>
                </Card>

                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Claims Awaiting Review</span>
                    <CardTitle className="text-2xl font-bold font-mono text-amber-600">{metrics.awaitingReview}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Medical & tariff scrutiny
                  </CardContent>
                </Card>

                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Requiring Additional Docs</span>
                    <CardTitle className="text-2xl font-bold font-mono text-orange-600">{metrics.requiringDocs}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Active queries sent to hospital
                  </CardContent>
                </Card>

                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Claims with Discrepancies</span>
                    <CardTitle className="text-2xl font-bold font-mono text-red-600">{metrics.withDiscrepancies}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Arithmetic / package variance
                  </CardContent>
                </Card>

                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Decisions Recorded</span>
                    <CardTitle className="text-2xl font-bold font-mono text-emerald-600">{metrics.decisionsRecorded}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Approved or denied claims
                  </CardContent>
                </Card>

                <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Settlements Pending</span>
                    <CardTitle className="text-2xl font-bold font-mono text-violet-600">{metrics.settlementsPending}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Approved awaiting NEFT disbursement
                  </CardContent>
                </Card>
              </div>

              {/* Incoming Claims Quick Table */}
              <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Claims Adjudication Queue</CardTitle>
                    <CardDescription className="text-xs">
                      Encounter dossiers assigned for Star Health TPA medical evaluation.
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Search claim, hospital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs text-xs h-8"
                  />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground text-left">
                          <th className="py-2.5 font-semibold">Claim Ref</th>
                          <th className="py-2.5 font-semibold">Hospital</th>
                          <th className="py-2.5 font-semibold">Patient</th>
                          <th className="py-2.5 font-semibold">Amount</th>
                          <th className="py-2.5 font-semibold">Audit Finding</th>
                          <th className="py-2.5 font-semibold">Status</th>
                          <th className="py-2.5 font-semibold text-right">Adjudicate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredClaims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 font-mono font-medium text-foreground">
                              {claim.claimRef || claim.claimNumber}
                            </td>
                            <td className="py-2.5 text-foreground">{claim.hospital.providerName.value || "Hospital Facility"}</td>
                            <td className="py-2.5 text-muted-foreground">{claim.patient.fullName.value || "Patient"}</td>
                            <td className="py-2.5 font-mono font-semibold">
                              {formatRupees(claim.totals.statedBilledTotal.value || 0)}
                            </td>
                            <td className="py-2.5">
                              {claim.totals.variance === 0 ? (
                                <span className="text-emerald-600 font-medium">Clean Tariff</span>
                              ) : (
                                <Badge variant="warning" className="text-[10px]">
                                  Math Variance ({formatRupees(claim.totals.variance)})
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5">
                              <Badge
                                variant={
                                  claim.status === "approved"
                                    ? "success"
                                    : claim.status === "settled"
                                    ? "teal"
                                    : claim.status === "requires_information"
                                    ? "warning"
                                    : "secondary"
                                }
                                className="text-[10px] capitalize"
                              >
                                {claim.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setAdjudicatingClaim(claim);
                                  setReviewerNotes(claim.latestDecision?.rationale || "");
                                }}
                                className="text-xs h-7 px-2.5 bg-violet-600 hover:bg-violet-700 text-white"
                              >
                                Adjudicate
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: INCOMING CLAIMS */}
          {activeTab === "incoming" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Incoming Claims Intake</CardTitle>
                <CardDescription className="text-xs">
                  New electronic submissions received from hospital billing desks across India.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims
                  .filter((c) => c.status === "extracted" || c.status === "draft" || c.status === "under_review")
                  .map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {claim.hospital.providerName.value}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {claim.insurance?.claimType || claim.claimType || "Cashless"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Patient: <strong className="text-foreground">{claim.patient.fullName.value}</strong> • Billed Total: <strong className="font-mono text-foreground">{formatRupees(claim.totals.statedBilledTotal.value || 0)}</strong>
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setAdjudicatingClaim(claim);
                          setReviewerNotes(claim.latestDecision?.rationale || "");
                        }}
                        className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        Begin Scrutiny
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: REVIEW QUEUE */}
          {activeTab === "queue" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Active Claims Adjudication Queue</CardTitle>
                <CardDescription className="text-xs">
                  Claims actively assigned for clinical evaluation, tariff benchmarking, and approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                        <Badge
                          variant={
                            claim.status === "approved"
                              ? "success"
                              : claim.status === "requires_information"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {claim.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">• {claim.hospital.providerName.value}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Patient: {claim.patient.fullName.value} • Billed: {formatRupees(claim.totals.statedBilledTotal.value || 0)} • Itemized Sum: {formatRupees(claim.totals.itemizedSumTotal)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setAdjudicatingClaim(claim);
                        setReviewerNotes(claim.latestDecision?.rationale || "");
                      }}
                      className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Open Reviewer Console
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: DOCUMENT VERIFICATION */}
          {activeTab === "documents" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Document Scrutiny & Verification</CardTitle>
                <CardDescription className="text-xs">
                  Scanned hospital bills, discharge summaries, and clinical evidence validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                        <span className="text-xs text-muted-foreground">({claim.hospital.providerName.value})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <FileCheck className="h-3 w-3" /> Itemized Scanned Bill
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600">
                          <FileCheck className="h-3 w-3" /> Discharge Summary
                        </span>
                        {claim.totals.variance !== 0 ? (
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <FileX className="h-3 w-3" /> Tariff Tariff Justification Missing
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <FileCheck className="h-3 w-3" /> Pharmacy Receipts
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjudicatingClaim(claim);
                        setShowConfirmModal({
                          action: "query",
                          title: `Request Documents: ${claim.claimRef || claim.claimNumber}`,
                          description: `Raise query for missing documents to ${claim.hospital.providerName.value}?`,
                        });
                      }}
                      className="text-xs h-7 border-amber-300 text-amber-700 dark:text-amber-300"
                    >
                      Query Docs
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: BILL AUDIT RESULTS */}
          {activeTab === "audit" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Bill Audit & Tariff Discrepancy Findings</CardTitle>
                <CardDescription className="text-xs">
                  Automated arithmetic cross-checks, tariff ceiling validations, and unbundled charges.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                        <Badge
                          variant={claim.totals.variance === 0 ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {claim.totals.variance === 0 ? "MATH RECONCILED" : `VARIANCE: ${formatRupees(claim.totals.variance)}`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Stated: <strong className="font-mono text-foreground">{formatRupees(claim.totals.statedBilledTotal.value || 0)}</strong> • Itemized Sum: <strong className="font-mono text-foreground">{formatRupees(claim.totals.itemizedSumTotal)}</strong> • Issues Flagged: <strong className="text-foreground">{claim.issues.length}</strong>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setAdjudicatingClaim(claim);
                        setReviewerNotes(claim.latestDecision?.rationale || "");
                      }}
                      className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Audit Details
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 6: DECISIONS RECORDED */}
          {activeTab === "decisions" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Formal Adjudication Decisions Log</CardTitle>
                <CardDescription className="text-xs">
                  History of approved, queried, and rejected encounters with verified rationale.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims
                  .filter((c) => c.status === "approved" || c.status === "rejected" || c.status === "requires_information" || c.status === "settled")
                  .map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                          <Badge
                            variant={
                              claim.status === "approved" || claim.status === "settled"
                                ? "success"
                                : claim.status === "rejected"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px] uppercase"
                          >
                            {claim.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">• {claim.hospital.providerName.value}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Amount: <span className="font-mono font-bold text-foreground">{formatRupees(claim.totals.statedBilledTotal.value || 0)}</span> • Adjudicator: Sunil Mehta (CCO)
                        </p>
                        {claim.latestDecision?.rationale && (
                          <p className="text-[10px] text-muted-foreground font-mono bg-muted/30 p-1 rounded mt-1">
                            Rationale: {claim.latestDecision.rationale}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjudicatingClaim(claim);
                          setReviewerNotes(claim.latestDecision?.rationale || "");
                        }}
                        className="text-xs h-7"
                      >
                        View Decision
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 7: SETTLEMENT TRACKING */}
          {activeTab === "settlement" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Settlement Pipeline (Post-Approval Banking)</CardTitle>
                    <CardDescription className="text-xs">
                      CRITICAL RULE: Approval is NOT Settlement. Track bank disbursement, NEFT/RTGS UTR numbers, and beneficiary transfers.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px] text-violet-700 dark:text-violet-300">
                    {metrics.settlementsPending} Pending Disbursement
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="p-3 rounded-lg border border-violet-300/80 bg-violet-50/60 dark:bg-violet-950/30 text-xs text-violet-900 dark:text-violet-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <Landmark className="h-4 w-4 text-violet-600" />
                    Banking Settlement Ledger
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Claims in "Approved" status require formal NEFT/RTGS banking reconciliation before transitioning to "Settled". Do not treat medical approval as funds transferred.
                  </p>
                </div>

                <div className="divide-y divide-border/60">
                  {claims
                    .filter((c) => c.status === "approved" || c.status === "settled")
                    .map((claim) => (
                      <div key={claim.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs">{claim.claimRef || claim.claimNumber}</span>
                            <Badge variant={claim.status === "settled" ? "teal" : "warning"} className="text-[10px]">
                              {claim.status === "settled" ? "FUNDS SETTLED (UTR ISSUED)" : "DISBURSEMENT PENDING"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• {claim.hospital.providerName.value}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Patient: <strong className="text-foreground">{claim.patient.fullName.value}</strong> • Approved Sum: <strong className="text-foreground font-mono">{formatRupees(claim.totals.statedBilledTotal.value || 0)}</strong>
                          </p>
                          {claim.status === "settled" && (
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
                              Bank Reference: NEFT-UTR-STAR-99281729 • Account: Apollo Hospitals Bengaluru HDFC-9821
                            </p>
                          )}
                        </div>

                        <div>
                          {claim.status === "approved" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setAdjudicatingClaim(claim);
                                setShowConfirmModal({
                                  action: "settle",
                                  title: `Execute Banking Settlement: ${claim.claimRef || claim.claimNumber}`,
                                  description: `Disburse ${formatRupees(claim.totals.statedBilledTotal.value || 0)} to ${claim.hospital.providerName.value} via Star Health Banking Gateway? This records transaction UTR and marks claim permanently settled.`,
                                });
                              }}
                              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Execute Settlement
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-teal border-teal/40">
                              Reconciled via NEFT
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 8: REPORTS & LOSS RATIOS */}
          {activeTab === "reports" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Actuarial Reports & Loss Ratio Analytics</CardTitle>
                  <CardDescription className="text-xs">
                    Download sanitized claim datasets and mathematical audit performance metrics.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportCsv} className="text-xs h-8 gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportJson} className="text-xs h-8 gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Export JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-card/60">
                    <span className="text-[10px] text-muted-foreground block">Incurred Claims Ratio (ICR)</span>
                    <span className="text-xl font-bold font-mono text-foreground">68.4%</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Healthy IRDAI tolerance (&lt;75%)</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/60">
                    <span className="text-[10px] text-muted-foreground block">Avg Adjudication Turnaround</span>
                    <span className="text-xl font-bold font-mono text-foreground">3.2 Hours</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Under 4.0 hr cashless mandate</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/60">
                    <span className="text-[10px] text-muted-foreground block">Bill Audit Savings Detected</span>
                    <span className="text-xl font-bold font-mono text-foreground">₹2,45,800</span>
                    <span className="text-[10px] text-violet-600 block mt-0.5">Via arithmetic variance engine</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 9: STAFF & ADJUDICATORS */}
          {activeTab === "staff" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">TPA Adjudication Officers & Approval Limits</CardTitle>
                <CardDescription className="text-xs">
                  Assigned medical officers, claims limits, and credentialed roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-left">
                        <th className="py-2.5 font-semibold">Officer Name</th>
                        <th className="py-2.5 font-semibold">Role</th>
                        <th className="py-2.5 font-semibold">Financial Approval Limit</th>
                        <th className="py-2.5 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {staffList.map((member) => (
                        <tr key={member.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5">
                            <span className="font-semibold text-foreground block">{member.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{member.email}</span>
                          </td>
                          <td className="py-2.5 font-medium">{member.designation}</td>
                          <td className="py-2.5 font-mono font-bold text-foreground">
                            {formatRupees(member.approvalLimit)}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member.id)}
                              className="cursor-pointer"
                              title="Click to toggle status"
                            >
                              <Badge
                                variant={member.status === "Active" ? "success" : "secondary"}
                                className="text-[10px]"
                              >
                                {member.status}
                              </Badge>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Insurer Real-Time Alerts</CardTitle>
                <CardDescription className="text-xs">
                  SLA warnings, high-value claim alerts, and duplicate submission flags.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">SLA Warning: Claim BB-DEMO-1002 Nearing 3-Hour Cashless Limit</span>
                    <span className="text-[11px] block mt-0.5">Submitted by Fortis Memorial Gurugram 2 hours 40 minutes ago. Requires medical officer signoff.</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <FileCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Clarification Received: Claim BB-DEMO-1004</span>
                    <span className="text-[11px] block mt-0.5">Apollo Hospitals Bengaluru attached updated pharmacy voucher for ₹1,200 itemized charge.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 11: AUDIT LOGS */}
          {activeTab === "logs" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Carrier Cryptographic Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Immutable record of every claim interaction, decision, and status mutation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {claims.flatMap((c) => c.auditLog).slice(0, 15).map((log, i) => (
                  <div key={log.id || i} className="p-2.5 rounded-lg border bg-card/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] font-mono">
                          {log.eventType}
                        </Badge>
                        <span className="font-medium text-foreground">{log.summary}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Actor: {log.actorName} ({log.actorRole})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 12: SETTINGS */}
          {activeTab === "settings" && (
            <Card className="insurance-glass border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Insurer Adjudication Rules & Schedules</CardTitle>
                <CardDescription className="text-xs">
                  Configure cashless turnaround times, auto-approval thresholds, and tariff benchmarks.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <span className="font-semibold block text-foreground">Cashless Auto-Approval Ceiling</span>
                    <span className="text-[11px] text-muted-foreground">Claims under this threshold with 0% math variance auto-adjudicate.</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">₹25,000</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <span className="font-semibold block text-foreground">IRDAI Cashless Adjudication Mandate</span>
                    <span className="text-[11px] text-muted-foreground">Mandatory maximum time allowed to decide cashless encounter.</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">4 Hours</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Consequential Claim Review Screen Modal ── */}
      {adjudicatingClaim && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="insurance-glass max-w-3xl w-full rounded-2xl p-6 shadow-2xl border border-violet-300 dark:border-violet-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">
                    Claim Adjudication: {adjudicatingClaim.claimRef || adjudicatingClaim.claimNumber}
                  </h3>
                  <Badge variant={adjudicatingClaim.insurance?.claimType === "Cashless" ? "teal" : "default"} className="text-[10px]">
                    {adjudicatingClaim.insurance?.claimType || adjudicatingClaim.claimType || "Cashless"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {adjudicatingClaim.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hospital: <strong className="text-foreground">{adjudicatingClaim.hospital.providerName.value}</strong> • Patient: <strong className="text-foreground">{adjudicatingClaim.patient.fullName.value}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAdjudicatingClaim(null)}
                className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/70 bg-card/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Submitted Claim Total</span>
                <span className="text-base font-bold font-mono text-foreground">
                  {formatRupees(adjudicatingClaim.totals.statedBilledTotal.value || 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Itemized Sum Total</span>
                <span className="text-base font-bold font-mono text-foreground">
                  {formatRupees(adjudicatingClaim.totals.itemizedSumTotal)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Arithmetic Variance</span>
                <span className={`text-base font-bold font-mono ${adjudicatingClaim.totals.variance === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {adjudicatingClaim.totals.variance === 0 ? "₹0.00 (Clean)" : formatRupees(adjudicatingClaim.totals.variance)}
                </span>
              </div>
            </div>

            {/* Extracted Bill Details & Discrepancies */}
            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1 text-xs">
              {adjudicatingClaim.totals.variance !== 0 && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Detected Arithmetic Variance: {formatRupees(adjudicatingClaim.totals.variance)}</span>
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    Stated total does not match line item mathematical sum. Requires hospital clarification or line deduction before settlement.
                  </p>
                </div>
              )}

              <div>
                <span className="font-semibold block mb-1 text-foreground">
                  Itemized Line Items ({adjudicatingClaim.lineItems.length}):
                </span>
                <div className="divide-y divide-border/60 border rounded-lg overflow-hidden">
                  {adjudicatingClaim.lineItems.map((li) => (
                    <div key={li.id} className="p-2.5 flex items-center justify-between text-[11px] bg-card/40">
                      <div>
                        <span className="font-medium text-foreground">{li.description.value}</span>
                        <span className="text-muted-foreground block text-[10px] font-mono">
                          Code: {li.code.value || "MISSING"} • Qty: {li.quantity.value} • Unit: {formatRupees(li.unitPrice.value || 0)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-foreground">{formatRupees(li.totalPrice.value || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer Notes Field */}
              <div className="pt-2">
                <label className="font-semibold block text-xs text-foreground mb-1">
                  Adjudication Notes & Clinical Rationale:
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Enter medical justification, requested documents, or approval condition..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border/80 bg-background text-foreground h-20 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjudicatingClaim(null)}
                className="text-xs h-9"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setShowConfirmModal({
                      action: "query",
                      title: `Raise Document Query: ${adjudicatingClaim.claimRef || adjudicatingClaim.claimNumber}`,
                      description: `Request additional medical records from ${adjudicatingClaim.hospital.providerName.value}? Status will change to 'Information Requested'.`,
                    })
                  }
                  className="text-xs h-9 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Request Additional Docs
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setShowConfirmModal({
                      action: "reject",
                      title: `Reject Claim: ${adjudicatingClaim.claimRef || adjudicatingClaim.claimNumber}`,
                      description: `Are you sure you want to reject this claim? This will issue a formal denial notice to ${adjudicatingClaim.patient.fullName.value}.`,
                    })
                  }
                  className="text-xs h-9 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reject Claim
                </Button>

                <Button
                  size="sm"
                  onClick={() =>
                    setShowConfirmModal({
                      action: "approve",
                      title: `Approve Claim: ${adjudicatingClaim.claimRef || adjudicatingClaim.claimNumber}`,
                      description: `Approve claim for ${formatRupees(adjudicatingClaim.totals.statedBilledTotal.value || 0)}? Note: This approves the claim for settlement; banking disbursement must be executed separately.`,
                    })
                  }
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve Claim
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Consequential Decision Confirmation Modal ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl border border-border/80 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600/15 text-violet-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{showConfirmModal.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Consequential Action Confirmation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {showConfirmModal.description}
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteConsequentialDecision}
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              >
                Confirm Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
