import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  User,
  Sparkles,
  Lock,
  ArrowRight,
  FileSearch,
  Calculator,
  ShieldAlert,
  CheckCircle2,
  Loader2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/layout/Logo";
import type { UserRole } from "@/types/claim";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;

  const { loginDemo, loginLive, loginWithGoogle, hasBackendConfigured } = useAuth();

  const [activeTab, setActiveTab] = useState<"demo" | "live">("demo");
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
          "Live authentication backend is not configured in this environment. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are unset. Please explore using Demo Mode below.",
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

  const handleDemoSelect = async (role: UserRole) => {
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
          "Authentication failed. The live Supabase backend is currently unset in this environment. Please explore using Demo Mode below.",
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

            {/* Value Pillars in Plain Language */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                  <FileSearch className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Vision OCR Extraction
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Upload paper bills or PDFs. The vision model identifies provider NPIs,
                    patient demographics, and itemized procedure codes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal/15 text-teal shrink-0 mt-0.5">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Automated Math Reconciliation
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Independently verifies quantity × rate = total and catches discrepancies
                    between statement totals and itemized sums before submission.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
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
                  <CardTitle className="text-lg">Access Workspace</CardTitle>
                  {hasBackendConfigured ? (
                    <Badge variant="success" className="text-[10px]">
                      Live Supabase Auth
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      Demo Mode Available
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Choose an entry method to explore the BillBridge workflow.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Tabs
                  value={activeTab}
                  onValueChange={(val) => {
                    setActiveTab(val as "demo" | "live");
                    setErrorMessage(null);
                  }}
                  defaultValue="demo"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="demo" className="gap-1.5 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Synthetic Demo
                    </TabsTrigger>
                    <TabsTrigger value="live" className="gap-1.5 text-xs">
                      <Lock className="h-3.5 w-3.5" />
                      Live Account
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: SYNTHETIC DEMO MODE */}
                  <TabsContent value="demo" className="space-y-3 pt-3">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        DEMO MODE — ZERO SECRETS • SYNTHETIC DATA ONLY
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                        No real patient data is collected or transmitted. Select a persona below
                        to explore role workflows with pre-seeded medical bills (Fortis Memorial
                        Gurugram, Apollo Hospitals Bengaluru, Max Super Speciality New Delhi).
                      </p>
                    </div>

                    <div className="space-y-2">
                      {/* Persona 1: Super Admin */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("super_admin")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 hover:border-purple-500 hover:bg-purple-50/60 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Super Administrator
                              </span>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 text-purple-700 border-purple-300">
                                /admin
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Multi-tenant directory, hospital approvals &amp; system health
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>

                      {/* Persona 2: Hospital Staff */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("hospital_staff")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-card hover:border-primary/70 hover:bg-secondary/40 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Hospital Billing Specialist
                              </span>
                              <Badge variant="default" className="text-[9px] px-1.5 py-0">
                                Staff
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Uploads bills, corrects CPT math &amp; submits claims
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>

                      {/* Persona 3: Hospital Administrator */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("hospital_admin")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 hover:border-teal-500 hover:bg-teal-50/60 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/20 text-teal shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Hospital Administrator
                              </span>
                              <Badge variant="teal" className="text-[9px] px-1.5 py-0">
                                Facility Admin
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Apollo Hospitals Bengaluru • Staff ops &amp; pre-submission audits
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-teal transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>

                      {/* Persona 4: Insurance Administrator */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("insurer_admin")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-violet-200/80 dark:border-violet-900/60 bg-violet-50/30 dark:bg-violet-950/20 hover:border-violet-500 hover:bg-violet-50/60 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-600 shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Insurance / TPA Administrator
                              </span>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-violet-700 border-violet-300">
                                Payer Ops
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Star Health • Intake queue, decisions oversight &amp; settlements
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-violet-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>

                      {/* Persona 5: Insurer Reviewer */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("insurer_reviewer")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-card hover:border-teal/70 hover:bg-secondary/40 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-teal shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Insurer Claims Adjudicator
                              </span>
                              <Badge variant="teal" className="text-[9px] px-1.5 py-0">
                                Payer
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Audits variances, validates prior auth &amp; decides claims
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-teal transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>

                      {/* Persona 6: Patient */}
                      <button
                        type="button"
                        onClick={() => handleDemoSelect("patient")}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-card hover:border-blue-400/70 hover:bg-secondary/40 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                Patient / Policyholder
                              </span>
                              <Badge variant="info" className="text-[9px] px-1.5 py-0">
                                Consumer
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Inspects out-of-pocket costs &amp; downloads EOBs
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>
                    </div>

                    <div className="pt-2 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                      <span>
                        Role simulation is for testing only, not proof of cryptographic authorization.
                      </span>
                    </div>
                  </TabsContent>

                  {/* TAB 2: LIVE ACCOUNT & GOOGLE OAUTH */}
                  <TabsContent value="live" className="space-y-4 pt-3">
                    {!hasBackendConfigured && (
                      <Alert variant="warning">
                        <AlertTitle>Backend Credentials Pending</AlertTitle>
                        <AlertDescription>
                          Live authentication requires Supabase environment variables (
                          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
                          ). Please explore via <strong>Synthetic Demo</strong> mode above.
                        </AlertDescription>
                      </Alert>
                    )}

                    {errorMessage && (
                      <Alert variant="destructive">
                        <AlertTitle>Sign In Error</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    {/* Google OAuth Button */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading || isLoading}
                        className="w-full h-11 px-4 rounded-lg border border-border bg-card hover:bg-secondary/70 text-foreground font-medium text-xs flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        {isGoogleLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                        )}
                        <span>
                          {isGoogleLoading
                            ? "Connecting to Google OAuth..."
                            : "Continue with Google Workspace"}
                        </span>
                      </button>

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border/60" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            or password sign-in
                          </span>
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={handleLiveEmailSubmit}
                      noValidate
                      className="space-y-3.5"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-email" required>
                          Corporate Email Address
                        </Label>
                        <Input
                          id="auth-email"
                          type="email"
                          placeholder="adjudicator@healthplan.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                          hasError={Boolean(errorMessage)}
                          aria-describedby={
                            errorMessage ? "auth-error-desc" : undefined
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="auth-password" required>
                            Password
                          </Label>
                          <a
                            href="#forgot-password"
                            onClick={(e) => {
                              e.preventDefault();
                              setErrorMessage(
                                "Self-service password recovery requires a live Supabase backend.",
                              );
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Forgot password?
                          </a>
                        </div>
                        <Input
                          id="auth-password"
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                          hasError={Boolean(errorMessage)}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full mt-2 cursor-pointer"
                        disabled={isLoading || isGoogleLoading}
                      >
                        {isLoading ? (
                          "Authenticating..."
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 mr-1.5" /> Sign In to
                            BillBridge
                          </>
                        )}
                      </Button>
                    </form>

                    {errorMessage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs cursor-pointer"
                        onClick={() => {
                          setActiveTab("demo");
                          setErrorMessage(null);
                        }}
                      >
                        Recovery: Continue in Demo Mode instead
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
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
          <span>Zero patient data collected in demo mode</span>
        </div>
      </footer>
    </div>
  );
}
