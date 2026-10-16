import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  User,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Lock,
  Clock,
  HelpCircle,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";
import { formatRupees } from "@/lib/utils";

export function LandingPage() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const { loginDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<"clean" | "discrepancy">("discrepancy");
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  const handleSelectRole = async (targetRole: any, targetPath: string) => {
    await loginDemo(targetRole);
    setRole(targetRole);
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#workspaces" className="hover:text-foreground transition-colors">
              Workspaces
            </a>
            <a href="#preview" className="hover:text-foreground transition-colors">
              Live Audit Preview
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#compliance" className="hover:text-foreground transition-colors">
              Compliance & Safety
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectRole("hospital_staff", "/dashboard")}
              className="text-xs h-9 font-medium"
            >
              Explore Demo
            </Button>
            <Button
              size="sm"
              onClick={() => handleSelectRole("hospital_admin", "/hospital/admin")}
              className="text-xs h-9 bg-primary text-primary-foreground font-semibold shadow-xs"
            >
              Open Hospital Admin
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/50">
        {/* Soft Ice-Blue Ambient Gradient Blobs */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-200/40 dark:bg-sky-900/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-32 w-[30rem] h-[30rem] rounded-full bg-teal-100/40 dark:bg-teal-900/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-violet-100/30 dark:bg-violet-900/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-200/80 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 text-xs font-semibold text-primary backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-teal" />
              <span>BillBridge — Healthcare Finance</span>
              <span className="w-1 h-1 rounded-full bg-sky-400" />
              <span className="text-muted-foreground font-normal">Hospital Bill & Insurance Reader</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Medical bills, <span className="bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">made clear.</span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
              Audit medical bills, identify discrepancies, and manage insurance claims from submission to settlement in one place.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => {
                  const previewEl = document.getElementById("preview");
                  previewEl?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-11 px-6 font-semibold shadow-md bg-primary hover:bg-primary/95 text-primary-foreground gap-2"
              >
                Explore Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowHowItWorksModal(true)}
                className="h-11 px-6 font-medium gap-2 border-border/80 hover:bg-muted/50"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                How It Works
              </Button>
            </div>

            {/* Trust Pill Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                NABH & Rohini Facility Catalog
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Indian Rupee (₹) & PPN Tariff Engine
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero PHI Console Telemetry
              </span>
            </div>
          </div>

          {/* ── Realistic Medical Bill & Claim-Status Preview ── */}
          <div id="preview" className="mt-14 max-w-5xl mx-auto scroll-mt-24">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 neumorphic-subtle border border-sky-100 dark:border-sky-900/60 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Apollo Hospitals, Bengaluru</span>
                      <Badge variant="secondary" className="text-[10px]">ROHINI-BLR-8821</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Encounter Ref: <span className="font-mono text-foreground font-medium">BB-DEMO-1001</span> • Patient: <span className="font-medium text-foreground">Rajesh Sharma</span> • Cashless Pre-Auth
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("discrepancy")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "discrepancy"
                        ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Math Variance (-₹1,500)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("clean")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "clean"
                        ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Clean Bill (100% Match)
                  </button>
                </div>
              </div>

              {/* Financial Audit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-xl border border-border/70 bg-card/60">
                  <span className="text-xs text-muted-foreground font-medium">Stated Bill Header Total</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                    {activeTab === "discrepancy" ? formatRupees(48500) : formatRupees(76200)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Printed on physical hospital invoice</span>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card/60">
                  <span className="text-xs text-muted-foreground font-medium">Extracted Itemized Sum</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                    {activeTab === "discrepancy" ? formatRupees(50000) : formatRupees(76200)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Calculated deterministically from line items</span>
                </div>

                <div className={`p-4 rounded-xl border ${
                  activeTab === "discrepancy"
                    ? "border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                    : "border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Audit Reconciliation</span>
                    <Badge variant={activeTab === "discrepancy" ? "warning" : "success"} className="text-[10px]">
                      {activeTab === "discrepancy" ? "MISMATCH DETECTED" : "100% RECONCILED"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono mt-1">
                    {activeTab === "discrepancy" ? "-₹1,500.00" : "₹0.00"}
                  </div>
                  <span className="text-[11px] leading-tight block">
                    {activeTab === "discrepancy"
                      ? "Calculation error on Line 7: Rate × Quantity variance requires review"
                      : "Zero discrepancy. Matches Star Health PPN package tariff ceiling"}
                  </span>
                </div>
              </div>

              {/* Claim Status Pipeline Stepper */}
              <div className="pt-4 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-3">
                  Live Claim Lifecycle Progress
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      1. Ingested
                    </div>
                    <span className="text-[10px] text-muted-foreground">PDF parsed & hashed</span>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      2. OCR Extracted
                    </div>
                    <span className="text-[10px] text-muted-foreground">8 line items isolated</span>
                  </div>

                  <div className={`p-3 rounded-lg border text-xs ${
                    activeTab === "discrepancy"
                      ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30"
                      : "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                  }`}>
                    <div className={`flex items-center gap-1.5 font-semibold mb-1 ${
                      activeTab === "discrepancy" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {activeTab === "discrepancy" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      3. Tariff Audited
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {activeTab === "discrepancy" ? "Discrepancy flagged" : "Rates approved"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/80 bg-card/60 text-xs">
                    <div className="flex items-center gap-1.5 text-primary font-semibold mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      4. Payer Review
                    </div>
                    <span className="text-[10px] text-muted-foreground">Star Health TPA desk</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/80 bg-card/60 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold mb-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      5. Settlement
                    </div>
                    <span className="text-[10px] text-muted-foreground">NEFT Disbursement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Prominent Role-Selection Cards ── */}
      <section id="workspaces" className="py-16 md:py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <Badge variant="teal" className="text-xs px-3 py-1">
              Select Your Role Workspace
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Purpose-built environments for every stakeholder
            </h2>
            <p className="text-sm text-muted-foreground">
              Experience the end-to-end claim reconciliation workflow from the perspective of patients, hospital billing administrators, and insurance claim adjudicators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Patient Workspace */}
            <Card className="glass-panel border border-sky-100 dark:border-sky-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <User className="h-6 w-6" />
                  </div>
                  <Badge variant="info" className="text-[10px] font-semibold">
                    PATIENT PORTAL
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">Patient Workspace</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Understand your hospital bills, out-of-pocket costs, and real-time claim status in plain language.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Upload medical bills from camera or PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>View extracted bill details and line item breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Track submitted claims in real time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>View claim history and status updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>See explanations for flagged items in clear words</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-border/60">
                  <Button
                    onClick={() => handleSelectRole("patient", "/dashboard")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 gap-2"
                  >
                    Open Patient Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Hospital Workspace */}
            <Card className="hospital-glass border border-teal-200/80 dark:border-teal-900/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-12 w-12 rounded-xl bg-teal/15 text-teal flex items-center justify-center font-bold">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <Badge variant="teal" className="text-[10px] font-semibold">
                    HOSPITAL PORTAL & ADMIN
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">Hospital Workspace</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Audit itemized bills, correct tariff codes, manage hospital staff, and submit clean claims to TPAs.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                    <span>Open Hospital Portal & review uploaded bills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                    <span>Verify itemized charges vs stated header totals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                    <span>Identify tariff discrepancies & package rate ceilings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                    <span>Manage cashless pre-auth & reimbursement submissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                    <span>Manage hospital staff accounts & track claim progress</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-border/60 space-y-2">
                  <Button
                    onClick={() => handleSelectRole("hospital_admin", "/hospital/admin")}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs"
                  >
                    Open Hospital Admin Panel
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSelectRole("hospital_staff", "/bills")}
                    className="w-full text-xs h-9 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                  >
                    Hospital Billing Staff View
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Insurance / TPA Workspace */}
            <Card className="insurance-glass border border-violet-200/80 dark:border-violet-900/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-12 w-12 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                    INSURER & TPA OPS
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">Insurance / TPA Workspace</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Incoming claim adjudication, document verification, review decisions, and banking settlement tracking.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <span>Open Insurance Claims Review & inspect incoming queue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <span>Inspect bill details & verify supporting medical records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <span>Flag missing information & unbundled code discrepancies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <span>Record review decisions with human confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <span>Track pending, approved, rejected, and settled claims</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-border/60 space-y-2">
                  <Button
                    onClick={() => handleSelectRole("insurer_admin", "/insurance/admin")}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs"
                  >
                    Open Insurance Admin Panel
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSelectRole("insurer_reviewer", "/queue")}
                    className="w-full text-xs h-9 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                  >
                    Claims Reviewer Workspace
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How It Works Step-by-Step Section ── */}
      <section id="how-it-works" className="py-16 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              From Hospital Invoice to Bank Settlement in 5 Steps
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              BillBridge replaces days of opaque back-and-forth emails with deterministic math verification and audit logging.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <span className="text-xs font-mono font-bold text-primary">01 / INGESTION</span>
              <h4 className="text-sm font-semibold text-foreground">Multi-Page OCR</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hospital invoices are uploaded as PDF or images with 15MB ceiling and SHA-256 integrity validation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <span className="text-xs font-mono font-bold text-teal">02 / EXTRACTION</span>
              <h4 className="text-sm font-semibold text-foreground">Multimodal Gemini Vision</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isolates hospital name, patient identifiers, CPT/HCPCS codes, rates, and unit quantities.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-600">03 / AUDIT ENGINE</span>
              <h4 className="text-sm font-semibold text-foreground">Deterministic Math</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero AI hallucination: sums line items with strict arithmetic and checks against stated header totals.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <span className="text-xs font-mono font-bold text-violet-600">04 / ADJUDICATION</span>
              <h4 className="text-sm font-semibold text-foreground">TPA Decision Ledger</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Insurer reviewers evaluate line items, request notes, and record confirmed approval/query decisions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-600">05 / SETTLEMENT</span>
              <h4 className="text-sm font-semibold text-foreground">Fund Disbursement</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Separate from approval: tracks NEFT/RTGS banking transactions and issues settled confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Compliance & Safety Banner ── */}
      <section id="compliance" className="py-12 bg-muted/40 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Healthcare Security & Privacy By Design</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Private storage buckets, Row Level Security (RLS) policies, zero patient data in telemetry logs, and explicit human decision gates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectRole("hospital_admin", "/hospital/admin")}
                className="text-xs h-9"
              >
                Hospital Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectRole("insurer_admin", "/insurance/admin")}
                className="text-xs h-9 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
              >
                Insurance Admin
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border/60 py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo />
            <span>• Healthcare Finance & Claims Reconciliation</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Synthetic Hackathon Demo</span>
            <span>•</span>
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <span>•</span>
            <Link to="/hospital/admin" className="hover:underline">Hospital Admin</Link>
            <span>•</span>
            <Link to="/insurance/admin" className="hover:underline">Insurance Admin</Link>
          </div>
        </div>
      </footer>

      {/* ── How It Works Interactive Modal ── */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-border/80 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">How BillBridge Operates</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                <strong className="text-foreground block mb-1">1. Intelligent Medical Bill Ingestion</strong>
                Upload statements from any Indian hospital (Apollo, Fortis, Max, etc.). Private storage protects original dockets while SHA-256 prevents duplicate invoices.
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                <strong className="text-foreground block mb-1">2. Multimodal OCR & Line Item Extraction</strong>
                Google Gemini Vision isolates hospital admission details, itemized pharmacy/ICU charges, and CPT/HCPCS codes.
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                <strong className="text-foreground block mb-1">3. Deterministic Arithmetic & Tariff Audit</strong>
                The math engine sums every single item. If the itemized sum differs from the printed bill total or agreed PPN ceiling, it flags the exact line number with a plain-language explanation.
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                <strong className="text-foreground block mb-1">4. Role-Specific Review & Consequential Action</strong>
                Hospital teams correct billing mistakes in-place before submission; Insurers inspect evidence and raise queries or approvals. Consequential actions require explicit human confirmation.
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                <strong className="text-foreground block mb-1">5. Real-Time Immutable Event Trail</strong>
                Every action (upload, edit, query, approval, settlement) is appended to <code className="text-primary font-mono font-semibold">public.claim_events</code> so the audit ledger is never overwritten.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowHowItWorksModal(false)}
                className="text-xs"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
