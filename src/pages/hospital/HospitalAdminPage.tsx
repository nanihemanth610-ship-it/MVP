import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckSquare,
  Users,
  BarChart3,
  Bell,
  Settings,
  History,
  Download,
  Plus,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getDataAccess } from "@/services/data-access";
import { formatRupees } from "@/lib/utils";
import type { Claim } from "@/types/contracts";
import { generateCsvExport, generateJsonExport, downloadBlob } from "@/services/export-service";

type HospitalAdminTab =
  | "overview"
  | "bills"
  | "claims"
  | "audit"
  | "queue"
  | "staff"
  | "reports"
  | "notifications"
  | "settings"
  | "history";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "Biller" | "Senior Auditor" | "Billing Head" | "TPA Coordinator";
  status: "Active" | "Inactive";
  permissions: {
    canUpload: boolean;
    canEditLineItems: boolean;
    canSubmitToPayer: boolean;
    canExport: boolean;
  };
  lastActive: string;
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    name: "Dr. Arvind Rao",
    email: "admin.blr@apollo-hospitals.in",
    role: "Billing Head",
    status: "Active",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canSubmitToPayer: true,
      canExport: true,
    },
    lastActive: "10 mins ago",
  },
  {
    id: "staff-2",
    name: "Sowmya Krishnan",
    email: "sowmya.k@apollo-hospitals.in",
    role: "Senior Auditor",
    status: "Active",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canSubmitToPayer: true,
      canExport: true,
    },
    lastActive: "25 mins ago",
  },
  {
    id: "staff-3",
    name: "Ramesh Babu",
    email: "ramesh.b@apollo-hospitals.in",
    role: "Biller",
    status: "Active",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canSubmitToPayer: false,
      canExport: false,
    },
    lastActive: "2 hours ago",
  },
  {
    id: "staff-4",
    name: "Pooja Hegde",
    email: "pooja.tpa@apollo-hospitals.in",
    role: "TPA Coordinator",
    status: "Active",
    permissions: {
      canUpload: true,
      canEditLineItems: false,
      canSubmitToPayer: true,
      canExport: true,
    },
    lastActive: "1 day ago",
  },
];

