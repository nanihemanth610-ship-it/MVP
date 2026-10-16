import * as React from "react";
import {
  FileText,
  AlertTriangle,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Stethoscope,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/ThemeContext";

export function DesignSystemShowcase() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("99285");
  const [selectValue, setSelectValue] = React.useState("under_review");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors p-4 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header with Theme Switcher */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                BillBridge Design System
              </h1>
              <Badge variant="teal">v0.2.0</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Apple-inspired clarity, disciplined glassmorphism, accessible
              navy/ink text, and calm healthcare tokens.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card p-1 shadow-xs">
            <Button
              size="sm"
              variant={theme === "light" ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setTheme("light")}
              aria-label="Light mode"
            >
              <Sun className="h-3.5 w-3.5 mr-1" /> Light
            </Button>
            <Button
              size="sm"
              variant={theme === "dark" ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setTheme("dark")}
              aria-label="Dark mode"
            >
              <Moon className="h-3.5 w-3.5 mr-1" /> Dark
            </Button>
            <Button
              size="sm"
              variant={theme === "system" ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setTheme("system")}
              aria-label="System theme"
            >
              <Laptop className="h-3.5 w-3.5 mr-1" /> System ({resolvedTheme})
            </Button>
          </div>
        </header>

        {/* Tabs to categorize components */}
        <Tabs defaultValue="primitives">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="primitives">Primitives</TabsTrigger>
            <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          {/* TAB 1: Primitives (Buttons, Badges, Inputs, Selects) */}
          <TabsContent value="primitives" className="space-y-8 pt-4">
            {/* Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Buttons & Actions</CardTitle>
                <CardDescription>
                  Interactive button variants with high-contrast focus rings and
                  motion-safe transitions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="default">Primary Action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="teal">Teal Accent</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Inline Link</Button>
                  <Button disabled>Disabled</Button>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small (32px)</Button>
                  <Button size="default">Default (36px)</Button>
                  <Button size="lg">Large (40px)</Button>
                  <Button size="icon" aria-label="Quick Action">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Status Badges</CardTitle>
                <CardDescription>
                  Healthcare claim lifecycle badges with semantic colors and
                  high contrast.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="default">Default Blue</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" /> Reconciled
                  </Badge>
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3" /> Discrepancy Found
                  </Badge>
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" /> Math Mismatch
                  </Badge>
                  <Badge variant="teal">
                    <ShieldCheck className="h-3 w-3" /> Verified by Payer
                  </Badge>
                  <Badge variant="info">
                    <Info className="h-3 w-3" /> Under Review
                  </Badge>
                  <Badge variant="outline">Neutral Outline</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Form Inputs & Select */}
            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>
                  Inputs, labels, and selects with accessible keyboard focus
                  rings.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cpt-input" required>
                    CPT / HCPCS Procedure Code
                  </Label>
                  <Input
                    id="cpt-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 99285"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Standard 5-digit medical billing code.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-select" required>
                    Claim Status Lifecycle
                  </Label>
                  <Select
                    id="status-select"
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                  >
                    <option value="draft">Draft (Ingestion)</option>
                    <option value="extracted">Extracted (AI Vision)</option>
                    <option value="under_review">Under Human Review</option>
                    <option value="flagged">Flagged with Discrepancy</option>
                    <option value="approved">Approved for Adjudication</option>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Select current state of workflow.
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="error-input">
                    Simulated Error Input State
                  </Label>
                  <Input
                    id="error-input"
                    defaultValue="INVALID_AMOUNT_999"
                    hasError
                    aria-invalid="true"
                    aria-describedby="input-error-desc"
                  />
                  <p
                    id="input-error-desc"
                    className="text-[11px] text-destructive"
                  >
                    Currency value contains non-numeric characters.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Surfaces & Glassmorphism */}
          <TabsContent value="surfaces" className="space-y-8 pt-4">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Default Card */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Default Surface</CardTitle>
                  <CardDescription>
                    Opaque canvas card with soft border
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Solid clean card for dense data entry, forms, and tables. Zero
                  visual distraction.
                </CardContent>
                <CardFooter>
                  <Badge variant="outline">Solid</Badge>
                </CardFooter>
              </Card>

              {/* Glass Card */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Glassmorphic Surface</CardTitle>
                  <CardDescription>
                    Subtle backdrop blur for summaries
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Calm Apple-like 75% opacity blur for metrics, navigation dock,
                  and modal overlays.
                </CardContent>
                <CardFooter>
                  <Badge variant="teal">Disciplined Glass</Badge>
                </CardFooter>
              </Card>

              {/* Subtle Card */}
              <Card variant="subtle">
                <CardHeader>
                  <CardTitle>Subtle Tint Surface</CardTitle>
                  <CardDescription>Low-contrast inset section</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Ideal for secondary metadata blocks, file attachments, and
                  preview sidebars.
                </CardContent>
                <CardFooter>
                  <Badge variant="secondary">Secondary</Badge>
                </CardFooter>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Medical Itemized Table</CardTitle>
                <CardDescription>
                  Tabular financial figures with precise right-aligned currency
                  and status badges.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-medium">
                        99285
                      </TableCell>
                      <TableCell>Emergency department visit, Level 5</TableCell>
                      <TableCell className="text-right">1</TableCell>
                      <TableCell className="text-right">$2,100.00</TableCell>
                      <TableCell className="text-right font-medium">
                        $2,100.00
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">
                          Verified
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-medium">
                        70450
                      </TableCell>
                      <TableCell>CT head/brain without contrast</TableCell>
                      <TableCell className="text-right">1</TableCell>
                      <TableCell className="text-right">$1,350.00</TableCell>
                      <TableCell className="text-right font-medium">
                        $1,350.00
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">
                          Verified
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-destructive/5">
                      <TableCell className="font-mono font-medium text-destructive">
                        96360
                      </TableCell>
                      <TableCell>Intravenous hydration infusion</TableCell>
                      <TableCell className="text-right">2</TableCell>
                      <TableCell className="text-right">$400.00</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        $1,200.00
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="text-[10px]">
                          Math Error
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Feedback & Alerts */}
          <TabsContent value="feedback" className="space-y-6 pt-4">
            <div className="grid gap-4">
              <Alert variant="warning">
                <AlertTitle>Arithmetic Variance Detected</AlertTitle>
                <AlertDescription>
                  Billed statement total ($6,420.00) does not match the sum of
                  itemized charges ($6,270.00). A $150.00 variance requires
                  human review.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTitle>Line Item Calculation Mismatch</AlertTitle>
                <AlertDescription>
                  Line 7: 2 units at $400.00 should total $800.00, but is billed
                  as $1,200.00.
                </AlertDescription>
              </Alert>

              <Alert variant="success">
                <AlertTitle>All Codes Reconciled Cleanly</AlertTitle>
                <AlertDescription>
                  No discrepancies found. All 4 line items match stated total
                  with 98.2% AI confidence.
                </AlertDescription>
              </Alert>

              <Alert variant="info">
                <AlertTitle>Demographic Cross-Check</AlertTitle>
                <AlertDescription>
                  Patient account #ACC-2026-9041 matched with historical member
                  profile for Elena Rostova.
                </AlertDescription>
              </Alert>
            </div>

            {/* Skeletons */}
            <Card>
              <CardHeader>
                <CardTitle>Loading Skeletons</CardTitle>
                <CardDescription>
                  Subtle shimmers for OCR processing states.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>

            {/* Toasts Trigger Card */}
            <Card>
              <CardHeader>
                <CardTitle>Toast Notifications</CardTitle>
                <CardDescription>
                  Trigger non-blocking accessible status toasts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Claim Saved as Draft",
                      description:
                        "Changes stored locally in offline database.",
                      variant: "default",
                    })
                  }
                >
                  Info Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Extraction Complete",
                      description:
                        "Successfully processed 7 line items with 94% confidence.",
                      variant: "success",
                    })
                  }
                >
                  Success Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Variance Alert",
                      description:
                        "Stated bill total does not match line item sum.",
                      variant: "warning",
                    })
                  }
                >
                  Warning Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Validation Error",
                      description: "Please fix math errors before submission.",
                      variant: "error",
                    })
                  }
                >
                  Error Toast
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Composite Patterns */}
          <TabsContent value="patterns" className="space-y-8 pt-4">
            {/* Modal Dialog */}
            <Card>
              <CardHeader>
                <CardTitle>Accessible Dialogs</CardTitle>
                <CardDescription>
                  Modal dialog with focus trapping, backdrop blur, and Escape
                  key dismissal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Open Document Preview Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Document Preview — Apex Surgical Bill
                      </DialogTitle>
                      <DialogDescription>
                        Scanned PDF document uploaded on 2026-09-15.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border bg-muted/30 p-6 text-center text-xs text-muted-foreground my-2">
                      <FileText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
                      <p className="font-medium text-foreground">
                        apex_surgical_bill_clean.pdf
                      </p>
                      <p className="mt-1">
                        428.1 KB • 1 Page • Stated Total: $4,850.00
                      </p>
                    </div>
                    <DialogFooter>
                      <Button size="sm" onClick={() => setDialogOpen(false)}>
                        Close Preview
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Reject Claim Confirmation
                </Button>

                <ConfirmDialog
                  open={confirmOpen}
                  onOpenChange={setConfirmOpen}
                  title="Reject Insurance Claim?"
                  description="Are you sure you want to reject claim CLM-2026-34901? A formal denial notice will be queued for the hospital billing department."
                  confirmLabel="Yes, Reject Claim"
                  variant="destructive"
                  onConfirm={() => {
                    toast({
                      title: "Claim Rejected",
                      description: "Claim status updated to 'rejected'.",
                      variant: "error",
                    });
                  }}
                />
              </CardContent>
            </Card>

            {/* Empty State */}
            <EmptyState
              title="No Pending Discrepancies"
              description="All uploaded claims in your queue have been validated and approved. Upload a new hospital bill to begin OCR extraction."
              actionLabel="Upload New Bill"
              onAction={() =>
                toast({
                  title: "Action Triggered",
                  description: "Navigating to bill upload dropzone.",
                  variant: "default",
                })
              }
              secondaryActionLabel="Refresh Queue"
              onSecondaryAction={() =>
                toast({
                  title: "Queue Refreshed",
                  description:
                    "Latest claim records loaded from local storage.",
                  variant: "default",
                })
              }
            />

            {/* Error State */}
            <ErrorState
              title="Failed to Connect to Gemini Vision"
              message="The document OCR service could not process the uploaded file due to an unreadable scan resolution or network timeout."
              technicalDetails="HTTP 504 Gateway Timeout: Multimodal vision endpoint did not respond within 15000ms. Code: GEMINI_TIMEOUT_ERR_04."
              onRetry={() =>
                toast({
                  title: "Retrying Extraction",
                  description: "Submitting bill back to AI vision queue.",
                  variant: "default",
                })
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
