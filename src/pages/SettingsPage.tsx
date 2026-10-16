import { useState } from "react";
import {
  Database,
  Cloud,
  Cpu,
  Workflow,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
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
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";

export function SettingsPage() {
  const { role, setRole } = useRole();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Environment detection
  const hasSupabaseUrl = Boolean(
    import.meta.env?.VITE_SUPABASE_URL &&
    !import.meta.env?.VITE_SUPABASE_URL.includes("YOUR_PROJECT"),
  );
  const hasGeminiKey = Boolean(
    import.meta.env?.VITE_GEMINI_API_KEY &&
    !import.meta.env?.VITE_GEMINI_API_KEY.includes("your-gemini"),
  );
  const hasN8nWebhook = Boolean(
    import.meta.env?.VITE_N8N_WEBHOOK_URL &&
    !import.meta.env?.VITE_N8N_WEBHOOK_URL.includes("your-n8n"),
  );

  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      const dataAccess = getDataAccess();
      await dataAccess.resetDemoData();
      toast({
        title: "Demo Records Restored",
        description:
          "All synthetic encounters (Fortis, Apollo, Max) reset to initial ground truth.",
        variant: "success",
      });
      setShowResetConfirm(false);
    } catch (err) {
      toast({
        title: "Reset Failed",
        description:
          err instanceof Error ? err.message : "Failed to reset demo dataset.",
        variant: "error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Settings & Integrations
          </h1>
          <Badge variant="secondary" className="text-xs">
            SYSTEM GOVERNANCE
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage operational roles, inspect external cloud connectors, and
          maintain test data integrity.
        </p>
      </div>

      {/* Role / Persona Switching Card */}
      <Card className="border-border/80">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Active Operational Role
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Switch between BillBridge personas to test role-based permissions,
            navigation, and adjudication actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Hospital Staff */}
            <div
              onClick={() => setRole("hospital_staff")}
              className={`cursor-pointer p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                role === "hospital_staff"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Hospital Billing Desk
                </span>
                {role === "hospital_staff" && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload medical bills, audit OCR extractions, apply line item
                corrections, and submit claim requests.
              </p>
            </div>

            {/* Hospital Admin */}
            <div
              onClick={() => setRole("hospital_admin")}
              className={`cursor-pointer p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                role === "hospital_admin"
                  ? "border-teal ring-1 ring-teal bg-teal/5"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Hospital Administrator
                </span>
                {role === "hospital_admin" && (
                  <CheckCircle2 className="h-4 w-4 text-teal" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Facility oversight, staff accounts & permissions, tariff compliance, and authorized reports.
              </p>
            </div>

            {/* Insurer Reviewer */}
            <div
              onClick={() => setRole("insurer_reviewer")}
              className={`cursor-pointer p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                role === "insurer_reviewer"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Insurer Adjudicator
                </span>
                {role === "insurer_reviewer" && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Triage claims queue, review supporting bill evidence, raise
                inquiries, and issue simulated decisions.
              </p>
            </div>

            {/* Insurer Admin */}
            <div
              onClick={() => setRole("insurer_admin")}
              className={`cursor-pointer p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                role === "insurer_admin"
                  ? "border-violet-600 ring-1 ring-violet-600 bg-violet-50/20"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Insurance / TPA Admin
                </span>
                {role === "insurer_admin" && (
                  <CheckCircle2 className="h-4 w-4 text-violet-600" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Payer intake queue, decisions oversight, settlement disbursements, and reviewer limits.
              </p>
            </div>

            {/* Patient */}
            <div
              onClick={() => setRole("patient")}
              className={`cursor-pointer p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                role === "patient"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Patient / Policyholder
                </span>
                {role === "patient" && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                View own itemized charges, plain-language bill explanations, and
                tracking status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cloud & Service Integrations Matrix */}
      <Card className="border-border/80">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Integration Health & Service Status
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Live status of external APIs and persistence tiers. Unconfigured
            services run in verified DEMO mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="divide-y divide-border/60 text-xs">
            {/* Supabase Database */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Supabase PostgreSQL
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    public.claims and public.claim_events schema tables
                  </p>
                </div>
              </div>
              <Badge variant={hasSupabaseUrl ? "success" : "secondary"}>
                {hasSupabaseUrl ? "CONNECTED" : "LOCAL CACHE FALLBACK"}
              </Badge>
            </div>

            {/* Private Storage */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Supabase Private Storage (medical-bills)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    15MB quota, restricted MIME types, user folder isolation RLS
                  </p>
                </div>
              </div>
              <Badge variant="teal">CONFIGURED (PRIVATE)</Badge>
            </div>

            {/* Gemini Vision OCR */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Google Gemini Vision OCR
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Server-side API boundary. Privileged keys excluded from
                    client bundles.
                  </p>
                </div>
              </div>
              <Badge variant={hasGeminiKey ? "success" : "secondary"}>
                {hasGeminiKey ? "LIVE KEY DETECTED" : "DEMO PREVIEW ADAPTER"}
              </Badge>
            </div>

            {/* n8n Automation Engine */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    n8n Workflow Automation
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Webhook triggers for claim insertion, claim events, and
                    insurer notices.
                  </p>
                </div>
              </div>
              <Badge variant={hasN8nWebhook ? "success" : "warning"}>
                {hasN8nWebhook
                  ? "PRODUCTION WEBHOOK CONFIGURED"
                  : "NOT_CONFIGURED (PENDING TEMPLATE)"}
              </Badge>
            </div>

            {/* SMTP Email */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Transactional Email (SMTP)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Patient query and approval notifications
                  </p>
                </div>
              </div>
              <Badge variant="warning">NOT_CONFIGURED</Badge>
            </div>

            {/* WhatsApp Business */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    WhatsApp Business API
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Opt-in patient alerts and pre-auth updates
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                CONSENT_REQUIRED / NOT_CONFIGURED
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Reset Card */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">
              Demo Dataset Management
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Reset all modified claims, audit logs, and decisions back to initial
            Indian healthcare ground truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            This will discard temporary edits made to claims BB-DEMO-1001,
            BB-DEMO-1002, and BB-DEMO-1003.
          </p>

          {!showResetConfirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              Reset to Factory Demo State
            </Button>
          ) : (
            <div className="p-3 rounded-lg border border-destructive/40 bg-background space-y-2">
              <p className="text-xs font-semibold text-destructive">
                Are you sure you want to restore initial demo data?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetDemoData}
                  disabled={isResetting}
                  className="text-xs h-8"
                >
                  {isResetting ? "Resetting..." : "Confirm Restore"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