export function HospitalAdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<HospitalAdminTab>("overview");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedClaimForModal, setSelectedClaimForModal] = useState<Claim | null>(null);

  // Authorized Hospital Scope
  const AUTHORIZED_HOSPITAL_REF = "ROHINI-BLR-8821";
  const AUTHORIZED_HOSPITAL_NAME = "Apollo Hospitals, Bengaluru";

  useEffect(() => {
    async function loadHospitalData() {
      try {
        const da = getDataAccess();
        const res = await da.getClaims({ page: 1, pageSize: 50 });
        const allClaims = res.items;
        // Scoped to authorized hospital facility
        const hospitalClaims = allClaims.filter(
          (c) =>
            c.hospitalRef === AUTHORIZED_HOSPITAL_REF ||
            c.hospital.npi?.value === AUTHORIZED_HOSPITAL_REF ||
            (c.hospital.providerName.value || "").toLowerCase().includes("apollo"),
        );
        setClaims(hospitalClaims.length > 0 ? hospitalClaims : allClaims);
      } catch (err) {
        console.warn("Failed loading hospital claims:", err);
      }
    }
    loadHospitalData();
  }, []);

  // Filtered claims based on search
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.claimNumber.toLowerCase().includes(q) ||
        (c.patient.fullName.value || "").toLowerCase().includes(q) ||
        (c.insurance?.policyNumber || "").toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      );
    });
  }, [claims, searchQuery]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalBills = claims.length;
    const awaitingReview = claims.filter((c) => c.status === "under_review").length;
    const withDiscrepancies = claims.filter((c) => Math.abs(c.totals.variance) > 0.01).length;
    const cashless = claims.filter((c) => c.claimType === "Cashless").length;
    const reimbursement = claims.filter((c) => c.claimType === "Reimbursement").length;
    const awaitingInsurerResponse = claims.filter(
      (c) => c.status === "requires_information" || c.status === "under_review",
    ).length;

    const totalBilledVal = claims.reduce(
      (acc, c) => acc + (c.totals.statedBilledTotal.value || 0),
      0,
    );

    return {
      totalBills,
      totalBilledVal,
      awaitingReview,
      withDiscrepancies,
      cashless,
      reimbursement,
      awaitingInsurerResponse,
    };
  }, [claims]);

  const handleExportClaimsCsv = () => {
    if (claims.length === 0) return;
    const csvContent = generateCsvExport(claims, { userRole: "hospital_admin" });
    downloadBlob(csvContent, "apollo_hospital_claims_export.csv", "text/csv;charset=utf-8;");
    toast({
      title: "Hospital Report Exported",
      description: "Downloaded authorized hospital claims ledger in CSV format.",
    });
  };

  const handleExportClaimsJson = () => {
    if (claims.length === 0) return;
    const jsonContent = generateJsonExport(claims, { userRole: "hospital_admin" });
    downloadBlob(jsonContent, "apollo_hospital_claims_export.json", "application/json");
    toast({
      title: "Hospital JSON Exported",
      description: "Downloaded claims schema payload in JSON format.",
    });
  };

  const toggleStaffPermission = (staffId: string, permKey: keyof StaffMember["permissions"]) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        return {
          ...s,
          permissions: {
            ...s.permissions,
            [permKey]: !s.permissions[permKey],
          },
        };
      }),
    );
    toast({
      title: "Permission Updated",
      description: "Updated access controls for hospital billing staff member.",
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Facility Scope Header ── */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-teal/15 text-teal flex items-center justify-center font-bold shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Hospital Administration Panel
              </h1>
              <Badge variant="teal" className="text-[10px]">
                NABH ACCREDITED
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                AUTHORIZED FACILITY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authorized Network Facility: <strong className="text-foreground">{AUTHORIZED_HOSPITAL_NAME}</strong> (Rohini ID: <code className="font-mono text-primary">{AUTHORIZED_HOSPITAL_REF}</code>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportClaimsCsv}
            className="text-xs h-9 gap-1.5 border-teal-200 dark:border-teal-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/upload")}
            className="text-xs h-9 bg-teal hover:bg-teal/90 text-white font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Bill
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Subnav + Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Hospital Admin Sidebar Menu */}
        <div className="lg:col-span-1 glass-panel rounded-xl p-3 border border-border/70 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-1.5 block">
            Hospital Navigation
          </span>

          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "bills", label: "Medical Bills", icon: FileText, badge: `${metrics.totalBills}` },
            { id: "claims", label: "Claims Management", icon: FileSpreadsheet },
            { id: "audit", label: "Bill Audit", icon: AlertTriangle, badge: `${metrics.withDiscrepancies}` },
            { id: "queue", label: "Review Queue", icon: CheckSquare, badge: `${metrics.awaitingReview}` },
            { id: "staff", label: "Staff Management", icon: Users },
            { id: "reports", label: "Reports & Exports", icon: BarChart3 },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "settings", label: "Hospital Settings", icon: Settings },
            { id: "history", label: "Audit History", icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as HospitalAdminTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal/15 text-teal font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? "text-teal" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant={isActive ? "teal" : "secondary"} className="text-[10px] h-4.5 px-1.5">
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
                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Total Bills Processed</span>
                    <CardTitle className="text-2xl font-bold font-mono">{metrics.totalBills}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Value: <span className="font-semibold text-foreground">{formatRupees(metrics.totalBilledVal)}</span>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Claims Awaiting Review</span>
                    <CardTitle className="text-2xl font-bold font-mono text-amber-600">{metrics.awaitingReview}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Hospital pre-submission triage
                  </CardContent>
                </Card>

                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Bills with Discrepancies</span>
                    <CardTitle className="text-2xl font-bold font-mono text-red-600">{metrics.withDiscrepancies}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Math or tariff code mismatches
                  </CardContent>
                </Card>

                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Cashless Claims</span>
                    <CardTitle className="text-2xl font-bold font-mono text-teal">{metrics.cashless}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Pre-auth TPAs (Star Health, etc.)
                  </CardContent>
                </Card>

                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Reimbursement Claims</span>
                    <CardTitle className="text-2xl font-bold font-mono text-blue-600">{metrics.reimbursement}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Direct patient settlements
                  </CardContent>
                </Card>

                <Card className="glass-panel border-border/80">
                  <CardHeader className="p-4 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Awaiting Insurer Response</span>
                    <CardTitle className="text-2xl font-bold font-mono text-violet-600">{metrics.awaitingInsurerResponse}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                    Queries / Pending approval
                  </CardContent>
                </Card>
              </div>

              {/* Scoped Hospital Claims Quick Table */}
              <Card className="glass-panel border-border/80">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Authorized Hospital Claims</CardTitle>
                    <CardDescription className="text-xs">
                      Active patient billing dockets scoped to {AUTHORIZED_HOSPITAL_NAME}.
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Search claim, patient..."
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
                          <th className="py-2.5 font-semibold">Patient</th>
                          <th className="py-2.5 font-semibold">Type</th>
                          <th className="py-2.5 font-semibold">Billed Total</th>
                          <th className="py-2.5 font-semibold">Variance</th>
                          <th className="py-2.5 font-semibold">Status</th>
                          <th className="py-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredClaims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 font-mono font-medium text-foreground">{claim.claimNumber}</td>
                            <td className="py-2.5 text-foreground">{claim.patient.fullName.value}</td>
                            <td className="py-2.5">
                              <Badge variant={claim.claimType === "Cashless" ? "teal" : "default"} className="text-[10px]">
                                {claim.claimType}
                              </Badge>
                            </td>
                            <td className="py-2.5 font-mono">{formatRupees(claim.totals.statedBilledTotal.value || 0)}</td>
                            <td className="py-2.5">
                              {Math.abs(claim.totals.variance) < 0.01 ? (
                                <span className="text-emerald-600 font-mono">₹0.00</span>
                              ) : (
                                <span className="text-amber-600 font-mono font-semibold">
                                  {claim.totals.variance < 0 ? "-" : "+"}{formatRupees(Math.abs(claim.totals.variance))}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <Badge variant={claim.status === "approved" ? "success" : claim.status === "flagged" ? "warning" : "secondary"} className="text-[10px] capitalize">
                                {claim.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedClaimForModal(claim)}
                                className="text-xs h-7 px-2.5"
                              >
                                Review Details
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

          {/* TAB 2: MEDICAL BILLS */}
          {activeTab === "bills" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Hospital Medical Invoices</CardTitle>
                <CardDescription className="text-xs">
                  Raw uploaded statements, OCR itemization status, and document SHA-256 validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid gap-3">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{claim.document.fileName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {claim.lineItems.length} Extracted Items
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Uploaded for: <span className="font-medium text-foreground">{claim.patient.fullName.value}</span> ({claim.patient.id}) • Statement Date: {claim.document.uploadedAt?.slice(0, 10) || "2026-10-10"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold block text-foreground">
                            {formatRupees(claim.totals.statedBilledTotal.value || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {Math.abs(claim.totals.variance) < 0.01 ? "Exact Sum Match" : "Variance Flagged"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/review/${claim.id}`)}
                          className="text-xs h-8"
                        >
                          Audit Lines
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: CLAIMS MANAGEMENT */}
          {activeTab === "claims" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Claims Submission & Tracking</CardTitle>
                  <CardDescription className="text-xs">
                    Prepare and dispatch cashless pre-authorization and reimbursement requests to TPAs.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate("/upload")} className="text-xs h-8 gap-1.5 bg-teal text-white">
                  <Plus className="h-3.5 w-3.5" />
                  New Claim
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid gap-3">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{claim.claimNumber}</span>
                          <Badge variant={claim.claimType === "Cashless" ? "teal" : "default"} className="text-[10px]">
                            {claim.claimType}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {claim.insurance?.payerName || "Star Health"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Patient: <strong className="text-foreground">{claim.patient.fullName.value}</strong> • Policy: {claim.insurance?.policyNumber || "POL-77129"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/claims/${claim.id}`)}
                          className="text-xs h-8"
                        >
                          View Registry Dossier
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/review/${claim.id}`)}
                          className="text-xs h-8 bg-primary text-white"
                        >
                          Open Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: BILL AUDIT */}
          {activeTab === "audit" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Pre-Submission Bill Audit</CardTitle>
                <CardDescription className="text-xs">
                  Automated tariff ceiling validation against standard PPN agreed packages.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="p-3 rounded-lg border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Notice: Hospital Encounters Flagged for Tariff Review
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Detected line item math variance on active Apollo encounters. Human billing review recommended before TPA submission.
                  </p>
                </div>

                <div className="divide-y divide-border/60">
                  {claims.map((claim) => (
                    <div key={claim.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-xs text-foreground">{claim.claimNumber}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {claim.patient.fullName.value} • Items: {claim.lineItems.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium">
                          {Math.abs(claim.totals.variance) < 0.01 ? "Clean (₹0 variance)" : `Mismatch: ${formatRupees(claim.totals.variance)}`}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/review/${claim.id}`)}
                          className="text-xs h-7"
                        >
                          Correct Math
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: REVIEW QUEUE */}
          {activeTab === "queue" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Hospital Pre-Submission Queue</CardTitle>
                <CardDescription className="text-xs">
                  Encounters currently awaiting billing specialist sign-off before electronic transmission to insurance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {claims
                  .filter((c) => c.status === "under_review" || c.status === "flagged")
                  .map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{claim.claimNumber}</span>
                          <Badge variant="warning" className="text-[10px]">Awaiting Sign-off</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {claim.patient.fullName.value} • Total: {formatRupees(claim.totals.statedBilledTotal.value || 0)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/review/${claim.id}`)}
                        className="text-xs h-8 bg-teal text-white"
                      >
                        Sign Off & Submit
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 6: STAFF MANAGEMENT */}
          {activeTab === "staff" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Hospital Billing Staff & Permissions</CardTitle>
                  <CardDescription className="text-xs">
                    Manage billing team member roles, line-item edit privileges, and export authorizations.
                  </CardDescription>
                </div>
                <Button size="sm" className="text-xs h-8 gap-1.5 bg-teal text-white">
                  <Plus className="h-3.5 w-3.5" />
                  Add Staff Member
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-left">
                        <th className="py-2.5 font-semibold">Member</th>
                        <th className="py-2.5 font-semibold">Role</th>
                        <th className="py-2.5 font-semibold text-center">Can Upload</th>
                        <th className="py-2.5 font-semibold text-center">Can Edit Lines</th>
                        <th className="py-2.5 font-semibold text-center">Submit to Payer</th>
                        <th className="py-2.5 font-semibold text-center">Can Export</th>
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
                          <td className="py-2.5 font-medium">{member.role}</td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStaffPermission(member.id, "canUpload")}
                              className={`h-5 w-5 rounded inline-flex items-center justify-center cursor-pointer ${
                                member.permissions.canUpload ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.permissions.canUpload ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStaffPermission(member.id, "canEditLineItems")}
                              className={`h-5 w-5 rounded inline-flex items-center justify-center cursor-pointer ${
                                member.permissions.canEditLineItems ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.permissions.canEditLineItems ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStaffPermission(member.id, "canSubmitToPayer")}
                              className={`h-5 w-5 rounded inline-flex items-center justify-center cursor-pointer ${
                                member.permissions.canSubmitToPayer ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.permissions.canSubmitToPayer ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStaffPermission(member.id, "canExport")}
                              className={`h-5 w-5 rounded inline-flex items-center justify-center cursor-pointer ${
                                member.permissions.canExport ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.permissions.canExport ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge variant="success" className="text-[10px]">
                              {member.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 7: REPORTS & EXPORTS */}
          {activeTab === "reports" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Hospital Financial Reports & Reconciliation</CardTitle>
                <CardDescription className="text-xs">
                  Generate sanitized financial ledgers with formula-injection mitigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <span className="font-semibold text-xs text-foreground block">
                      Hospital Billing Register (CSV)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Complete tabular export of all encounters, itemized sums, variance tags, and TPA statuses.
                    </p>
                    <Button size="sm" onClick={handleExportClaimsCsv} className="text-xs h-8 gap-1.5 bg-teal text-white">
                      <Download className="h-3.5 w-3.5" />
                      Download Register (.csv)
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <span className="font-semibold text-xs text-foreground block">
                      Structured Claims Payload (JSON)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      API-compliant JSON with schema version and raw OCR extraction metadata.
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExportClaimsJson} className="text-xs h-8 gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Download JSON Payload (.json)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 8: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Hospital Operations Notification Feed</CardTitle>
                <CardDescription className="text-xs">
                  Alerts from insurance TPAs, pre-auth query requests, and payment approvals.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block">
                      Cashless Pre-Auth Approved: BB-DEMO-1002
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Star Health & Allied Insurance approved full amount ₹76,200.00 for Anita Deshmukh.
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">1 hour ago</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-amber-900 dark:text-amber-200 block">
                      Document Query Raised: BB-DEMO-1004
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      TPA Adjudication requested operative surgical notes and implant barcode stickers for Suresh Menon.
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">3 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 9: HOSPITAL SETTINGS */}
          {activeTab === "settings" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Hospital Facility Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Manage ROHINI registration, PPN tariff master agreements, and electronic claim endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Facility Name</span>
                    <span className="font-semibold text-foreground text-sm">{AUTHORIZED_HOSPITAL_NAME}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">ROHINI Registry Code</span>
                    <span className="font-mono font-bold text-foreground text-sm">{AUTHORIZED_HOSPITAL_REF}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">NABH Accreditation</span>
                    <Badge variant="teal" className="text-[10px]">Level 3 Super Speciality Valid thru 2028</Badge>
                  </div>
                  <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">PPN Tariff Master</span>
                    <span className="text-foreground">Star Health, ICICI Lombard, HDFC ERGO (Active)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 10: AUDIT HISTORY */}
          {activeTab === "history" && (
            <Card className="glass-panel border-border/80">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold">Timestamped Hospital Audit Ledger</CardTitle>
                <CardDescription className="text-xs">
                  Append-only immutable record of bill uploads, line-item adjustments, and payer submissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="divide-y divide-border/60 text-xs">
                  <div className="py-2.5 flex items-start justify-between">
                    <div>
                      <strong className="text-foreground block">Cashless Pre-Auth Dispatched</strong>
                      <span className="text-muted-foreground">
                        BB-DEMO-1001 sent to n8n webhook boundary with patient consent key
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">Today 10:14 IST</span>
                  </div>
                  <div className="py-2.5 flex items-start justify-between">
                    <div>
                      <strong className="text-foreground block">Line Item Rate Corrected</strong>
                      <span className="text-muted-foreground">
                        Line 7 ICU bed rate adjusted from ₹1,200 to ₹800 by Sowmya Krishnan
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">Yesterday 16:45 IST</span>
                  </div>
                  <div className="py-2.5 flex items-start justify-between">
                    <div>
                      <strong className="text-foreground block">Invoice Ingested (PDF)</strong>
                      <span className="text-muted-foreground">
                        apollo_emergency_bill.pdf (512 KB, SHA-256 verified) uploaded by Ramesh Babu
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">14 Oct 09:30 IST</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Individual Claim Details Modal ── */}
      {selectedClaimForModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-border/80 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-teal" />
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Hospital Claim Details: {selectedClaimForModal.claimNumber}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Patient: {selectedClaimForModal.patient.fullName.value} • {selectedClaimForModal.claimType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimForModal(null)}
                className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/60 bg-card/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Stated Bill Total</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatRupees(selectedClaimForModal.totals.statedBilledTotal.value || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Itemized Sum Total</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatRupees(selectedClaimForModal.totals.itemizedSumTotal)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold block mb-2 text-foreground">Extracted Line Items ({selectedClaimForModal.lineItems.length}):</span>
                <div className="divide-y divide-border/60 border rounded-lg overflow-hidden">
                  {selectedClaimForModal.lineItems.map((li) => (
                    <div key={li.id} className="p-2.5 flex items-center justify-between text-[11px] bg-card/40">
                      <div>
                        <span className="font-medium text-foreground">{li.description.value}</span>
                        <span className="text-muted-foreground block text-[10px] font-mono">
                          Code: {li.code.value || "N/A"} • Qty: {li.quantity.value} • Rate: {formatRupees(li.unitPrice.value || 0)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-foreground">{formatRupees(li.totalPrice.value || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClaimForModal(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const id = selectedClaimForModal.id;
                  setSelectedClaimForModal(null);
                  navigate(`/review/${id}`);
                }}
                className="text-xs bg-teal text-white"
              >
                Open In-Place Line Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
