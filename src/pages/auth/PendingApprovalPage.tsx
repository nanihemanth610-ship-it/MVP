import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Mail,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";

export function PendingApprovalPage() {
  const { user, logout, refreshAuthorization } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatusFeedback(null);
    try {
      const res = await refreshAuthorization();
      if (res && res.role) {
        setStatusFeedback("Role verified! Redirecting to authorized portal...");
        setTimeout(() => {
          if (res.role === "super_admin") navigate("/admin");
          else if (res.role === "hospital_admin" || res.role === "hospital_staff") navigate("/hospital");
          else if (
            res.role === "insurance_admin" ||
            (res.role as string) === "insurance_reviewer" ||
            (res.role as string) === "insurer_reviewer"
          )
            navigate("/insurance");
          else navigate("/dashboard");
        }, 1200);
      } else {
        setStatusFeedback("Status checked: Approval is still pending with the system administrator.");
      }
    } catch {
      setStatusFeedback("Could not refresh status right now. Please try again shortly.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Top Branding */}
      <div className="mx-auto w-full max-w-4xl flex items-center justify-between pb-6">
        <Logo />
        <Badge variant="warning" className="text-xs py-1 px-2.5">
          Authorization Pending
        </Badge>
      </div>

      {/* Main Card */}
      <main className="mx-auto w-full max-w-lg my-auto py-6">
        <Card className="border-border/80 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2 ring-1 ring-amber-500/20">
              <Clock className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold">
              Account Registered — Awaiting Approval
            </CardTitle>
            <CardDescription className="text-xs max-w-sm mx-auto mt-1">
              Your Google identity is verified. In accordance with healthcare data isolation policies, an authorized administrator must assign your organizational portal before claim records can be accessed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* User Metadata Box */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.displayName || "Google User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />
                    {user?.email || "No email detected"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 shrink-0">
                  Pending Role
                </Badge>
              </div>

              <div className="border-t border-border/50 pt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Requested At</span>
                  <span className="font-medium text-foreground">
                    {user?.signedInAt ? new Date(user.signedInAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Verification Tier</span>
                  <span className="font-medium text-foreground">Google OAuth2 Authenticated</span>
                </div>
              </div>
            </div>

            {/* Explanatory Policy Notice */}
            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-teal" />
                Zero Trust Healthcare Access Policy
              </div>
              <p>
                BillBridge processes sensitive hospital bills and private claim data. Roles (Hospital Admin, Hospital Staff, Insurance Admin, or Insurance Reviewer) are never assigned automatically. Please contact your facility lead or Super Admin to activate your access.
              </p>
            </div>

            {statusFeedback && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary text-center">
                {statusFeedback}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                className="w-full gap-2 cursor-pointer"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Checking Permissions..." : "Check Approval Status"}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 cursor-pointer text-xs"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out / Use Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl pt-6 border-t border-border/60 text-center text-[11px] text-muted-foreground">
        BillBridge Healthcare Financial Technology • Secure Role-Based Administration
      </footer>
    </div>
  );
}
