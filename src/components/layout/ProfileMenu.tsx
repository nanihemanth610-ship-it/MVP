import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Sun,
  Moon,
  Laptop,
  RotateCcw,
  Shield,
  LogIn,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { getClaimStorage } from "@/services/storage-adapter";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ProfileMenu() {
  const { roleConfig } = useRole();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleResetData = async () => {
    try {
      await getClaimStorage().resetToMockData();
      toast({
        title: "Demo Data Reset",
        description:
          "Re-seeded the 3 sample claims (Apollo, Max, Fortis) in local storage.",
        variant: "success",
      });
      setIsOpen(false);
    } catch {
      toast({
        title: "Reset Failed",
        description: "Could not reset local database.",
        variant: "error",
      });
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Profile & Preferences"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-primary/10 text-primary font-semibold text-xs transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none"
      >
        <span>{roleConfig.defaultAvatarInitials}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User profile and settings"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-2xl ring-1 ring-black/10 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Details */}
          <div className="px-3 py-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {roleConfig.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  demo.user@billbridge.internal
                </p>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Interface Theme
            </p>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  theme === "light"
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <Sun className="h-3 w-3" /> Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  theme === "dark"
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <Moon className="h-3 w-3" /> Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  theme === "system"
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <Laptop className="h-3 w-3" /> System
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1 space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Identity Profile &amp; RLS Grants</span>
            </Link>

            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span>Switch Account / Sign In</span>
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={handleResetData}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Reset Demo Claims Data</span>
            </button>
          </div>

          <div className="px-2.5 py-1.5 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="h-3 w-3 text-teal" />
            <span>Demo Mode — Zero Secrets</span>
          </div>
        </div>
      )}
    </div>
  );
}
