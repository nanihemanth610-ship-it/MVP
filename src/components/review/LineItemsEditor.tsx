import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { roundToCents } from "@/services/arithmetic-engine";
import type { LineItem, MedicalCodeType } from "@/types/contracts";

interface LineItemsEditorProps {
  lineItems: LineItem[];
  onChange: (updatedItems: LineItem[]) => void;
  onSelectItem?: (lineItemId: string) => void;
  selectedLineItemId?: string | null;
  readOnly?: boolean;
}

export function LineItemsEditor({
  lineItems,
  onChange,
  onSelectItem,
  selectedLineItemId,
  readOnly = false,
}: LineItemsEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    code: string;
    codeType: MedicalCodeType;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  } | null>(null);

  const startEdit = (item: LineItem) => {
    if (readOnly) return;
    setEditingId(item.id);
    setEditValues({
      code: item.code.value || "",
      codeType: item.codeType || "CPT",
      description: item.description.value || "",
      quantity: item.quantity.value || 1,
      unitPrice: item.unitPrice.value || 0,
      totalPrice: item.totalPrice.value || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = (itemId: string) => {
    if (!editValues) return;

    const updated = lineItems.map((item) => {
      if (item.id !== itemId) return item;

      const qty = Math.max(0, editValues.quantity);
      const unit = Math.max(0, editValues.unitPrice);
      const expected = roundToCents(qty * unit);
      const total = roundToCents(editValues.totalPrice);
      const isMathMismatch = Math.abs(expected - total) > 0.01;

      return {
        ...item,
        code: {
          ...item.code,
          value: editValues.code.trim() !== "" ? editValues.code.trim() : null,
          status: "corrected" as const,
          isUnreadable: editValues.code.trim() === "",
        },
        codeType: editValues.codeType,
        description: {
          ...item.description,
          value: editValues.description,
          status: "corrected" as const,
        },
        quantity: {
          ...item.quantity,
          value: qty,
          status: "corrected" as const,
        },
        unitPrice: {
          ...item.unitPrice,
          value: unit,
          status: "corrected" as const,
        },
        totalPrice: {
          ...item.totalPrice,
          value: total,
          status: "corrected" as const,
          isFlagged: isMathMismatch,
        },
        expectedTotal: expected,
        isMathMismatch,
      };
    });

    onChange(updated);
    cancelEdit();
  };

  const handleAddLineItem = () => {
    if (readOnly) return;
    const nextLineNumber = lineItems.length + 1;
    const newItemId = `li-manual-${Date.now()}`;

    const newItem: LineItem = {
      id: newItemId,
      lineNumber: nextLineNumber,
      code: {
        value: "99213",
        rawText: "99213",
        status: "corrected",
        confidence: 1.0,
        isUnreadable: false,
        isFlagged: false,
      },
      codeType: "CPT",
      description: {
        value: "Office Visit Outpatient (Level 3)",
        rawText: "Office Visit Outpatient",
        status: "corrected",
        confidence: 1.0,
        isUnreadable: false,
        isFlagged: false,
      },
      quantity: {
        value: 1,
        rawText: "1",
        status: "corrected",
        confidence: 1.0,
        isUnreadable: false,
        isFlagged: false,
      },
      unitPrice: {
        value: 120.0,
        rawText: "120.00",
        status: "corrected",
        confidence: 1.0,
        isUnreadable: false,
        isFlagged: false,
      },
      totalPrice: {
        value: 120.0,
        rawText: "120.00",
        status: "corrected",
        confidence: 1.0,
        isUnreadable: false,
        isFlagged: false,
      },
      expectedTotal: 120.0,
      isMathMismatch: false,
    };

    onChange([...lineItems, newItem]);
    startEdit(newItem);
  };

  const handleDeleteLineItem = (itemId: string) => {
    if (readOnly) return;
    const filtered = lineItems
      .filter((i) => i.id !== itemId)
      .map((item, idx) => ({ ...item, lineNumber: idx + 1 }));
    onChange(filtered);
    if (editingId === itemId) {
      cancelEdit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Extracted Line Items ({lineItems.length})
          </h4>
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLineItem}
            className="h-7 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Line Item
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/80 overflow-x-auto bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="w-24">Code</TableHead>
              <TableHead className="min-w-[180px]">Description</TableHead>
              <TableHead className="w-16 text-right">Qty</TableHead>
              <TableHead className="w-24 text-right">Rate</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-24 text-center">Confidence</TableHead>
              {!readOnly && (
                <TableHead className="w-20 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 7 : 8}
                  className="text-center py-8 text-xs text-muted-foreground italic"
                >
                  No line items extracted. Click &quot;Add Line Item&quot; to
                  input charges.
                </TableCell>
              </TableRow>
            ) : (
              lineItems.map((item) => {
                const isEditing = editingId === item.id;
                const isSelected = selectedLineItemId === item.id;
                const confidence = item.code.confidence;
                const isFlagged =
                  item.isMathMismatch ||
                  item.code.isUnreadable ||
                  confidence < 0.8;

                if (isEditing && editValues) {
                  return (
                    <TableRow key={item.id} className="bg-primary/5">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {item.lineNumber}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editValues.code}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              code: e.target.value,
                            })
                          }
                          className="h-7 text-xs font-mono"
                          placeholder="e.g. 99285"
                          aria-label="Procedure Code"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editValues.description}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              description: e.target.value,
                            })
                          }
                          className="h-7 text-xs"
                          placeholder="Description"
                          aria-label="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={editValues.quantity}
                          onChange={(e) => {
                            const q = parseFloat(e.target.value) || 0;
                            setEditValues({
                              ...editValues,
                              quantity: q,
                              totalPrice: roundToCents(
                                q * editValues.unitPrice,
                              ),
                            });
                          }}
                          className="h-7 text-xs font-mono text-right"
                          aria-label="Quantity"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValues.unitPrice}
                          onChange={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            setEditValues({
                              ...editValues,
                              unitPrice: p,
                              totalPrice: roundToCents(editValues.quantity * p),
                            });
                          }}
                          className="h-7 text-xs font-mono text-right"
                          aria-label="Unit Price"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValues.totalPrice}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              totalPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-7 text-xs font-mono text-right font-semibold"
                          aria-label="Total Price"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[9px]">
                          Editing
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => saveEdit(item.id)}
                            title="Save Line Item"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted"
                            onClick={cancelEdit}
                            title="Cancel Edit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow
                    key={item.id}
                    onClick={() => onSelectItem?.(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : isFlagged
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : undefined
                    }`}
                  >
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {item.lineNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {item.code.value ? (
                        <div className="flex items-center gap-1">
                          <span>{item.code.value}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            ({item.codeType})
                          </span>
                        </div>
                      ) : (
                        <span className="text-destructive font-semibold text-[11px]">
                          — Unreadable (null)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>
                        {item.description.value || "— Not detected (null)"}
                      </div>
                      {item.isMathMismatch && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Math mismatch: {item.quantity.value} ×{" "}
                          {formatCurrency(item.unitPrice.value || 0)} ={" "}
                          {formatCurrency(item.expectedTotal)} (billed:{" "}
                          {formatCurrency(item.totalPrice.value || 0)})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.quantity.value ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item.unitPrice.value !== null
                        ? formatCurrency(item.unitPrice.value)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {item.totalPrice.value !== null
                        ? formatCurrency(item.totalPrice.value)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.code.status === "corrected" ||
                      item.totalPrice.status === "corrected" ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] text-teal-700 dark:text-teal-300"
                        >
                          Corrected
                        </Badge>
                      ) : item.code.isUnreadable ? (
                        <Badge variant="destructive" className="text-[9px]">
                          Missing Code
                        </Badge>
                      ) : item.isMathMismatch ? (
                        <Badge variant="warning" className="text-[9px]">
                          Math Error
                        </Badge>
                      ) : confidence < 0.8 ? (
                        <Badge
                          variant="warning"
                          className="text-[9px] flex items-center gap-0.5 justify-center"
                        >
                          <AlertCircle className="h-2.5 w-2.5" />
                          Needs Review
                        </Badge>
                      ) : (
                        <Badge
                          variant="success"
                          className="text-[9px] flex items-center gap-0.5 justify-center"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {Math.round(confidence * 100)}%
                        </Badge>
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(item);
                            }}
                            title="Edit Line Item"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLineItem(item.id);
                            }}
                            title="Delete Line Item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
