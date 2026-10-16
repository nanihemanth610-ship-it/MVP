import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { UploadPage } from "./UploadPage";
import { getDataAccess } from "@/services/data-access";
import type { UserRole } from "@/types/contracts";

// Polyfill URL.createObjectURL / revokeObjectURL for JSDOM
if (typeof window.URL.createObjectURL === "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (typeof window.URL.revokeObjectURL === "undefined") {
  window.URL.revokeObjectURL = vi.fn();
}

function renderUploadPage(role: UserRole = "hospital_staff") {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/upload"]}>
              <Routes>
                <Route path="/upload" element={<UploadPage />} />
                <Route
                  path="/review/:id"
                  element={
                    <div data-testid="review-workspace-target">
                      Review Workspace Loaded
                    </div>
                  }
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("UploadPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders the dropzone, supported formats, camera scan trigger, and 1-click preset encounters", async () => {
    renderUploadPage();

    expect(
      screen.getByText(/Document Ingestion & OCR Extraction/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Drag and drop hospital bill document/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PDF, JPG, PNG \(up to 15MB\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mobile camera scan/i }),
    ).toBeInTheDocument();

    // Verify synthetic presets are rendered
    expect(
      screen.getByText(/Apollo Hospitals, Bengaluru/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fortis Memorial Research Institute/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Max Super Speciality Hospital/i),
    ).toBeInTheDocument();

    // Check camera capture input with capture="environment" exists
    const cameraInput = document.querySelector(
      'input[capture="environment"]',
    ) as HTMLInputElement;
    expect(cameraInput).not.toBeNull();
    expect(cameraInput.accept).toContain("image/");
  });

  it("shows insurer perspective alert when active role is insurer reviewer", async () => {
    renderUploadPage("insurer_reviewer");

    expect(
      screen.getByText(/Insurer Reviewer Perspective/i),
    ).toBeInTheDocument();
  });

  it("rejects unsupported file formats with clear error alert", async () => {
    renderUploadPage();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const invalidFile = new File(["binary-data"], "malicious_script.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    const errorElements = await screen.findAllByText(
      /Unsupported file format/i,
    );
    expect(errorElements.length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Please upload a PDF, PNG, or JPEG file/i)[0],
    ).toBeInTheDocument();
  });

  it("rejects files exceeding the 15MB size limit", async () => {
    renderUploadPage();
    const user = userEvent.setup();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Create a mock large file with size > 15MB
    const largeContent = new Uint8Array(16 * 1024 * 1024);
    const largeFile = new File([largeContent], "huge_hospital_record.pdf", {
      type: "application/pdf",
    });

    await user.upload(fileInput, largeFile);

    const errorElements = await screen.findAllByText(
      /exceeds the maximum limit of 15MB/i,
    );
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it("stages a valid document, displays metadata, multipage controls, and allows removing it", async () => {
    renderUploadPage();
    const user = userEvent.setup();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const validFile = new File(
      ["sample pdf content"],
      "memorial_patient_bill.pdf",
      {
        type: "application/pdf",
      },
    );

    await user.upload(fileInput, validFile);

    // Metadata card appears
    expect(
      await screen.findByText("Document Ready for Ingestion"),
    ).toBeInTheDocument();
    expect(screen.getByText("memorial_patient_bill.pdf")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /extract & reconcile/i }),
    ).toBeInTheDocument();

    // Multipage selection buttons exist
    expect(screen.getByRole("button", { name: "2 Pages" })).toBeInTheDocument();

    // Remove file resets back to dropzone
    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(
      screen.getByText(/Drag and drop hospital bill document/i),
    ).toBeInTheDocument();
  });

  it("allows user to cancel an in-progress extraction cleanly", async () => {
    renderUploadPage();
    const user = userEvent.setup();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const validFile = new File(["sample bill"], "hospital_scan.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    const extractBtn = await screen.findByRole("button", {
      name: /extract & reconcile/i,
    });
    await user.click(extractBtn);

    // Multi-stage stepper appears with cancel button
    const cancelBtn = await screen.findByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Click cancel
    await user.click(cancelBtn);

    // Extraction stops, returns to ready/staged state
    await waitFor(() => {
      expect(
        screen.queryByText(/AI Multimodal Pipeline Active/i),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /extract & reconcile/i }),
    ).toBeEnabled();
  });

  it("handles recoverable extraction failures and allows retry", async () => {
    renderUploadPage();
    const user = userEvent.setup();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    // File name containing "corrupt" triggers simulated OCR stream failure in gemini adapter
    const corruptFile = new File(["corrupted data"], "corrupt_invoice.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, corruptFile);

    const extractBtn = await screen.findByRole("button", {
      name: /extract & reconcile/i,
    });
    await user.click(extractBtn);

    // Recoverable error alert appears with Retry button
    expect(
      await screen.findByText(/Extraction Failed \(Recoverable\)/i),
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry extraction/i });
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry attempts extraction again
    await user.click(retryBtn);
    expect(
      await screen.findByText(/AI Multimodal Pipeline Active/i),
    ).toBeInTheDocument();
  });

  it("executes multi-stage AI extraction and redirects to review workspace", async () => {
    renderUploadPage();
    const user = userEvent.setup();

    // Click Apollo Hospitals ER preset
    const presetCard = screen.getByLabelText(
      /Load Apollo Hospitals ER encounter/i,
    );
    await user.click(presetCard);

    // Multi-stage stepper appears
    expect(
      await screen.findByText(/AI Multimodal Pipeline Active/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pre-processing Document/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Optical Character Recognition/i),
    ).toBeInTheDocument();

    // Waits for extraction to complete and navigate to review workspace
    await waitFor(
      () => {
        expect(
          screen.getByTestId("review-workspace-target"),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
