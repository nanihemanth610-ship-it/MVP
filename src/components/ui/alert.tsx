import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-xs [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg+div]:translate-y-[-2px] [&:has(svg)]:pl-11 leading-relaxed transition-colors",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        info: "bg-blue-50/60 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        success:
          "bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning:
          "bg-amber-50/60 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        destructive:
          "bg-rose-50/60 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-200 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  showIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = "default", showIcon = true, children, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && variant === "default" && <Info className="h-4 w-4" />}
        {showIcon && variant === "info" && <Info className="h-4 w-4" />}
        {showIcon && variant === "success" && (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {showIcon && variant === "warning" && (
          <AlertTriangle className="h-4 w-4" />
        )}
        {showIcon && variant === "destructive" && (
          <AlertCircle className="h-4 w-4" />
        )}
        <div>{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight text-inherit",
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs opacity-90 leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
