import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  User,
  FileText,
  Languages,
  Info,
  CreditCard,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { getDataAccess } from "@/services/data-access";
import { type Claim } from "@/types/contracts";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportDropdown } from "@/components/export/ExportDropdown";

type Language = "en" | "te";

export function PatientClaimSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");

  const fetchClaim = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const dataAccess = getDataAccess();
      const found = await dataAccess.getClaimById(id || "claim-memorial-002");
      if (!found) {
        setLoadError(`Encounter record "${id}" was not found.`);
      } else {
        setClaim(found);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load encounter record.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  const handlePrint = () => {
    window.print();
  };

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border/80">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── ERROR STATE ──
  if (loadError || !claim) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {lang === "en"
            ? "Patient Record Not Found"
            : "రోగి రికార్డు కనుగొనబడలేదు"}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {loadError ||
            (lang === "en"
              ? "The requested medical bill could not be found."
              : "మీరు కోరిన ఆసుపత్రి బిల్లు వివరాలు అందుబాటులో లేవు.")}
        </p>
        <div className="pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/claims">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              {lang === "en"
                ? "Return to Claims List"
                : "క్లెయిమ్స్ జాబితాకు తిరిగి వెళ్లండి"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isTelugu = lang === "te";

  // Plain English & Telugu status translations
  const getStatusExplanation = (
    status: Claim["status"],
    hasVariance: boolean,
  ) => {
    switch (status) {
      case "flagged":
        return {
          titleEn: "Hospital Billing Review in Progress",
          titleTe: "ఆసుపత్రి బిల్లింగ్ సమీక్షలో ఉంది",
          badgeEn: "Needs Hospital Correction",
          badgeTe: "ఆసుపత్రి సవరణ అవసరం",
          variant: "warning" as const,
          explanationEn: hasVariance
            ? "Our automated checks noticed that the printed bill total on your invoice header differs from the sum of each itemized charge. The hospital billing desk has been notified to resolve this arithmetic difference before submitting the claim to insurance. You do not need to pay the disputed difference now."
            : "A question was flagged regarding service charges or coding on this bill. The hospital desk is verifying the details before insurance transmission.",
          explanationTe: hasVariance
            ? "బిల్లు హెడర్‌లో ముద్రించిన మొత్తం మరియు విడివిడి సేవల మొత్తాన్ని కూడగా వచ్చిన మొత్తం మధ్య తేడా గుర్తించబడింది. మీ భీమా కంపెనీకి పంపే ముందు ఈ లెక్కల వ్యత్యాసాన్ని సరిచేయాలని ఆసుపత్రి బిల్లింగ్ విభాగానికి తెలియజేయబడింది. మీరు ఈ వ్యత్యాసాన్ని ఇప్పుడే చెల్లించవలసిన అవసరం లేదు."
            : "ఈ బిల్లులోని కొన్ని అంశాల కోడింగ్ లేదా ఛార్జీలపై స్పష్టత అవసరం. ఆసుపత్రి బృందం దీనిని పరిశీలిస్తోంది.",
          actionEn:
            "Action: Awaiting revised bill statement from hospital billing desk.",
          actionTe:
            "తదుపరి చర్య: ఆసుపత్రి బిల్లింగ్ డెస్క్ నుండి సవరించిన స్టేట్‌మెంట్ కోసం వేచి చూస్తున్నాము.",
        };
      case "under_review":
        return {
          titleEn: "Insurance Company Review Ongoing",
          titleTe: "భీమా సంస్థ సమీక్ష కొనసాగుతోంది",
          badgeEn: "Awaiting Insurer / TPA",
          badgeTe: "భీమా సంస్థ పరిశీలనలో",
          variant: "info" as const,
          explanationEn:
            "Your verified itemized charges and discharge documentation have been forwarded to your health insurance TPA. A claims specialist is reviewing the medical records against your policy coverage. This usually takes 3 to 5 business days.",
          explanationTe:
            "మీ తనిఖీ చేయబడిన ఆసుపత్రి బిల్లు పత్రాలు మీ ఆరోగ్య భీమా సంస్థ/TPAకి చేరాయి. క్లెయిమ్ అధికారి మీ పాలసీ నిబంధనల ప్రకారం పత్రాలను పరిశీలిస్తున్నారు. దీనికి సాధారణంగా 3 నుండి 5 పని దినాలు పడుతుంది.",
          actionEn: "Action: No action required from you at this stage.",
          actionTe:
            "తదుపరి చర్య: ప్రస్తుతం మీ వైపు నుండి ఎటువంటి చర్య అవసరం లేదు.",
        };
      case "approved":
        return {
          titleEn: "Claim Approved in Demo Simulation",
          titleTe: "డెమో పరిశీలనలో క్లెయిమ్ ఆమోదించబడింది",
          badgeEn: "Simulated Approval",
          badgeTe: "నమూనా ఆమోదం",
          variant: "success" as const,
          explanationEn:
            "In this demonstration mode, your claim has been simulated as approved. The insurer has accepted verified hospital charges subject to standard co-pay/deductible rules.",
          explanationTe:
            "ఈ డెమో విధానంలో మీ క్లెయిమ్ ఆమోదించబడినట్లు నమోదు చేయబడింది. ఆసుపత్రి నిర్ధారిత ఖర్చులను పాలసీ నిబంధనల ప్రకారం భీమా సంస్థ ఆమోదించింది.",
          actionEn: "Action: Settlement and payout tracking enabled.",
          actionTe:
            "తదుపరి చర్య: తుది చెల్లింపు వివరాల ట్రాకింగ్ ప్రారంభించబడింది.",
        };
      case "rejected":
        return {
          titleEn: "Claim Decision: Not Approved in Demo Simulation",
          titleTe: "క్లెయిమ్ నిర్ణయం: డెమోలో తిరస్కరించబడింది",
          badgeEn: "Simulated Rejection",
          badgeTe: "నమూనా తిరస్కరణ",
          variant: "destructive" as const,
          explanationEn:
            "In this simulation, the claim was not approved due to missing documentation or non-covered exclusions. Contact your hospital billing desk or insurance coordinator to file an inquiry.",
          explanationTe:
            "ఈ నమూనా పరిశీలనలో క్లెయిమ్ ఆమోదించబడలేదు. కొన్ని ముఖ్యమైన పత్రాలు లేకపోవడం లేదా పాలసీ పరిధిలోకి రాని చికిత్స కావడం కారణం కావచ్చు. వివరాల కోసం మీ ఆసుపత్రి భీమా విభాగాన్ని సంప్రదించండి.",
          actionEn:
            "Action: Review inquiry options with hospital insurance coordinator.",
          actionTe: "తదుపరి చర్య: ఆసుపత్రి భీమా సమన్వయకర్తతో సమీక్షించండి.",
        };
      default:
        return {
          titleEn: "Document Intake & Validation Complete",
          titleTe: "పత్రాల సేకరణ & ప్రాథమిక తనిఖీ పూర్తయింది",
          badgeEn: "Document Intake",
          badgeTe: "పత్రాల సేకరణ",
          variant: "secondary" as const,
          explanationEn:
            "Your invoice has been extracted and checked for mathematical consistency. It is queued for billing specialist review.",
          explanationTe:
            "మీ బిల్లు పత్రం స్కాన్ చేయబడి గణిత తనిఖీ పూర్తయింది. బిల్లింగ్ నిపుణుల పరిశీలన కోసం వేచి ఉంది.",
          actionEn: "Action: Preparing claim packet for payer transmission.",
          actionTe:
            "తదుపరి చర్య: భీమా సంస్థకు పంపడానికి క్లెయిమ్ సిద్ధం చేయబడుతోంది.",
        };
    }
  };

  const statusInfo = getStatusExplanation(
    claim.status,
    claim.totals.hasVariance,
  );

  // Masked sensitive identifiers for privacy
  const maskedPolicyNumber = claim.insurance?.policyNumber
    ? `${claim.insurance.policyNumber.slice(0, 4)}-***-${claim.insurance.policyNumber.slice(-4)}`
    : "POL-***-8821";

  return (
    <div
      lang={lang}
      className={`space-y-6 max-w-5xl mx-auto pb-12 transition-colors ${
        isTelugu ? "leading-relaxed" : ""
      }`}
    >
      {/* ── TOP ACTION BAR & LANGUAGE TOGGLE ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to={`/claims/${claim.id}`}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {isTelugu ? "క్లెయిమ్ వివరాలు" : "Technical Claim Detail"}
            </Link>
          </Button>
          <span className="text-muted-foreground/60">•</span>
          <span className="font-mono text-xs font-semibold text-foreground">
            {claim.claimNumber}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-primary/40 text-primary"
          >
            {isTelugu ? "పేషెంట్ పోర్టల్" : "Patient Plain View"}
          </Badge>
        </div>

        {/* Right side controls: Language Switcher + Print Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Accessible English / Telugu Toggle */}
          <div
            role="group"
            aria-label={
              isTelugu
                ? "భాషను మార్చండి"
                : "Select language for bill explanation"
            }
            className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs font-medium shadow-xs"
          >
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none ${
                lang === "en"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={lang === "te"}
              onClick={() => setLang("te")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none ${
                lang === "te"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Languages className="h-3 w-3 text-primary" />
              తెలుగు
            </button>
          </div>

          <ExportDropdown
            mode="single"
            singleClaim={claim}
            size="sm"
            variant="outline"
            buttonText={isTelugu ? "ఎగుమతి" : "Export Statement"}
            className="h-8 text-xs shadow-xs"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 shadow-xs cursor-pointer"
            aria-label={
              isTelugu ? "సారాంశాన్ని ముద్రించండి" : "Print bill summary"
            }
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isTelugu ? "ముద్రించండి" : "Print Summary"}
            </span>
          </Button>
        </div>
      </div>

      {/* ── HEADER BANNER: PATIENT & HOSPITAL IDENTITY ── */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                {isTelugu
                  ? "ఆరోగ్య సంరక్షణ క్లెయిమ్ సారాంశం"
                  : "Healthcare Financial Summary"}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground">
                {isTelugu ? "తేదీ:" : "Bill Statement Date:"}{" "}
                <strong className="text-foreground font-mono">
                  {formatDate(
                    claim.hospital.statementDate.value || claim.createdAt,
                  )}
                </strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 break-words">
              {isTelugu
                ? "మీ ఆసుపత్రి బిల్లు & క్లెయిమ్ పురోగతి"
                : "Your Medical Bill & Claim Overview"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl break-words">
              {isTelugu
                ? "వైద్య బిల్లుల సంక్లిష్టత లేకుండా మీ ఖర్చులు, భీమా స్థితి మరియు మీరు చెల్లించాల్సిన మొత్తాన్ని స్పష్టంగా తెలుసుకోండి."
                : "Understand what was charged, how calculations were audited, and what your health insurance covers in clear, plain language."}
            </p>
          </div>

          <Badge
            variant={statusInfo.variant}
            className="text-xs py-1 px-3 self-start sm:self-center shrink-0"
          >
            {isTelugu ? statusInfo.badgeTe : statusInfo.badgeEn}
          </Badge>
        </div>

        {/* Hospital & Patient Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                {isTelugu
                  ? "ఆసుపత్రి లేదా వైద్య కేంద్రం"
                  : "Hospital / Healthcare Provider"}
              </p>
              <p className="font-semibold text-foreground truncate">
                {claim.hospital.providerName.value ||
                  (isTelugu ? "తెలియని ఆసుపత్రి" : "Unknown Hospital")}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {claim.hospital.billingAddress.value || "Bengaluru, Karnataka"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                {isTelugu ? "రోగి పేరు & ఐడి" : "Patient Identity"}
              </p>
              <p className="font-semibold text-foreground truncate">
                {claim.patient.fullName.value ||
                  (isTelugu ? "పేషెంట్ రికార్డు" : "Patient Record")}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {isTelugu ? "రోగి ఐడి:" : "Patient ID:"} {claim.patient.id}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                {isTelugu ? "భీమా పాలసీ & రకం" : "Insurance Policy & Type"}
              </p>
              <p className="font-semibold text-foreground truncate">
                {claim.insurance?.payerName || "Star Health & Allied Insurance"}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {claim.claimType || "Cashless TPA"} • {maskedPolicyNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLAIM PROGRESS LIFECYCLE TRACKER ── */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {isTelugu ? "క్లెయిమ్ పురోగతి దశలు" : "Claim Tracking Timeline"}
              </CardTitle>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-2 py-0.5 rounded">
              {isTelugu ? "తాజా స్థితి" : "Current Step"}:{" "}
              {claim.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <CardDescription className="text-xs">
            {isTelugu
              ? "బిల్లు సమర్పించినప్పటి నుండి తుది పరిష్కారం వరకు ప్రతి దశ పారదర్శకంగా కనిపిస్తుంది."
              : "Follow your claim journey from the initial document upload through arithmetic audit and insurer settlement."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                step: "1",
                labelEn: "Bill Scanned",
                labelTe: "బిల్లు స్కాన్ చేయబడింది",
                descEn: "Original paper statement digitized",
                descTe: "ఆసుపత్రి బిల్లు డిజిటైజ్ చేయబడింది",
                completed: true,
              },
              {
                step: "2",
                labelEn: "Math Checked",
                labelTe: "గణితం తనిఖీ",
                descEn: claim.totals.hasVariance
                  ? "₹1,500 difference under review"
                  : "All item totals verified",
                descTe: claim.totals.hasVariance
                  ? "₹1,500 తేడా పరిశీలనలో ఉంది"
                  : "ఛార్జీలు సరిగ్గా సరిపోయాయి",
                completed: true,
                warning: claim.totals.hasVariance,
              },
              {
                step: "3",
                labelEn: "Insurer TPA Review",
                labelTe: "భీమా సంస్థ సమీక్ష",
                descEn:
                  claim.status === "approved"
                    ? "Approved in demo"
                    : claim.status === "under_review"
                      ? "Review in progress"
                      : "Awaiting hospital correction",
                descTe:
                  claim.status === "approved"
                    ? "ఆమోదించబడింది"
                    : claim.status === "under_review"
                      ? "సమీక్ష కొనసాగుతోంది"
                      : "ఆసుపత్రి సవరణ కోసం వేచి ఉంది",
                completed:
                  claim.status === "under_review" ||
                  claim.status === "approved",
                current: claim.status === "under_review",
              },
              {
                step: "4",
                labelEn: "Final Settlement",
                labelTe: "తుది పరిష్కారం",
                descEn:
                  claim.status === "approved"
                    ? "Settlement simulated"
                    : "Pending insurer determination",
                descTe:
                  claim.status === "approved"
                    ? "చెల్లింపు పూర్తయింది"
                    : "నిర్ణయం వెలువడాల్సి ఉంది",
                completed: claim.status === "approved",
              },
            ].map((s) => (
              <div
                key={s.step}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  s.warning
                    ? "border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/20"
                    : s.completed
                      ? "border-emerald-500/30 bg-emerald-50/15 dark:bg-emerald-950/10"
                      : s.current
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-muted/20 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {isTelugu ? `దశ ${s.step}` : `STEP ${s.step}`}
                  </span>
                  {s.warning ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : s.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="font-semibold text-foreground text-xs">
                  {isTelugu ? s.labelTe : s.labelEn}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                  {isTelugu ? s.descTe : s.descEn}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── PLAIN-LANGUAGE STATUS CALLOUT BOX ── */}
      <div
        className={`p-4 rounded-xl border transition-colors ${
          statusInfo.variant === "warning"
            ? "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20"
            : statusInfo.variant === "success"
              ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20"
              : "border-primary/30 bg-primary/5"
        }`}
      >
        <div className="flex items-start gap-3">
          {statusInfo.variant === "warning" ? (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : statusInfo.variant === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-sm font-bold text-foreground">
              {isTelugu ? statusInfo.titleTe : statusInfo.titleEn}
            </h2>
            <p className="text-xs text-foreground/90 leading-relaxed break-words">
              {isTelugu ? statusInfo.explanationTe : statusInfo.explanationEn}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground pt-1">
              {isTelugu ? statusInfo.actionTe : statusInfo.actionEn}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 CLEAR BILL TOTAL METRIC CARDS ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5 text-primary" />
          {isTelugu
            ? "బిల్లు మొత్తాల గణాంకాలు & విశ్లేషణ"
            : "Bill Totals & Financial Breakdown"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Stated Billed Total */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-1.5">
              <CardDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isTelugu ? "ఆసుపత్రి బిల్లు మొత్తం" : "Printed Bill Total"}
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
                {formatCurrency(claim.totals.statedBilledTotal.value || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <FileCheck2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>
                  {isTelugu
                    ? "ఆసుపత్రి పత్రంపై రాసిన మొత్తం"
                    : "Stated on hospital statement"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Itemized Sum */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-1.5">
              <CardDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isTelugu ? "విడివిడి సేవల మొత్తం" : "Sum of All Charges"}
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
                {formatCurrency(claim.totals.itemizedSumTotal)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground">
                {isTelugu
                  ? `${claim.lineItems.length} సేవల మొత్తం లెక్కించబడింది`
                  : `Added across ${claim.lineItems.length} individual items`}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Arithmetic Variance */}
          <Card
            className={`shadow-xs ${
              claim.totals.hasVariance
                ? "border-amber-500/40 bg-amber-50/15 dark:bg-amber-950/15"
                : "border-border/80"
            }`}
          >
            <CardHeader className="pb-1.5">
              <CardDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isTelugu ? "తేడా / వ్యత్యాసం" : "Bill Variance"}
              </CardDescription>
              <CardTitle
                className={`text-2xl font-bold font-mono tracking-tight mt-1 ${
                  claim.totals.hasVariance
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {claim.totals.hasVariance
                  ? `+${formatCurrency(claim.totals.variance)}`
                  : isTelugu
                    ? "₹0 (ఖచ్చితమైనది)"
                    : "₹0 (Exact match)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground">
                {claim.totals.hasVariance
                  ? isTelugu
                    ? "హెడర్ మరియు అంశాల మొత్తం మధ్య వ్యత్యాసం"
                    : "Discrepancy flagged for billing desk"
                  : isTelugu
                    ? "100% గణిత ఖచ్చితత్వం సరిపోయింది"
                    : "100% arithmetic parity confirmed"}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Estimated Patient Responsibility */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-1.5">
              <CardDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isTelugu ? "మీరు చెల్లించాల్సిన అంచనా" : "Est. Your Share"}
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
                {formatCurrency(
                  claim.totals.patientResponsibilityEstimated || 0,
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground">
                {isTelugu
                  ? "కోపే / మినహాయింపు అంచనా (తుది నిర్ణయం కాదు)"
                  : "Copay / deductible (estimate only)"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── ITEMIZED CHARGES EXPLAINED (PLAIN LANGUAGE TABLE) ── */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              {isTelugu
                ? "విడివిడి వైద్య ఖర్చుల వివరాలు"
                : "Itemized Hospital Services & Charges"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isTelugu
                ? "ప్రతి సేవ యొక్క రేటు, పరిమాణం మరియు ధృవీకరణ స్థితి ఇక్కడ వివరించబడింది."
                : "Every item on your invoice explained with rate, quantity, and whether calculations matched."}
            </CardDescription>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {claim.lineItems.length} {isTelugu ? "సేవలు" : "Services"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold text-center w-12">
                    #
                  </th>
                  <th className="py-2.5 px-3 font-semibold">
                    {isTelugu
                      ? "వైద్య సేవ / చికిత్స వివరణ"
                      : "Service or Treatment Description"}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">
                    {isTelugu ? "కోడ్" : "Medical Code"}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right w-20">
                    {isTelugu ? "పరిమాణం" : "Quantity"}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right w-28">
                    {isTelugu ? "యూనిట్ ధర" : "Rate per unit"}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right w-28">
                    {isTelugu ? "మొత్తం ఛార్జ్" : "Billed Total"}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center w-36">
                    {isTelugu ? "తనిఖీ స్థితి" : "Verification Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {claim.lineItems.map((item, idx) => {
                  const isVerified =
                    !item.isMathMismatch && item.code.status !== "unreadable";
                  const isMathError = item.isMathMismatch;
                  const isUnreadableCode =
                    item.code.isUnreadable || !item.code.value;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isMathError ? "bg-amber-50/20 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>

                      {/* Service Description */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-foreground break-words">
                          {item.description.value ||
                            (isTelugu
                              ? "సేవ వివరణ లేదు"
                              : "Service description not detected")}
                        </div>
                        {isMathError && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                            {isTelugu
                              ? `లెక్క తప్పు: ${item.quantity.value} × ${formatCurrency(item.unitPrice.value || 0)} = ${formatCurrency(item.expectedTotal)}, కానీ బిల్లులో ${formatCurrency(item.totalPrice.value || 0)} గా ఉంది.`
                              : `Math mismatch: ${item.quantity.value} × ${formatCurrency(item.unitPrice.value || 0)} = ${formatCurrency(item.expectedTotal)} (billed: ${formatCurrency(item.totalPrice.value || 0)})`}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                            {item.notes}
                          </p>
                        )}
                      </td>

                      {/* Medical Code */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {item.code.value ? (
                          <span className="bg-secondary/70 px-1.5 py-0.5 rounded text-[11px] text-foreground">
                            {item.code.value}
                          </span>
                        ) : (
                          <span className="text-destructive font-semibold text-[10px]">
                            {isTelugu ? "కోడ్ లేదు (సమీక్షలో)" : "Code Absent"}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        {item.quantity.value ?? "—"}
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        {item.unitPrice.value !== null
                          ? formatCurrency(item.unitPrice.value)
                          : "—"}
                      </td>

                      {/* Billed Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                        {item.totalPrice.value !== null
                          ? formatCurrency(item.totalPrice.value)
                          : "—"}
                      </td>

                      {/* Verification Status Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {isMathError ? (
                          <Badge
                            variant="warning"
                            className="text-[10px] font-mono"
                          >
                            {isTelugu ? "లెక్క తేడా ఉంది" : "Math Mismatch"}
                          </Badge>
                        ) : isUnreadableCode ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] font-mono"
                          >
                            {isTelugu ? "గుర్తించని కోడ్" : "Unverified Code"}
                          </Badge>
                        ) : isVerified ? (
                          <Badge
                            variant="success"
                            className="text-[10px] font-mono flex items-center gap-1 justify-center"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {isTelugu ? "ధృవీకరించబడింది" : "Verified"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono"
                          >
                            {isTelugu ? "సమీక్షలో ఉంది" : "In Review"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── MANDATORY AI SUMMARY NOTICE & HEALTHCARE DISCLAIMERS ── */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs">
            <h2 className="text-sm font-bold text-foreground">
              {isTelugu
                ? "AI రూపొందించిన సారాంశ నోటీసు & చట్టపరమైన నిరాకరణ"
                : "AI-Generated Explanatory Notice & Important Disclaimers"}
            </h2>

            <div className="space-y-2 text-muted-foreground leading-relaxed break-words">
              <p>
                <strong className="text-foreground">
                  {isTelugu
                    ? "1. సమాచార ప్రయోజనాల కొరకు మాత్రమే: "
                    : "1. Informational Aid Only: "}
                </strong>
                {isTelugu
                  ? "ఈ సారాంశం ఆసుపత్రి బిల్లులు మరియు క్లెయిమ్ ప్రక్రియను సులభంగా అర్థం చేసుకోవడానికి BillBridge AI ఇంజిన్ ద్వారా స్వయంచాలకంగా రూపొందించబడింది. ఇది అధికారిక తుది నిర్ణయం కాదు."
                  : "This summary is automatically generated by the BillBridge software engine to help patients and families understand complex hospital invoices and charge itemization. It is an informational aid, not an official determination."}
              </p>

              <p>
                <strong className="text-foreground">
                  {isTelugu ? "2. వైద్య సలహా కాదు: " : "2. No Medical Advice: "}
                </strong>
                {isTelugu
                  ? "BillBridge ఎటువంటి వైద్య సలహాలు, రోగ నిర్ధారణ లేదా చికిత్స సంబంధిత మార్గదర్శకాలను అందించదు. ఆరోగ్య సమస్యల కొరకు ఎల్లప్పుడూ మీ వైద్యుడిని లేదా ఆసుపత్రి వైద్య బృందాన్ని సంప్రదించండి."
                  : "BillBridge does not provide medical advice, diagnosis, clinical evaluation, or treatment recommendations. Always consult your attending physician regarding health conditions and clinical care."}
              </p>

              <p>
                <strong className="text-foreground">
                  {isTelugu
                    ? "3. భీమా కవరేజ్ లేదా చెల్లింపు హామీ లేదు: "
                    : "3. No Coverage Determination or Guarantee: "}
                </strong>
                {isTelugu
                  ? "BillBridge మీ భీమా పాలసీ కవరేజీని ఖరారు చేయదు మరియు ఎటువంటి క్లెయిమ్ రీయింబర్స్‌మెంట్ లేదా చెల్లింపు మొత్తానికి హామీ ఇవ్వదు. తుది క్లెయిమ్ చెల్లింపులు కేవలం మీ భీమా పాలసీ నిబంధనలు మరియు భీమా సంస్థ/TPA పరిశీలనపై మాత్రమే ఆధారపడి ఉంటాయి."
                  : "BillBridge does not determine insurance policy coverage, approve claims, or guarantee reimbursement. Final benefit determinations and financial settlements are governed exclusively by your policy contract and the authorized health insurer/TPA."}
              </p>

              <p className="pt-1 text-foreground font-medium">
                {isTelugu
                  ? "👉 దయచేసి ఏదైనా తుది బిల్లు చెల్లింపులు చేయడానికి ముందు మీ ఆసుపత్రి బిల్లింగ్ డెస్క్ మరియు భీమా సంస్థతో అధికారికంగా నిర్ధారించుకోండి."
                  : "👉 Please always confirm official balances directly with your hospital's billing desk and verify coverage determinations with your insurer or TPA before making payments."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECURITY & PATIENT DATA RESTRICTION BADGE ── */}
      <div className="p-3.5 rounded-lg border border-border bg-card text-xs text-muted-foreground flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] leading-snug">
            {isTelugu ? (
              <>
                <strong>డేటా గోప్యతా రక్షణ:</strong> ఈ రికార్డు రోగికి (
                {claim.patient.id}) మాత్రమే పరిమితం చేయబడింది. డేటాబేస్ విధానాల
                ద్వారా ఇతర రోగుల వివరాలు బహిర్గతం కాకుండా రక్షించబడతాయి.
              </>
            ) : (
              <>
                <strong>Authorized Patient Record:</strong> Scoped strictly to
                patient {claim.patient.id}. Cross-patient access is prevented by
                database Row Level Security and access control policies.
              </>
            )}
          </span>
        </div>

        <div className="text-[10px] font-mono text-muted-foreground">
          {isTelugu
            ? "ఎండ్-టు-ఎండ్ గోప్యత"
            : "Local Client Storage • Zero Third-Party Secrets"}
        </div>
      </div>
    </div>
  );
}
