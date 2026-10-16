import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  CheckSquare,
  FileText,
  BarChart3,
  Bell,
  Settings,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { Logo } from "./Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { role, roleConfig } = useRole();
  const location = useLocation();

  // Close mobile nav on navigation change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  const navItems = [
    {
      to: "/dashboard",
      label:
        role === "insurer_reviewer"
          ? "Overview"
          : role === "patient"
            ? "My Bills Overview"
            : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      to: "/bills",
      label: "Medical Bills",
      icon: FileText,
      badge: "3 Seed",
    },
    {
      to: "/claims",
      label: role === "patient" ? "My Claim Records" : "Claims Registry",
      icon: FileSpreadsheet,
      badge: "1 Flagged",
    },
    {
      to: "/upload",
      label: "Upload & Ingest",
      icon: UploadCloud,
      roles: ["hospital_staff", "patient"],
    },
    {
      to: "/queue",
      label:
        role === "insurer_reviewer" ? "Adjudication Queue" : "Review Queue",
      icon: CheckSquare,
      badge: "Triage",
      roles: ["insurer_reviewer", "hospital_staff"],
    },
    {
      to: "/hospital/admin",
      label: "Hospital Admin",
      icon: Building2,
      badge: "Facility",
      roles: ["hospital_admin", "hospital_staff", "platform_admin"],
    },
    {
      to: "/insurance/admin",
      label: "Insurance Admin",
      icon: ShieldCheck,
      badge: "TPA",
      roles: ["insurer_admin", "insurer_reviewer", "platform_admin"],
    },
    {
      to: "/reports",
      label: "Reports & Export",
      icon: BarChart3,
      badge: "CSV",
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
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card/95 backdrop-blur-md p-4 shadow-xl border-r border-border/80 transition-transform animate-in slide-in-from-left duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mobile navigation"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active Role Card */}
        <div className="py-3">
          <div className="rounded-lg bg-secondary/50 border border-border/50 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active Persona
              </span>
              <Badge
                variant={roleConfig.badgeVariant}
                className="text-[9px] px-1.5 py-0"
              >
                {roleConfig.badgeLabel}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground truncate mt-1">
              {roleConfig.title}
            </p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 py-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1.5 py-0"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-border/70 text-[10px] text-muted-foreground text-center">
          BillBridge v0.3.0 • Enterprise Workspace
        </div>
      </div>
    </div>
  );
}
