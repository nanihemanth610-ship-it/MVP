import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types/claim";
import type { AppRole, MembershipStatus } from "@/types/admin";
import { useRole } from "./RoleContext";
import {
  supabase,
  isSupabaseConfigured,
  signInWithGoogle,
  signOut,
  resolveUserAuthorization,
  type UserRoleResolution,
} from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole | AppRole | "pending";
  organizationId?: string | null;
  organizationName?: string | null;
  organizationStatus?: string | null;
  membershipStatus?: MembershipStatus | null;
  isDemo: boolean;
  signedInAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoadingAuth: boolean;
  hasBackendConfigured: boolean;
  loginDemo: (role: UserRole) => Promise<void>;
  loginWithGoogle: (returnTo?: string) => Promise<void>;
  loginLive: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshAuthorization: () => Promise<UserRoleResolution | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "billbridge_auth_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const hasBackendConfigured = useMemo(() => isSupabaseConfigured(), []);

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthUser;
      }
      // Default to active demo session so direct deep links work smoothly in development
      return {
        id: "demo-user-01",
        email: "billing.blr@apollo-hospitals.in",
        displayName: "Apollo Hospital Billing Team",
        role: "hospital_staff",
        isDemo: true,
        signedInAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  });

  // Re-check Supabase session on mount and listen to OAuth authState changes
  useEffect(() => {
    if (!supabase || !hasBackendConfigured) {
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;

    async function syncSession() {
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error || !data.session) {
          if (isMounted) setIsLoadingAuth(false);
          return;
        }

        const sessionUser = data.session.user;
        const resolution = await resolveUserAuthorization(sessionUser.id);

        if (!isMounted) return;

        const resolvedRole = resolution.role ?? "pending";
        const authUser: AuthUser = {
          id: sessionUser.id,
          email: sessionUser.email || "",
          displayName:
            resolution.profile?.full_name ||
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email?.split("@")[0] ||
            "Authenticated User",
          avatarUrl:
            resolution.profile?.avatar_url ||
            sessionUser.user_metadata?.avatar_url,
          role: resolvedRole,
          organizationId: resolution.organizationId,
          organizationName: resolution.organizationName,
          organizationStatus: resolution.organizationStatus,
          membershipStatus: resolution.membershipStatus,
          isDemo: false,
          signedInAt: sessionUser.last_sign_in_at || new Date().toISOString(),
        };

        setUser(authUser);
        if (resolvedRole !== "pending") {
          setRole(resolvedRole as UserRole);
        }
      } catch (err) {
        console.error("BillBridge [Auth]: Failed syncing Supabase session", err);
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    }

    syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          if (isMounted && !user?.isDemo) {
            setUser(null);
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const sessionUser = session.user;
          const resolution = await resolveUserAuthorization(sessionUser.id);
          if (!isMounted) return;

          const resolvedRole = resolution.role ?? "pending";
          const authUser: AuthUser = {
            id: sessionUser.id,
            email: sessionUser.email || "",
            displayName:
              resolution.profile?.full_name ||
              sessionUser.user_metadata?.full_name ||
              sessionUser.user_metadata?.name ||
              sessionUser.email?.split("@")[0] ||
              "Authenticated User",
            avatarUrl:
              resolution.profile?.avatar_url ||
              sessionUser.user_metadata?.avatar_url,
            role: resolvedRole,
            organizationId: resolution.organizationId,
            organizationName: resolution.organizationName,
            organizationStatus: resolution.organizationStatus,
            membershipStatus: resolution.membershipStatus,
            isDemo: false,
            signedInAt: sessionUser.last_sign_in_at || new Date().toISOString(),
          };

          setUser(authUser);
          if (resolvedRole !== "pending") {
            setRole(resolvedRole as UserRole);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [hasBackendConfigured, setRole]);

  const loginDemo = async (role: UserRole) => {
    const roleTitles: Record<UserRole, { title: string; email: string }> = {
      hospital_staff: {
        title: "Hospital Billing Specialist",
        email: "billing.blr@apollo-hospitals.in",
      },
      hospital_admin: {
        title: "Dr. Arvind Rao (Hospital Billing Director)",
        email: "admin.blr@apollo-hospitals.in",
      },
      insurer_reviewer: {
        title: "Kavita Nair (Senior Claims Adjudicator)",
        email: "kavita.nair@starhealth.in",
      },
      insurer_admin: {
        title: "Sunil Mehta (Chief Claims Officer)",
        email: "claims.head@starhealth.in",
      },
      patient: {
        title: "Rajesh Sharma (Policyholder)",
        email: "rajesh.sharma@gmail.com",
      },
      platform_admin: {
        title: "BillBridge Platform Administrator",
        email: "admin@billbridge.health",
      },
      super_admin: {
        title: "BillBridge Super Administrator",
        email: "superadmin@billbridge.health",
      },
    };

    const demoUser: AuthUser = {
      id: `demo-${role}-${Date.now()}`,
      email: roleTitles[role].email,
      displayName: roleTitles[role].title,
      role,
      organizationId: role.startsWith("hospital")
        ? "a0000000-0000-0000-0000-000000000001"
        : role.startsWith("insurer")
          ? "b0000000-0000-0000-0000-000000000001"
          : null,
      organizationName: role.startsWith("hospital")
        ? "Apollo Hospitals Bannerghatta"
        : role.startsWith("insurer")
          ? "Star Health and Allied Insurance"
          : null,
      organizationStatus: "active",
      membershipStatus: "active",
      isDemo: true,
      signedInAt: new Date().toISOString(),
    };

    setUser(demoUser);
    setRole(role);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoUser));
    } catch (err) {
      console.warn("BillBridge: Failed to persist auth session", err);
    }
  };

  const loginWithGoogle = async (returnTo?: string) => {
    await signInWithGoogle(returnTo);
  };

  const loginLive = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!hasBackendConfigured || !supabase) {
      return {
        success: false,
        error:
          "Live authentication backend is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are unset. Please use Demo Mode below or sign in via Google.",
      };
    }

    if (!email || !pass || pass.length < 6) {
      return {
        success: false,
        error:
          "Please enter a valid email address and password (at least 6 characters).",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const resolution = await resolveUserAuthorization(data.user.id);
        const resolvedRole = resolution.role ?? "pending";
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          displayName:
            resolution.profile?.full_name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split("@")[0] ||
            "User",
          role: resolvedRole,
          organizationId: resolution.organizationId,
          organizationName: resolution.organizationName,
          organizationStatus: resolution.organizationStatus,
          membershipStatus: resolution.membershipStatus,
          isDemo: false,
          signedInAt: data.user.last_sign_in_at || new Date().toISOString(),
        });
        if (resolvedRole !== "pending") {
          setRole(resolvedRole as UserRole);
        }
        return { success: true };
      }

      return { success: false, error: "No user returned from authentication." };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Authentication failed. Please try again.",
      };
    }
  };

  const refreshAuthorization = useCallback(async (): Promise<UserRoleResolution | null> => {
    if (!supabase || !user || user.isDemo) return null;
    try {
      const resolution = await resolveUserAuthorization(user.id);
      if (resolution.role) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role: resolution.role!,
                organizationId: resolution.organizationId,
                organizationName: resolution.organizationName,
                organizationStatus: resolution.organizationStatus,
                membershipStatus: resolution.membershipStatus,
              }
            : null,
        );
        setRole(resolution.role as UserRole);
      }
      return resolution;
    } catch (err) {
      console.error("BillBridge [Auth]: Error refreshing authorization:", err);
      return null;
    }
  }, [user, setRole]);

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
    await signOut();
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isDemoMode: user?.isDemo ?? true,
      isLoadingAuth,
      hasBackendConfigured,
      loginDemo,
      loginWithGoogle,
      loginLive,
      refreshAuthorization,
      logout,
    }),
    [user, isLoadingAuth, hasBackendConfigured, refreshAuthorization],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider />");
  }
  return context;
}
