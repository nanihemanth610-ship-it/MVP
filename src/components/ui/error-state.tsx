import * as React from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  technicalDetails?: string;
  onRetry?: () => void;
  actionLabel?: string;
}

export function ErrorState({
  title = "An unexpected error occurred",
  message,
  technicalDetails,
  onRetry,
  actionLabel = "Try Again",
  className,
  ...props
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-10",
        className,
      )}
      {...props}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-3">
        <AlertTriangle className="h-5 w-5 stroke-[1.8]" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <div className="mt-5">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        </div>
      )}

      {technicalDetails && (
        <div className="mt-4 w-full max-w-md text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer mx-auto"
          >
            {showDetails
              ? "Hide technical diagnostic"
              : "Show technical diagnostic"}
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showDetails && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted/60 p-3 text-[11px] font-mono text-muted-foreground border border-border/50">
              {technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
