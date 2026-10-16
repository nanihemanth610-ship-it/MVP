import { useState, useRef, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  Camera,
  X,
  Layers,
  Minimize2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/context/RoleContext";
import { getDataAccess } from "@/services/data-access";
import {
  compressImageIfSafe,
  type CompressionResult,
} from "@/lib/image-compressor";
import type { ExtractionProgressStep } from "@/types/contracts";
import {
  submitClaim,
  type ClaimSubmissionResponse,
} from "@/services/claim-submission";
import { MOCK_CLAIM_DISCREPANCY, MOCK_CLAIM_CLEAN } from "@/data/mock-claims";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type SimulationScenario = "discrepancy" | "clean" | "missing_codes";

export function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const cameraInputId = useId();

  // Guard against double submission
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>("discrepancy");
  const [pageCount, setPageCount] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] =
    useState<CompressionResult | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [claimSubmissionType, setClaimSubmissionType] = useState<
    "Cashless" | "Reimbursement"
  >("Cashless");
  const [patientConsentChecked, setPatientConsentChecked] = useState(true);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<ClaimSubmissionResponse | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ExtractionProgressStep[]>([
    {
      id: "stage-1",
      label: "Pre-processing Document",
      status: "idle",
      detail: "Deskew, noise reduction, and contrast normalization",
    },
    {
      id: "stage-2",
      label: "Optical Character Recognition",
      status: "idle",
      detail: "Scanning tabular regions, headers, and encounter metadata",
    },
    {
      id: "stage-3",
      label: "Extracting Medical Fields & Codes",
      status: "idle",
      detail: "Mapping CPT/HCPCS codes, quantities, and rates",
    },
    {
      id: "stage-4",
      label: "Arithmetic & Policy Validation",
      status: "idle",
      detail: "Verifying itemized calculations against stated bill total",
    },
  ]);

  // Clean up object URLs on unmount or file change (strict privacy: zero leaked URLs)
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Cancel any running extraction on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const validateFile = (file: File): string | null => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const isExtensionValid = ACCEPTED_EXTENSIONS.includes(extension);
    const isMimeValid =
      file.type === "" || ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase());

    if (!isExtensionValid && !isMimeValid) {
      return `Unsupported file format (${file.name}). Please upload a PDF, PNG, or JPEG file.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum limit of 15MB.`;
    }

    return null;
  };

  const handleFileSelection = async (file: File) => {
    setValidationError(null);
    setExtractionError(null);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      toast({
        title: "File Rejected",
        description: error,
        variant: "error",
      });
      return;
    }

    // In-browser image compression when safe, preserving text readability
    setIsCompressing(true);
    try {
      const compression = await compressImageIfSafe(file);
      if (compression.wasCompressed) {
        setSelectedFile(compression.file);
        setCompressionInfo(compression);
        toast({
          title: "Image Optimized for OCR",
          description: `Compressed ${formatFileSize(compression.originalSize)} → ${formatFileSize(compression.compressedSize)} (${Math.round(compression.savingsRatio * 100)}% saved) preserving text clarity.`,
          variant: "default",
        });
      } else {
        setSelectedFile(file);
        setCompressionInfo(null);
      }
    } catch {
      setSelectedFile(file);
      setCompressionInfo(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelection(droppedFile);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        handleFileSelection(file);
      }
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setCompressionInfo(null);
    setValidationError(null);
    setExtractionError(null);
    setPageCount(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    isSubmittingRef.current = false;
    toast({
      title: "Extraction Cancelled",
      description: "Document processing was stopped by user request.",
      variant: "default",
    });
  };

  const runExtraction = async (
    fileToProcess: File | Blob,
    chosenScenario: SimulationScenario,
    pages: number = 1,
  ) => {
    // Double submission protection guard
    if (isSubmittingRef.current || isProcessing) {
      return;
    }
    isSubmittingRef.current = true;
    setIsProcessing(true);
    setValidationError(null);
    setExtractionError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Reset progress steps to running/idle
    setProgressSteps([
      {
        id: "stage-1",
        label: "Pre-processing Document",
        status: "running",
        detail: "Deskew, noise reduction, and contrast normalization...",
      },
      {
        id: "stage-2",
        label: "Optical Character Recognition",
        status: "idle",
        detail: "Scanning tabular regions, headers, and encounter metadata",
      },
      {
        id: "stage-3",
        label: "Extracting Medical Fields & Codes",
        status: "idle",
        detail: "Mapping CPT/HCPCS codes, quantities, and rates",
      },
      {
        id: "stage-4",
        label: "Arithmetic & Policy Validation",
        status: "idle",
        detail: "Verifying itemized calculations against stated bill total",
      },
    ]);

    try {
      const dataAccess = getDataAccess();
      const response = await dataAccess.extractBillDocument(
        {
          file: fileToProcess,
          presetId: chosenScenario,
          pageCount: pages,
        },
        (step) => {
          setProgressSteps((prev) => {
            const index = prev.findIndex((s) => s.id === step.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = step;
              return updated;
            }
            return [...prev, step];
          });
        },
        controller.signal,
      );

      toast({
        title: "Extraction Complete",
        description: `Successfully parsed ${response.claim.claimNumber} (${response.claim.hospital.providerName.value}). Redirecting...`,
        variant: "success",
      });

      setTimeout(() => {
        navigate(`/review/${response.claim.id}`);
      }, 700);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Cancelled by user - not an error
        return;
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Vision extraction pipeline encountered an issue. Please verify the document and retry.";

      setExtractionError(errorMessage);
      toast({
        title: "Extraction Error",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
      isSubmittingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handleExtractSelected = async () => {
    if (!selectedFile) return;
    await runExtraction(selectedFile, scenario, pageCount);
  };

  const handleRetry = async () => {
    if (selectedFile) {
      await runExtraction(selectedFile, scenario, pageCount);
    }
  };

  const handleQuickLoadPreset = async (presetId: SimulationScenario) => {
    const fakeBlob = new Blob(
      [`Synthetic bill document for preset: ${presetId}`],
      {
        type: "application/pdf",
      },
    );
    const mockFileName =
      presetId === "clean"
        ? "fortis_surgical_inpatient_clean.pdf"
        : presetId === "missing_codes"
          ? "max_oncology_specialty_rx.pdf"
          : "apollo_emergency_admission_discrepancy.pdf";

    const mockFile = new File([fakeBlob], mockFileName, {
      type: "application/pdf",
    });
    setSelectedFile(mockFile);
    setScenario(presetId);
    setCompressionInfo(null);
    setPageCount(presetId === "missing_codes" ? 2 : 1);
    await runExtraction(
      mockFile,
      presetId,
      presetId === "missing_codes" ? 2 : 1,
    );
  };

  const handleDirectClaimSubmission = async () => {
    if (!patientConsentChecked) {
      toast({
        title: "Consent Required",
        description:
          "Patient/policyholder consent is mandatory before submitting a claim.",
        variant: "error",
      });
      return;
    }

    setIsSubmittingClaim(true);
    setSubmissionResult(null);

    try {
      const targetClaim =
        scenario === "clean" ? MOCK_CLAIM_CLEAN : MOCK_CLAIM_DISCREPANCY;
      const res = await submitClaim({
        claim: targetClaim,
        claimType: claimSubmissionType,
        patientConsent: true,
        actorName: role === "hospital_staff" ? "Pooja Hegde" : "Aarav Sharma",
        actorRole: role,
      });

      setSubmissionResult(res);
      toast({
        title: "Claim Submitted Successfully",
        description: `Claim ${res.claimRef} registered successfully.`,
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit claim";
      toast({
        title: "Submission Error",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 max-w-4xl mx-auto">
      {/* Hidden file inputs for file picker and mobile camera capture */}
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        id={cameraInputId}
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Document Ingestion & OCR Extraction
          </h1>
          <Badge variant="teal">Gemini Vision Multimodal</Badge>
          <Badge variant="secondary">Synthetic Bills Only</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Upload itemized medical bills, UB-04 institutional statements, or
          CMS-1500 forms (PDF, PNG, JPG). Private files are processed in local
          memory without exposing public URLs.
        </p>
      </div>

      {/* Role Notice for Insurer Adjudicators */}
      {role === "insurer_reviewer" && (
        <Alert variant="info" className="bg-primary/5 border-primary/20">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle className="text-xs font-semibold">
            Insurer Reviewer Perspective
          </AlertTitle>
          <AlertDescription className="text-xs">
            In standard production workflows, healthcare providers upload and
            submit encounters to your adjudication queue. You can
            test bill ingestion below or evaluate pre-submitted claims in the{" "}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs underline font-medium"
              onClick={() => navigate("/dashboard")}
            >
              Reconciliation Dashboard
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <Alert
          variant="destructive"
          className="animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">
            Ingestion Issue
          </AlertTitle>
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>{validationError}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => setValidationError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Recoverable Extraction Error Alert with Retry Action */}
      {extractionError && (
        <Alert
          variant="destructive"
          className="animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">
            Extraction Failed (Recoverable)
          </AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>{extractionError}</p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background text-foreground"
                onClick={handleRetry}
                disabled={isProcessing}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Extraction
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setExtractionError(null)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Ingestion Workspace */}
      {!selectedFile ? (
        <Card
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-dashed border-2 transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
              : "border-border/90 bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Upload medical bill document. Drop file here or press Enter to browse."
        >
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-transform duration-200 ${
                isDragging
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <UploadCloud className="h-7 w-7 stroke-[1.8]" />
            </div>

            <h3 className="text-base font-semibold text-foreground">
              {isDragging
                ? "Drop your bill here to upload"
                : "Drag and drop hospital bill document"}
            </h3>
            <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
              Supports PDF, JPG, and PNG files up to 15MB. Large phone camera
              photos are safely compressed in-browser while preserving critical
              OCR text legibility.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </Button>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Mobile Camera Scan
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground mt-2 block">
              PDF, JPG, PNG (up to 15MB)
            </span>
          </CardContent>
        </Card>
      ) : (
        /* Staged File Workspace */
        <Card
          variant="glass"
          className="border-border/90 animate-in fade-in duration-200"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Document Ready for Ingestion
                </CardTitle>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFile}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Review document metadata, verify OCR compression, and choose
              target extraction parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-background/80 border border-border/80">
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                    <img
                      src={previewUrl}
                      alt="Uploaded bill thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-7 w-7 stroke-[1.6]" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </p>
                    {compressionInfo && (
                      <Badge
                        variant="teal"
                        className="text-[9px] py-0 px-1.5 flex items-center gap-0.5"
                      >
                        <Minimize2 className="h-2.5 w-2.5" />
                        OCR Optimized
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </span>
                    {compressionInfo && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        (saved {Math.round(compressionInfo.savingsRatio * 100)}
                        %)
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-mono py-0 px-1.5"
                    >
                      {selectedFile.type || "Document"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Layers className="h-3 w-3" />
                      {pageCount} {pageCount === 1 ? "page" : "pages"}
                    </span>
                  </div>
                </div>
              </div>

              {!isProcessing && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    onClick={handleExtractSelected}
                    disabled={isProcessing || isCompressing}
                    className="font-medium shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Extract & Reconcile
                  </Button>
                </div>
              )}
            </div>

            {/* Multipage Document Settings & Scenario Calibration */}
            {!isProcessing && (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Page Count Setting */}
                <div className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Document Pages
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Multipage Scanning
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPageCount(num)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          pageCount === num
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {num} {num === 1 ? "Page" : "Pages"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulation Scenario Calibration */}
                <div className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Target OCR Scenario
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Calibration
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScenario("discrepancy")}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all text-center truncate ${
                        scenario === "discrepancy"
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      title="Simulate calculation discrepancy"
                    >
                      Mismatch (-₹1,500)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenario("clean")}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all text-center truncate ${
                        scenario === "clean"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      title="Simulate 100% clean reconciliation"
                    >
                      Clean (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenario("missing_codes")}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all text-center truncate ${
                        scenario === "missing_codes"
                          ? "border-sky-500 bg-sky-500/10 text-sky-900 dark:text-sky-200"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      title="Simulate missing procedure codes"
                    >
                      Missing Codes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-Stage AI Progress Stepper with Cancel Action */}
      {isProcessing && (
        <Card
          variant="glass"
          className="border-primary/30 shadow-md animate-in slide-in-from-bottom-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                <CardTitle className="text-sm font-semibold">
                  AI Multimodal Pipeline Active
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="teal" className="text-[10px]">
                  Gemini 1.5 Pro Vision
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelExtraction}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive border-border/80"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Ingesting document, extracting tabular itemizations, and auditing
              calculations...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {progressSteps.map((step) => {
              const isRunning = step.status === "running";
              const isCompleted = step.status === "completed";

              return (
                <div
                  key={step.id}
                  className={`flex items-start justify-between p-2.5 rounded-lg transition-colors duration-200 text-xs ${
                    isRunning
                      ? "bg-primary/10 border border-primary/20"
                      : isCompleted
                        ? "bg-emerald-500/5"
                        : "opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : isRunning ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0 mt-1 mx-0.5" />
                    )}
                    <div>
                      <span
                        className={`font-medium ${
                          isRunning
                            ? "text-primary font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant={
                      isCompleted ? "success" : isRunning ? "info" : "outline"
                    }
                    className="text-[10px] capitalize shrink-0 ml-2 py-0 px-1.5"
                  >
                    {step.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 1-Click Quick-Load Synthetic Test Encounters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Or Quick-Load Synthetic Test Encounters
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Test end-to-end reconciliation on pre-configured hospital
              encounters with verified ground truth.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Preset 1: Discrepancy */}
          <Card
            className="cursor-pointer hover:border-amber-500/60 hover:shadow-sm transition-all group border-border/80"
            onClick={() => handleQuickLoadPreset("discrepancy")}
            tabIndex={0}
            role="button"
            aria-label="Load Apollo Hospitals ER encounter with arithmetic discrepancy"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleQuickLoadPreset("discrepancy");
              }
            }}
          >
            <CardHeader className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="warning" className="text-[10px]">
                  Math Mismatch (-₹1,500.00)
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <div>
                <CardTitle className="text-sm">
                  Apollo Hospitals, Bengaluru
                </CardTitle>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Emergency Trauma • ₹48,500.00
                </span>
              </div>
              <CardDescription className="text-[11px] leading-relaxed">
                Emergency trauma intake with calculation error on line 7 and
                variance against stated bill total.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Preset 2: Clean */}
          <Card
            className="cursor-pointer hover:border-emerald-500/60 hover:shadow-sm transition-all group border-border/80"
            onClick={() => handleQuickLoadPreset("clean")}
            tabIndex={0}
            role="button"
            aria-label="Load Fortis Memorial Research Institute encounter with 100% clean reconciliation"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleQuickLoadPreset("clean");
              }
            }}
          >
            <CardHeader className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="text-[10px]">
                  Clean 100% Reconciled
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <div>
                <CardTitle className="text-sm">
                  Fortis Memorial Research Institute
                </CardTitle>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Inpatient Surgical • ₹76,200.00
                </span>
              </div>
              <CardDescription className="text-[11px] leading-relaxed">
                Knee meniscectomy surgery with verified PPN agreed tariff codes
                and exact arithmetic match.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Preset 3: Missing Codes */}
          <Card
            className="cursor-pointer hover:border-sky-500/60 hover:shadow-sm transition-all group border-border/80"
            onClick={() => handleQuickLoadPreset("missing_codes")}
            tabIndex={0}
            role="button"
            aria-label="Load Max Super Speciality Hospital encounter with missing billing codes"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleQuickLoadPreset("missing_codes");
              }
            }}
          >
            <CardHeader className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="info" className="text-[10px]">
                  Missing Tariff Codes (2 Pages)
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <div>
                <CardTitle className="text-sm">
                  Max Super Speciality Hospital
                </CardTitle>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Day-Care Oncology • ₹32,750.00
                </span>
              </div>
              <CardDescription className="text-[11px] leading-relaxed">
                Chemotherapy infusion billing with missing tariff codes across 2
                statement pages.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Phase 3: Direct Claim Ingestion & Submission Boundary */}
      <Card className="border-border/80">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Submit Claim to Insurer (Cashless & Reimbursement)
              </CardTitle>
            </div>
            <Badge variant="teal" className="text-[10px]">
              PHASE 3 END-TO-END
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Submits the active claim through the server-side API boundary,
            validates patient consent and idempotency, triggers configured n8n
            workflows, and appends the immutable audit event to
            public.claim_events.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Settlement Pathway:
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    claimSubmissionType === "Cashless" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setClaimSubmissionType("Cashless")}
                  className="flex-1 text-xs h-8"
                >
                  Cashless (Pre-Auth)
                </Button>
                <Button
                  type="button"
                  variant={
                    claimSubmissionType === "Reimbursement"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setClaimSubmissionType("Reimbursement")}
                  className="flex-1 text-xs h-8"
                >
                  Reimbursement
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Target Encounter Source:
              </label>
              <div className="p-2 rounded border bg-muted/30 text-xs">
                <span className="font-semibold text-foreground">
                  {scenario === "clean"
                    ? "Fortis Memorial (Clean ₹76,200)"
                    : "Apollo Hospitals (₹48,500 Discrepancy)"}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Includes line items, itemized calculations, and tariff codes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={patientConsentChecked}
                onChange={(e) => setPatientConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-foreground leading-relaxed">
                <strong>Mandatory Patient Consent:</strong> I confirm that the
                patient/policyholder has authorized electronic transmission of
                this itemized medical statement and tariff records for insurance
                adjudication.
              </span>
            </label>
          </div>

          {submissionResult && (
            <Alert
              variant={submissionResult.success ? "success" : "destructive"}
              className="py-2.5"
            >
              <AlertTitle className="text-xs font-semibold">
                {submissionResult.success
                  ? "Claim Submission Succeeded"
                  : "Submission Failed"}
              </AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>{submissionResult.message}</p>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono pt-1 text-muted-foreground">
                  <span>Claim Ref: {submissionResult.claimRef}</span>
                  <span>•</span>
                  <span>n8n: {submissionResult.n8nStatus}</span>
                  <span>•</span>
                  <span>
                    Mode:{" "}
                    {submissionResult.simulated ? "VERIFIED" : "LIVE"}
                  </span>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() =>
                      navigate(`/claims/${submissionResult.claimId}`)
                    }
                  >
                    View Claim Details
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs h-7"
                    onClick={() => navigate("/claims")}
                  >
                    Go to Claims Registry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground">
              Protected by unique idempotency token to prevent duplicate payer
              submissions.
            </p>
            <Button
              onClick={handleDirectClaimSubmission}
              disabled={isSubmittingClaim || !patientConsentChecked}
              className="gap-2 text-xs font-semibold"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isSubmittingClaim
                ? "Submitting..."
                : `Submit ${claimSubmissionType} Claim`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
