import { useNavigate } from "react-router-dom";
import {
  Mail,
  Building2,
  LogOut,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { roleConfig } = useRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Account & Identity Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified Google OAuth session credentials and organizational permissions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 cursor-pointer self-start sm:self-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-5 space-y-4">
          <Card className="border-border/80 shadow-sm text-center">
            <CardContent className="pt-6 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border-2 border-primary/20 shadow-md mx-auto">
                    {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "BB"}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 text-white ring-2 ring-background">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {user?.displayName || "Google Authenticated User"}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user?.email}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Badge variant="teal" className="text-xs capitalize">
                  {roleConfig.title}
                </Badge>
                {user?.isDemo && (
                  <Badge variant="warning" className="text-[10px]">
                    Simulated Session
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card className="border-border/80 shadow-sm text-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Session Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Auth Provider</span>
                <span className="font-medium text-foreground">Google OAuth 2.0</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Session Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Active & Verified
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Signed In</span>
                <span className="font-medium text-foreground">
                  {user?.signedInAt
                    ? new Date(user.signedInAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })
                    : "Active"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Organization & Permissions */}
        <div className="md:col-span-7 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Assigned Organization
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Status: {user?.organizationStatus || "Active"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Data isolation rules restrict bill records to this institutional boundary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  {user?.organizationName || "Apollo Hospitals Bannerghatta Road"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Institutional identifier: {user?.organizationId || "a0000000-0000-0000-0000-000000000001"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal" />
                Active Functional Permissions
              </CardTitle>
              <CardDescription className="text-xs">
                Authorizations dictated by role &amp; PostgreSQL Row Level Security (RLS).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border/50 bg-card flex items-center justify-between">
                  <span>Document Intake &amp; OCR</span>
                  <Badge variant={roleConfig.permissions.canUpload ? "default" : "secondary"} className="text-[10px]">
                    {roleConfig.permissions.canUpload ? "Granted" : "Restricted"}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-card flex items-center justify-between">
                  <span>Edit Line Items</span>
                  <Badge variant={roleConfig.permissions.canEditLineItems ? "default" : "secondary"} className="text-[10px]">
                    {roleConfig.permissions.canEditLineItems ? "Granted" : "Restricted"}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-card flex items-center justify-between">
                  <span>Approve / Deny Claims</span>
                  <Badge variant={roleConfig.permissions.canApproveOrReject ? "teal" : "secondary"} className="text-[10px]">
                    {roleConfig.permissions.canApproveOrReject ? "Granted" : "Restricted"}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-card flex items-center justify-between">
                  <span>Export Reports (CSV/JSON)</span>
                  <Badge variant={roleConfig.permissions.canExport ? "default" : "secondary"} className="text-[10px]">
                    {roleConfig.permissions.canExport ? "Granted" : "Restricted"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
