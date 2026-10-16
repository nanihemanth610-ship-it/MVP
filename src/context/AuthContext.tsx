import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types/claim";
import { useRole } from "./RoleContext";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isDemo: boolean;
  signedInAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  hasBackendConfigured: boolean;
  loginDemo: (role: UserRole) => Promise<void>;
  loginLive: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "billbridge_auth_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole();

  const hasBackendConfigured = useMemo(() => {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    return Boolean(
      url &&
      key &&
      !url.includes("YOUR_PROJECT") &&
      !key.includes("your-anon-key"),
    );
  }, []);

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthUser;
      }
      // Default to active demo session so direct deep links work smoothly
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
    };

    const demoUser: AuthUser = {
      id: `demo-${role}-${Date.now()}`,
      email: roleTitles[role].email,
      displayName: roleTitles[role].title,
      role,
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

  const loginLive = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!hasBackendConfigured) {
      return {
        success: false,
        error:
          "Live authentication backend is not configured in this environment. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are unset. Please use Demo Mode below.",
      };
    }

    if (!email || !pass || pass.length < 6) {
      return {
        success: false,
        error:
          "Please enter a valid email address and password (at least 6 characters).",
      };
    }

    // When backend configured, Supabase auth call
    return {
      success: false,
      error:
        "Authentication service connection pending backend schema initialization.",
    };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.warn("BillBridge: Failed clearing auth storage", err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isDemoMode: user?.isDemo ?? true,
      hasBackendConfigured,
      loginDemo,
      loginLive,
      logout,
    }),
    [user, hasBackendConfigured],
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
