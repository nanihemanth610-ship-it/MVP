import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  FileSearch,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/layout/Logo";
import type { UserRole } from "@/types/claim";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;

  const { loginDemo, loginLive, loginWithGoogle, hasBackendConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      if (!hasBackendConfigured) {
        throw new Error(
          "Supabase backend configuration is required for live OAuth. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or choose a role below.",
        );
      }
      await loginWithGoogle(returnTo);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(
        err.message || "Could not connect to Google authentication. Please try again.",
      );
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginDemo(role);
      if (role === "super_admin" || role === "platform_admin") {
        navigate("/admin");
      } else if (role === "hospital_admin") {
        navigate("/hospital");
      } else if (role === "insurer_admin") {
        navigate("/insurance");
      } else {
        navigate(returnTo || "/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLiveEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid corporate or institutional email address.");
      setIsLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    const result = await loginLive(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate(returnTo || "/dashboard");
    } else {
      setErrorMessage(
        result.error ||
          "Authentication failed. Please check your credentials or access via Google OAuth.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-10 transition-colors">
      {/* Top Bar Branding */}
      <div className="mx-auto w-full max-w-5xl flex items-center justify-between pb-6">
        <Logo />
        <Badge variant="teal" className="text-xs py-1 px-2.5">
          Enterprise Security Build
        </Badge>
      </div>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-5xl my-auto py-4">
        <div className="grid gap-10 lg:grid-cols-12 items-center">
          {/* Left Column: Plain-Language Product Explanation */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Badge variant="default" className="text-xs mb-2">
                Hospital Bill &amp; Insurance Reader
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                Clear healthcare billing. Powered by vision AI.
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BillBridge reads hospital bill scans, extracts itemized charges
                with Gemini AI, audits arithmetic totals, and coordinates human
                verification between hospital billing staff, insurance
                adjudicators, and patients.
              </p>
            </div>

            {/* Core Value Pillars */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <FileSearch className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Deterministic OCR &amp; Itemization
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Extracts patient details, admission dates, ward charges, and line-item
                    subtotals from standardized hospital invoices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-teal shrink-0 mt-0.5">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Discrepancy Audit Engine
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Verifies line items against stated totals, identifying math errors, duplicate
                    pharmacy codes, and unbundled lab items automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Human-in-the-Loop Adjudication
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    AI suggestions are untrusted until humans confirm them. Clear role
                    separation ensures hospitals verify bills and insurers adjudicate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Entry Mode Card */}
          <div className="lg:col-span-6">
            <Card variant="glass" className="shadow-lg border-border/80">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Sign In to BillBridge</CardTitle>
                  <Badge variant="teal" className="text-[10px]">
                    Enterprise SSO
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Authenticate with your authorized institutional identity to access your assigned dashboard.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertTitle>Sign In Notice</AlertTitle>
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Google OAuth Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full h-11 px-4 rounded-lg border border-border/80 bg-background hover:bg-secondary/40 text-foreground font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-xs hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Redirecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Authorized hospital and insurance staff are routed automatically by assigned role.
                  </p>
                </div>

                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-mono">
                      or corporate email &amp; password
                    </span>
                  </div>
                </div>

                {/* Corporate Email Form */}
                <form onSubmit={handleLiveEmailSubmit} noValidate className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="work-email" className="text-xs font-semibold text-foreground">
                      Institutional Email
                    </Label>
                    <Input
                      id="work-email"
                      type="email"
                      placeholder="user@hospital.org or reviewer@insurer.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs h-9"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="work-password" className="text-xs font-semibold text-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setErrorMessage(
                            "Please contact your organization's Super Administrator or IT security officer to reset your credentials.",
                          )
                        }
                        className="text-[11px] text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="work-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-xs h-9"
                      autoComplete="current-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="teal"
                    size="sm"
                    className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Sign In to Workspace</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Workspace Profile Quick Access */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Workspace Profile Access
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0">
                      RBAC Preview
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect("super_admin")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-purple-500 hover:bg-purple-50/20 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-purple-600 shrink-0" />
                          <span className="text-xs font-semibold truncate">Super Admin</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/admin</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-purple-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect("hospital_admin")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-teal hover:bg-teal/10 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-teal shrink-0" />
                          <span className="text-xs font-semibold truncate">Hospital Admin</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/hospital</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-teal shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect("insurer_admin")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-violet-500 hover:bg-violet-50/20 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-violet-600 shrink-0" />
                          <span className="text-xs font-semibold truncate">Insurance Admin</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/insurance</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-violet-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect("hospital_staff")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-xs font-semibold truncate">Hospital Staff</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/bills</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect("insurer_reviewer")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-teal hover:bg-teal/10 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-teal shrink-0" />
                          <span className="text-xs font-semibold truncate">Claims Adjudicator</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/review/queue</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-teal shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect("patient")}
                      disabled={isLoading}
                      className="text-left p-2 rounded-lg border border-border/70 bg-card hover:border-blue-500 hover:bg-blue-50/10 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="text-xs font-semibold truncate">Patient Portal</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">/patient/summary</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-blue-500 shrink-0" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer Safeguards */}
      <footer className="mx-auto w-full max-w-5xl pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
        <p>BillBridge Healthcare Workflow Platform • v0.3.0</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal" /> Zero Trust Architecture
          </span>
          <span>•</span>
          <span>ABDM &amp; HIPAA Compliant Security Architecture</span>
        </div>
      </footer>
    </div>
  );
}
