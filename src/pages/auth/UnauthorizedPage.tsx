import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldX, ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const reason = searchParams.get("reason");
  const isSuspended = reason === "org_suspended";

  const handleReturnToDashboard = () => {
    if (!user || user.role === "pending") {
      navigate("/login", { replace: true });
    } else if (user.role === "super_admin" || user.role === "platform_admin") {
      navigate("/admin", { replace: true });
    } else if (user.role === "hospital_admin" || user.role === "hospital_staff") {
      navigate("/hospital", { replace: true });
    } else if (user.role === "insurance_admin" || user.role === "insurer_reviewer") {
      navigate("/insurance", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
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
        <Badge variant="destructive" className="text-xs py-1 px-2.5">
          Access Denied (403)
        </Badge>
      </div>

      {/* Main Card */}
      <main className="mx-auto w-full max-w-lg my-auto py-6">
        <Card className="border-destructive/30 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2 ring-1 ring-destructive/20">
              <ShieldX className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold">
              {isSuspended ? "Organization Access Suspended" : "Access Restricted"}
            </CardTitle>
            <CardDescription className="text-xs max-w-sm mx-auto mt-1">
              {isSuspended
                ? `Access for organization "${user?.organizationName || "Your Facility"}" is currently suspended by the platform administrator.`
                : "You do not have the required administrative role or organizational authorization to view this area."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Signed-in Identity</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {user?.email || "Unknown user"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Active Role</span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {user?.role || "Unassigned"}
                </Badge>
              </div>
              {user?.organizationName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium text-foreground">{user.organizationName}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full gap-2 cursor-pointer"
                onClick={handleReturnToDashboard}
              >
                <ArrowLeft className="h-4 w-4" />
                Return to My Authorized Workspace
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 cursor-pointer text-xs"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out & Switch Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl pt-6 border-t border-border/60 text-center text-[11px] text-muted-foreground">
        BillBridge Security Boundary • Row Level Security & Organization Data Isolation
      </footer>
    </div>
  );
}
