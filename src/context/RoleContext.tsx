import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types/claim";

export interface RoleConfig {
  id: UserRole;
  title: string;
  shortLabel: string;
  description: string;
  badgeLabel: string;
  badgeVariant: "default" | "teal" | "info" | "secondary";
  defaultAvatarInitials: string;
  permissions: {
    canUpload: boolean;
    canEditLineItems: boolean;
    canApproveOrReject: boolean;
    canExport: boolean;
    canReconcile: boolean;
  };
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  hospital_staff: {
    id: "hospital_staff",
    title: "Hospital Billing Team",
    shortLabel: "Hospital Billing",
    description:
      "Uploads invoices, verifies line item math, and corrects billing codes before payer submission.",
    badgeLabel: "Hospital Portal",
    badgeVariant: "default",
    defaultAvatarInitials: "HB",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canApproveOrReject: false,
      canExport: true,
      canReconcile: true,
    },
  },
  hospital_admin: {
    id: "hospital_admin",
    title: "Hospital Administrator",
    shortLabel: "Hospital Admin",
    description:
      "Oversees hospital billing operations, staff management, pre-submission audits, tariff compliance, and exports.",
    badgeLabel: "Hospital Admin",
    badgeVariant: "default",
    defaultAvatarInitials: "HA",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canApproveOrReject: false,
      canExport: true,
      canReconcile: true,
    },
  },
  insurer_reviewer: {
    id: "insurer_reviewer",
    title: "Insurer Claims Reviewer",
    shortLabel: "Insurer Reviewer",
    description:
      "Evaluates extracted claims, audits arithmetic variances, and adjudicates approvals, queries, or denials.",
    badgeLabel: "Payer Review",
    badgeVariant: "teal",
    defaultAvatarInitials: "IR",
    permissions: {
      canUpload: false,
      canEditLineItems: false,
      canApproveOrReject: true,
      canExport: true,
      canReconcile: true,
    },
  },
  insurer_admin: {
    id: "insurer_admin",
    title: "Insurance / TPA Administrator",
    shortLabel: "Insurance Admin",
    description:
      "Administers insurance claims intake, reviewer workloads, decision oversight, settlement pipelines, and payer audits.",
    badgeLabel: "Insurance Admin",
    badgeVariant: "teal",
    defaultAvatarInitials: "IA",
    permissions: {
      canUpload: false,
      canEditLineItems: false,
      canApproveOrReject: true,
      canExport: true,
      canReconcile: true,
    },
  },
  patient: {
    id: "patient",
    title: "Patient / Policyholder",
    shortLabel: "Patient",
    description:
      "Inspects personal medical bills, understands itemized out-of-pocket costs, and tracks insurance claim status.",
    badgeLabel: "Patient Portal",
    badgeVariant: "info",
    defaultAvatarInitials: "PT",
    permissions: {
      canUpload: true,
      canEditLineItems: false,
      canApproveOrReject: false,
      canExport: true,
      canReconcile: false,
    },
  },
  platform_admin: {
    id: "platform_admin",
    title: "Platform Administrator",
    shortLabel: "Platform Admin",
    description:
      "System superuser overseeing connected hospitals, insurance carriers, API webhooks, and audit compliance.",
    badgeLabel: "Platform Admin",
    badgeVariant: "secondary",
    defaultAvatarInitials: "PA",
    permissions: {
      canUpload: true,
      canEditLineItems: true,
      canApproveOrReject: true,
      canExport: true,
      canReconcile: true,
    },
  },
};

interface RoleContextValue {
  role: UserRole;
  roleConfig: RoleConfig;
  setRole: (role: UserRole) => void;
  isDemoMode: boolean;
  availableRoles: RoleConfig[];
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ROLE_STORAGE_KEY = "billbridge_active_role";

export function RoleProvider({
  children,
  defaultRole = "hospital_staff",
}: {
  children: ReactNode;
  defaultRole?: UserRole;
}) {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") return defaultRole;
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      return stored && ROLE_CONFIGS[stored] ? stored : defaultRole;
    } catch {
      return defaultRole;
    }
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch (err) {
      console.warn(
        "BillBridge: Failed saving active role to localStorage",
        err,
      );
    }
  };

  const roleConfig = useMemo(() => ROLE_CONFIGS[role], [role]);
  const availableRoles = useMemo(() => Object.values(ROLE_CONFIGS), []);

  const value = useMemo(
    () => ({
      role,
      roleConfig,
      setRole,
      isDemoMode: true,
      availableRoles,
    }),
    [role, roleConfig, availableRoles],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a <RoleProvider />");
  }
  return context;
}
