import { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Building2,
  User,
  Calendar,
  Hash,
  MapPin,
  MapPinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Claim } from "@/types/contracts";

interface DocumentViewerProps {
  claim: Claim;
  highlightedLineItemId?: string | null;
  onSelectLineItem?: (lineItemId: string) => void;
  className?: string;
}

export function DocumentViewer({
  claim,
  highlightedLineItemId,
  onSelectLineItem,
  className = "",
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Strictly check for real evidence coordinates from extraction provider (never fake it)
  const hasRealCoordinates = claim.lineItems.some(
    (item) =>
      item.code.boundingBox &&
      typeof item.code.boundingBox.x === "number" &&
      typeof item.code.boundingBox.y === "number",
  );

  return (
    <Card
      className={`flex flex-col h-full border-border/80 shadow-xs overflow-hidden ${className}`}
    >
      {/* Document Toolbar */}
      <CardHeader className="py-2.5 px-3.5 border-b border-border/70 bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-xs font-semibold truncate max-w-[160px] sm:max-w-xs">
                {claim.document.fileName}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {claim.document.documentType} • 300 DPI
                </span>
                <span className="text-[10px] text-muted-foreground">•</span>
                {hasRealCoordinates ? (
                  <Badge
                    variant="teal"
                    className="text-[9px] py-0 px-1 font-mono flex items-center gap-0.5"
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    Coords Verified
                  </Badge>
                ) : (
                  <span
                    className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5 font-mono"
                    title="Real evidence coordinates were not emitted by OCR; spatial bounding boxes are disabled to prevent inaccurate overlays."
                  >
                    <MapPinOff className="h-2.5 w-2.5 text-muted-foreground/60" />
                    Coords: Absent
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-[11px] font-mono px-1.5 py-0.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Reset Zoom"
            >
              {zoom}%
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="h-3.5 w-[1px] bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleRotate}
              title="Rotate 90°"
              aria-label="Rotate 90 degrees"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={isHighContrast ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setIsHighContrast(!isHighContrast)}
              title="Toggle High Contrast View"
            >
              Invert
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Simulated Document Paper Container */}
      <CardContent className="p-4 bg-muted/40 overflow-auto flex-1 flex justify-center items-start min-h-[480px]">
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className={`w-full max-w-xl rounded-lg shadow-sm border p-6 text-foreground font-sans text-xs transition-colors relative ${
            isHighContrast
              ? "bg-neutral-900 text-neutral-100 border-neutral-700"
              : "bg-background border-border"
          }`}
          aria-label="Source document preview"
        >
          {/* Bill Header */}
          <div className="border-b pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm tracking-tight">
                    {claim.hospital.providerName.value ||
                      "— Provider Unspecified"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {claim.hospital.billingAddress.value || "Address on record"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  NPI: {claim.hospital.npi.value || "—"}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {claim.document.documentType}
                </Badge>
                <p className="text-[11px] font-mono font-semibold mt-1">
                  STATEMENT #{claim.claimNumber}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDate(claim.hospital.statementDate.value || "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Info Strip */}
            <div className="mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-muted/20 p-2.5 rounded-md">
              <div>
                <span className="text-[10px] text-muted-foreground block">
                  Patient Name:
                </span>
                <span className="font-medium flex items-center gap-1 truncate">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  {claim.patient.fullName.value || "— Not detected (null)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">
                  Patient ID:
                </span>
                <span className="font-mono">{claim.patient.id || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">
                  Account Number:
                </span>
                <span className="font-mono flex items-center gap-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  {claim.patient.accountNumber.value || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Facsimile Table */}
          <div className="space-y-1">
            <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground uppercase pb-1.5 border-b px-2">
              <span className="col-span-1">#</span>
              <span className="col-span-2">Code</span>
              <span className="col-span-5">Description</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-1 text-right">Rate</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {claim.lineItems.map((item) => {
              const isSelected = highlightedLineItemId === item.id;
              // Check if real evidence coordinates exist on this line item
              const hasCoordinates = Boolean(
                item.code.boundingBox &&
                typeof item.code.boundingBox.x === "number" &&
                typeof item.code.boundingBox.y === "number",
              );

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectLineItem?.(item.id)}
                  className={`grid grid-cols-12 py-1.5 px-2 rounded-md transition-all cursor-pointer text-[11px] items-center relative ${
                    isSelected
                      ? "ring-2 ring-primary bg-primary/10 font-medium"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <span className="col-span-1 text-[10px] font-mono text-muted-foreground">
                    {item.lineNumber}
                  </span>
                  <span className="col-span-2 font-mono text-[10px]">
                    {item.code.value || (
                      <span className="text-destructive font-semibold bg-destructive/10 px-1 rounded">
                        [NULL]
                      </span>
                    )}
                  </span>
                  <span className="col-span-5 truncate text-[11px] pr-2">
                    {item.description.value || "—"}
                  </span>
                  <span className="col-span-1 text-right font-mono text-[10px]">
                    {item.quantity.value ?? "—"}
                  </span>
                  <span className="col-span-1 text-right font-mono text-[10px]">
                    {item.unitPrice.value !== null
                      ? formatCurrency(item.unitPrice.value)
                      : "—"}
                  </span>
                  <span className="col-span-2 text-right font-mono font-medium text-[11px]">
                    {item.totalPrice.value !== null
                      ? formatCurrency(item.totalPrice.value)
                      : "—"}
                  </span>

                  {/* Render verified spatial bounding box ONLY when real coordinates exist */}
                  {hasCoordinates && item.code.boundingBox && (
                    <div
                      className="absolute border border-teal-500 bg-teal-500/10 pointer-events-none rounded-xs"
                      style={{
                        left: `${item.code.boundingBox.x}%`,
                        top: `${item.code.boundingBox.y}%`,
                        width: `${item.code.boundingBox.width}%`,
                        height: `${item.code.boundingBox.height}%`,
                      }}
                      title="Verified OCR evidence coordinates"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stated Header Total Block */}
          <div className="mt-6 pt-3 border-t-2 border-border flex justify-between items-end">
            <div className="text-[10px] text-muted-foreground max-w-[200px]">
              <p>Printed Provider Bill Statement</p>
              <p className="font-mono mt-0.5">
                SHA256: {claim.document.checksumSha256?.substring(0, 16)}...
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                Stated Statement Total
              </span>
              <span className="text-base font-bold font-mono tracking-tight text-foreground">
                {claim.totals.statedBilledTotal.value !== null
                  ? formatCurrency(claim.totals.statedBilledTotal.value)
                  : "— Not detected (null)"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
