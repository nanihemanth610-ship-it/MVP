import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (options: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 4000,
    }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [
        ...prev,
        { id, title, description, variant, duration },
      ]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 pointer-events-none p-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-md backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200",
              t.variant === "default" &&
                "bg-card/95 border-border/80 text-foreground",
              t.variant === "success" &&
                "bg-emerald-50/95 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200",
              t.variant === "warning" &&
                "bg-amber-50/95 border-amber-200 text-amber-900 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200",
              t.variant === "error" &&
                "bg-rose-50/95 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200",
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.variant === "default" && (
                <Info className="h-4 w-4 text-primary" />
              )}
              {t.variant === "success" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              {t.variant === "warning" && (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              {t.variant === "error" && (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-semibold leading-tight">{t.title}</h4>
              {t.description && (
                <p className="text-xs opacity-90 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-sm p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a <ToastProvider />");
  }
  return context;
}
