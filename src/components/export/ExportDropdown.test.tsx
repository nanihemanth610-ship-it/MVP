import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportDropdown } from "./ExportDropdown";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { mapRecordToClaim } from "@/services/data-access";
import { MOCK_CLAIM_DISCREPANCY, MOCK_CLAIM_CLEAN } from "@/data/mock-claims";
import * as exportService from "@/services/export-service";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RoleProvider>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </RoleProvider>,
  );
}

describe("ExportDropdown Component", () => {
  const claims = [
    mapRecordToClaim(MOCK_CLAIM_DISCREPANCY),
    mapRecordToClaim(MOCK_CLAIM_CLEAN),
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders export button with count and default text", () => {
    renderWithProviders(<ExportDropdown claims={claims} mode="registry" />);
    const button = screen.getByRole("button", { name: /Export Report/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("disables the button when no claims are available", () => {
    renderWithProviders(<ExportDropdown claims={[]} mode="registry" />);
    const button = screen.getByRole("button", { name: /Export Report/i });
    expect(button).toBeDisabled();
  });

  it("opens format menu with CSV, JSON and Excel notice on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDropdown claims={claims} mode="registry" />);

    const button = screen.getByRole("button", { name: /Export Report/i });
    await user.click(button);

    expect(screen.getByText(/CSV Spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Structured JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/Excel \(\.xlsx\) Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Records/i)).toBeInTheDocument();
  });

  it("executes CSV export and calls onExportSuccess callback", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onStart = vi.fn();

    vi.spyOn(exportService, "exportClaimsRegistry").mockResolvedValue({
      success: true,
      filename: "test_export.csv",
      format: "csv",
      recordCount: 2,
      content: "test",
      isSyntheticDemo: true,
    });

    renderWithProviders(
      <ExportDropdown
        claims={claims}
        mode="registry"
        onExportStart={onStart}
        onExportSuccess={onSuccess}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Export Report/i });
    await user.click(trigger);

    const csvOption = screen.getByText(/CSV Spreadsheet/i);
    await user.click(csvOption);

    expect(onStart).toHaveBeenCalled();
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("handles export failure gracefully and calls onExportError", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    vi.spyOn(exportService, "exportClaimsRegistry").mockRejectedValue(
      new Error("Simulated storage failure during export"),
    );

    renderWithProviders(
      <ExportDropdown
        claims={claims}
        mode="registry"
        onExportError={onError}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Export Report/i });
    await user.click(trigger);

    const jsonOption = screen.getByText(/Structured JSON/i);
    await user.click(jsonOption);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Simulated storage failure during export",
        }),
      );
    });
  });

  it("supports single claim export mode", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.spyOn(exportService, "exportSingleReviewedClaim").mockResolvedValue({
      success: true,
      filename: "single_claim.json",
      format: "json",
      recordCount: 1,
      content: "{}",
      isSyntheticDemo: true,
    });

    renderWithProviders(
      <ExportDropdown
        singleClaim={claims[0]}
        mode="single"
        onExportSuccess={onSuccess}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Export Claim/i });
    expect(trigger).toBeInTheDocument();
    await user.click(trigger);

    const jsonOption = screen.getByText(/Structured JSON/i);
    await user.click(jsonOption);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
