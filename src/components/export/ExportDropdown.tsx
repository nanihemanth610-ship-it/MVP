import { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import type { Claim } from "@/types/contracts";
import {
  exportClaimsRegistry,
  exportSingleReviewedClaim,
  getExcelSupportStatus,
  type ExportFormat,
  type ExportResult,
} from "@/services/export-service";
import { cn } from "@/lib/utils";

export interface ExportDropdownProps {
  mode?: "registry" | "single";
  claims?: Claim[];
  singleClaim?: Claim;
  filenamePrefix?: string;
  customTitle?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  buttonText?: string;
  align?: "left" | "right";
  onExportStart?: () => void;
  onExportSuccess?: (result: ExportResult) => void;
  onExportError?: (error: Error) => void;
}

export function ExportDropdown({
  mode = "registry",
  claims = [],
  singleClaim,
  filenamePrefix,
  customTitle,
  variant = "outline",
  size = "sm",
  className,
  buttonText,
  align = "right",
  onExportStart,
  onExportSuccess,
  onExportError,
}: ExportDropdownProps) {
  const { role } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
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

  const targetCount = mode === "single" ? (singleClaim ? 1 : 0) : claims.length;
  const isDataAvailable = targetCount > 0;

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (isExporting) return;

      if (!isDataAvailable) {
        toast({
          title: "No Data Available to Export",
          description:
            "There are currently no matching claim encounters to export.",
          variant: "warning",
        });
        setIsOpen(false);
        return;
      }

      setIsExporting(true);
      setActiveFormat(format);
      onExportStart?.();

      try {
        let result: ExportResult;
        const exportUser = {
          id: user?.id || "demo-user",
          role,
          displayName: user?.displayName,
          email: user?.email,
          patientId: user?.id?.startsWith("PT-") ? user.id : undefined,
        };

        if (mode === "single") {
          if (!singleClaim) {
            throw new Error("No claim specified for export.");
          }
          result = await exportSingleReviewedClaim(singleClaim, {
            format,
            userRole: role,
            user: exportUser,
            filenamePrefix,
            customTitle,
          });
        } else {
          result = await exportClaimsRegistry(claims, {
            format,
            userRole: role,
            user: exportUser,
            filenamePrefix,
            customTitle,
          });
        }

        toast({
          title: `Export Successful (${format.toUpperCase()})`,
          description: `Downloaded ${result.recordCount} encounter record(s) as ${result.filename}.`,
          variant: "success",
        });

        onExportSuccess?.(result);
        setIsOpen(false);
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during export generation.";

        toast({
          title: "Export Failed",
          description: errorMsg,
          variant: "error",
        });

        onExportError?.(err instanceof Error ? err : new Error(errorMsg));
      } finally {
        setIsExporting(false);
        setActiveFormat(null);
      }
    },
    [
      isExporting,
      isDataAvailable,
      mode,
      claims,
      singleClaim,
      role,
      user,
      filenamePrefix,
      customTitle,
      toast,
      onExportStart,
      onExportSuccess,
      onExportError,
    ],
  );

  const excelInfo = getExcelSupportStatus();
  const defaultLabel = mode === "single" ? "Export Claim" : "Export Report";
  const displayLabel = buttonText || defaultLabel;

  return (
    <div
      className={cn("relative inline-block text-left", className)}
      ref={containerRef}
    >
      {/* Trigger Button */}
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || !isDataAvailable}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${displayLabel} options. Current format choices: CSV, JSON.`}
        className={cn("gap-1.5 font-medium transition-all", className)}
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
        )}

        <span>
          {isExporting
            ? `Exporting ${activeFormat?.toUpperCase() || ""}...`
            : displayLabel}
        </span>

        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground/80 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Export format selection"
          className={cn(
            "absolute z-50 mt-1.5 w-72 sm:w-80 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {/* Header Info */}
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                Export Encounters
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-primary/30 text-primary"
              >
                {targetCount} Record{targetCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Normalized, verified data with formula injection defense.
            </p>
          </div>

          {/* Action: CSV Export */}
          <button
            type="button"
            role="menuitem"
            disabled={isExporting}
            onClick={() => handleExport("csv")}
            className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent/80 focus-visible:bg-accent focus-visible:outline-none cursor-pointer group select-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  CSV Spreadsheet (.csv)
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Excel & Sheets
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                RFC 4180 standard with UTF-8 BOM. Preserves Telugu unicode, INR
                symbols, and escapes formula injection.
              </p>
            </div>
          </button>

          {/* Action: JSON Export */}
          <button
            type="button"
            role="menuitem"
            disabled={isExporting}
            onClick={() => handleExport("json")}
            className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent/80 focus-visible:bg-accent focus-visible:outline-none cursor-pointer group select-none mt-1"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <FileJson className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Structured JSON (.json)
                </span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  Schema v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Complete normalized Claim aggregates, audit log events, itemized
                tariff codes, and actual summary metrics.
              </p>
            </div>
          </button>

          {/* Excel Support Diagnostics Item */}
          <div className="mt-1 pt-1.5 border-t border-border/60">
            <div
              className="flex items-start gap-2 rounded-lg p-2 text-left bg-muted/40 text-muted-foreground select-none"
              title={excelInfo.reason}
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <div className="text-[10px] leading-relaxed">
                <span className="font-semibold text-foreground/80">
                  Excel (.xlsx) Notice:
                </span>{" "}
                {excelInfo.supported ? (
                  "Native .xlsx supported."
                ) : (
                  <span>
                    Excel (.xlsx) is excluded from the lean stack to prevent
                    macro security alerts. Use <strong>CSV</strong> above for
                    native Excel opening.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
