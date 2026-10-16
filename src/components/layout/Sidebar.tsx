import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { Logo } from "./Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/types/contracts";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "warning" | "teal" | "secondary";
  roles?: UserRole[];
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  className,
}: SidebarProps) {
  const { role, roleConfig } = useRole();

  const navItems: NavItem[] = [
    {
      to: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      to: "/bills",
      label: "Medical Bills",
      icon: FileText,
      badge: "3 Seed",
      badgeVariant: "secondary",
    },
    {
      to: "/claims",
      label: "Claims Registry",
      icon: FileSpreadsheet,
      badge: "1 Flagged",
      badgeVariant: "warning",
    },
    {
      to: "/upload",
      label: "Upload & Ingest",
      icon: UploadCloud,
      roles: ["hospital_staff", "patient"],
    },
    {
      to: "/queue",
      label: "Review Queue",
      icon: CheckSquare,
      badge: "Triage",
      badgeVariant: "warning",
      roles: ["insurer_reviewer", "hospital_staff"],
    },
    {
      to: "/admin",
      label: "Super Admin",
      icon: ShieldCheck,
      badge: "Root",
      badgeVariant: "secondary",
      roles: ["super_admin", "platform_admin"],
    },
    {
      to: "/hospital",
      label: "Hospital Admin",
      icon: Building2,
      badge: "Facility",
      badgeVariant: "teal",
      roles: ["hospital_admin", "hospital_staff", "super_admin", "platform_admin"],
    },
    {
      to: "/insurance",
      label: "Insurance Admin",
      icon: ShieldCheck,
      badge: "TPA",
      badgeVariant: "default",
      roles: ["insurer_admin", "insurer_reviewer", "super_admin", "platform_admin"],
    },
    {
      to: "/reports",
      label: "Reports & Export",
      icon: BarChart3,
      badge: "CSV",
      badgeVariant: "teal",
    },
    {
      to: "/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      to: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside
      aria-label="Primary Application Navigation"
      className={cn(
        "relative flex flex-col border-r border-border/70 bg-card/75 backdrop-blur-md transition-all duration-200 select-none",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border/70">
        <Logo collapsed={collapsed} />

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Role Workspace Banner (when expanded) */}
      {!collapsed && (
        <div className="px-3.5 pt-3 pb-2">
          <div className="rounded-lg bg-secondary/50 border border-border/50 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Workspace
              </span>
              <Badge
                variant={roleConfig.badgeVariant}
                className="text-[9px] px-1.5 py-0 font-mono"
              >
                {roleConfig.badgeLabel}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground truncate mt-1">
              {roleConfig.title}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  collapsed && "justify-center px-2",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <Badge
                  variant={item.badgeVariant ?? "secondary"}
                  className="ml-auto text-[10px] px-1.5 py-0 shrink-0 font-normal"
                >
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Active Organization & Demo Role Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-border/60 space-y-2">
          <div className="rounded-lg bg-muted/40 p-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Apollo Hospitals Network</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Bengaluru Health City</span>
              <span className="font-mono text-teal font-semibold">
                ROHINI-0412
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate">
              ABDM &amp; HIPAA Compliant Architecture
            </span>
          </div>
        </div>
      ) : (
        <div
          className="p-2 border-t border-border/60 flex justify-center"
          title="Apollo Hospitals Network"
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </aside>
  );
}
