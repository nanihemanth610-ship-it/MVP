import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  supabase,
  resolveUserAuthorization,
  sanitizeRedirectPath,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshAuthorization } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Exchanging security tokens with Google...",
  );

  useEffect(() => {
    let isCancelled = false;

    async function handleAuthCallback() {
      if (!supabase) {
        setErrorMsg("Supabase client is not configured in this environment.");
        return;
      }

      try {
        setStatusMessage("Verifying Google session signature...");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          // If session is not immediately available, listen once for auth state change
          const { data: authSubscription } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === "SIGNED_IN" && session) {
                authSubscription.subscription.unsubscribe();
                await routeUser(session.user.id);
              }
            },
          );
          return;
        }

        await routeUser(data.session.user.id);
      } catch (err: any) {
        console.error("BillBridge [OAuth Callback]: Error processing callback:", err);
        if (!isCancelled) {
          setErrorMsg(
            err.message ||
              "Google authentication could not be completed. Please try signing in again.",
          );
        }
      }
    }

    async function routeUser(userId: string) {
      if (isCancelled) return;
      setStatusMessage("Querying verified organizational role from database...");

      const resolution = await resolveUserAuthorization(userId);
      await refreshAuthorization();

      if (isCancelled) return;

      // Check saved returnTo path safely
      let returnTo: string | null = null;
      try {
        returnTo = sessionStorage.getItem("billbridge_post_auth_redirect");
        sessionStorage.removeItem("billbridge_post_auth_redirect");
      } catch {
        // Ignore
      }

      const safeTarget = sanitizeRedirectPath(returnTo);

      if (!resolution.role) {
        // No role assigned yet -> route to pending approval
        navigate("/pending-approval", { replace: true });
        return;
      }

      // If user had a specific deep-link saved (e.g. /claims/123 or /hospital), honor it
      if (safeTarget && safeTarget !== "/dashboard") {
        navigate(safeTarget, { replace: true });
        return;
      }

      // Role-based portal routing
      switch (resolution.role) {
        case "super_admin":
          navigate("/admin", { replace: true });
          break;
        case "hospital_admin":
        case "hospital_staff":
          navigate("/hospital", { replace: true });
          break;
        case "insurance_admin":
        case "insurance_reviewer":
        case "insurer_reviewer":
          navigate("/insurance", { replace: true });
          break;
        case "patient":
          navigate("/dashboard", { replace: true });
          break;
        default:
          navigate("/pending-approval", { replace: true });
      }
    }

    handleAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [navigate, refreshAuthorization]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/40 shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                Authentication Error
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate("/login", { replace: true })}
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full border-border/80 shadow-xl">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Securing BillBridge Session
            </h2>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            Checking organization membership and Row Level Security grants.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
