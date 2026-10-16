import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import type { ExtractionField } from "@/types/contracts";

interface ReviewFieldInputProps<T extends string | number> {
  id: string;
  label: string;
  field?: ExtractionField<T>;
  value: T | null;
  onChange: (newValue: T | null) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  disabled?: boolean;
  helpText?: string;
  className?: string;
}

export function ReviewFieldInput<T extends string | number>({
  id,
  label,
  field,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  helpText,
  className = "",
}: ReviewFieldInputProps<T>) {
  const isNullOrEmpty = value === null || value === "";
  const confidence = field?.confidence;
  const isFlagged =
    field?.isFlagged || (confidence !== undefined && confidence < 0.8);
  const isUnreadable = field?.isUnreadable || field?.status === "unreadable";
  const isCorrected =
    field?.status === "corrected" || field?.correction !== undefined;
  const hasCoordinates =
    field?.boundingBox &&
    typeof field.boundingBox.x === "number" &&
    typeof field.boundingBox.y === "number";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (type === "number") {
      if (raw === "") {
        onChange(null);
      } else {
        const num = parseFloat(raw);
        onChange((isNaN(num) ? null : (num as unknown as T)) ?? null);
      }
    } else {
      onChange(raw === "" ? null : (raw as unknown as T));
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className="text-xs font-semibold text-foreground flex items-center gap-1.5"
        >
          {label}
        </Label>

        {/* Confidence or Status Badge */}
        <div className="flex items-center gap-1.5">
          {hasCoordinates && (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 font-mono text-muted-foreground"
              title="Evidence coordinates verified"
            >
              <MapPin className="h-2.5 w-2.5 mr-0.5" />
              Coords
            </Badge>
          )}

          {isCorrected ? (
            <Badge
              variant="secondary"
              className="text-[9px] py-0 px-1 text-teal-700 dark:text-teal-300"
            >
              Corrected
            </Badge>
          ) : isUnreadable ? (
            <Badge variant="destructive" className="text-[9px] py-0 px-1">
              Unreadable (null)
            </Badge>
          ) : isFlagged ? (
            <Badge
              variant="warning"
              className="text-[9px] py-0 px-1 flex items-center gap-0.5"
            >
              <AlertCircle className="h-2.5 w-2.5" />
              Needs Review{" "}
              {confidence !== undefined
                ? `(${Math.round(confidence * 100)}%)`
                : ""}
            </Badge>
          ) : confidence !== undefined ? (
            <Badge
              variant="success"
              className="text-[9px] py-0 px-1 flex items-center gap-0.5"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {Math.round(confidence * 100)}%
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Input
          id={id}
          type={type}
          disabled={disabled}
          value={value === null ? "" : String(value)}
          onChange={handleChange}
          placeholder={
            placeholder ||
            (isUnreadable
              ? "— Unreadable / omitted (null)"
              : isNullOrEmpty
                ? "— Not detected (null)"
                : "")
          }
          className={`h-8 text-xs font-sans transition-colors ${
            isNullOrEmpty
              ? "italic text-muted-foreground placeholder:text-muted-foreground/60 border-dashed"
              : isFlagged
                ? "border-amber-400 focus-visible:ring-amber-400/30"
                : ""
          }`}
          aria-label={label}
        />
      </div>

      {helpText && (
        <p className="text-[11px] text-muted-foreground leading-tight">
          {helpText}
        </p>
      )}

      {field?.rawText && field.rawText !== String(value) && (
        <p className="text-[10px] text-muted-foreground font-mono">
          Raw OCR: &quot;{field.rawText}&quot;
        </p>
      )}
    </div>
  );
}
