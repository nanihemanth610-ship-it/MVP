import { useState, useRef, useEffect } from "react";
import {
  Check,
  ChevronDown,
  Building2,
  ShieldCheck,
  User,
  Sparkles,
} from "lucide-react";
import { useRole, type RoleConfig } from "@/context/RoleContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { role, roleConfig, setRole, availableRoles, isDemoMode } = useRole();
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

  const getRoleIcon = (roleId: RoleConfig["id"]) => {
    switch (roleId) {
      case "hospital_staff":
        return <Building2 className="h-4 w-4 text-primary shrink-0" />;
      case "hospital_admin":
        return <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />;
      case "insurer_reviewer":
        return <ShieldCheck className="h-4 w-4 text-teal shrink-0" />;
      case "insurer_admin":
        return <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0" />;
      case "patient":
        return <User className="h-4 w-4 text-blue-500 shrink-0" />;
      case "platform_admin":
        return <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current persona: ${roleConfig.title}. Click to switch role.`}
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/50 px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer select-none"
      >
        <span className="flex items-center gap-1.5">
          {getRoleIcon(role)}
          <span className="hidden sm:inline font-semibold">
            {roleConfig.shortLabel}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu with Solid Opaque Background */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select user role workspace"
          className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-border bg-card shadow-2xl ring-1 ring-black/10 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-2 border-b border-border/60">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Switch Persona / Workspace
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Switch operational role view to inspect specific permissions and workflows.
            </p>
          </div>

          <div className="py-1 space-y-1">
            {availableRoles.map((r) => {
              const isSelected = r.id === role;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setRole(r.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer select-none",
                    isSelected
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <div className="mt-0.5">{getRoleIcon(r.id)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-foreground font-medium">
                        {r.title}
                      </span>
                      <Badge
                        variant={r.badgeVariant}
                        className="text-[10px] py-0 px-1.5 shrink-0"
                      >
                        {r.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {r.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check
                      className="h-4 w-4 text-primary shrink-0 self-center"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-2.5 py-1.5 border-t border-border/60 text-[10px] text-muted-foreground text-center">
            Zero network secrets • Local client storage
          </div>
        </div>
      )}
    </div>
  );
}
