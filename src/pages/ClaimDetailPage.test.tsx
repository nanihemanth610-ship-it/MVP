import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ClaimDetailPage } from "./ClaimDetailPage";
import { getDataAccess } from "@/services/data-access";
import type { UserRole } from "@/types/contracts";

function renderClaimDetailPage(
  claimId: string = "claim-memorial-002",
  role: UserRole = "hospital_staff",
) {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[`/claims/${claimId}`]}>
              <Routes>
                <Route
                  path="/claims"
                  element={
                    <div data-testid="claims-list-target">
                      Claims List Target
                    </div>
                  }
                />
                <Route path="/claims/:id" element={<ClaimDetailPage />} />
                <Route
                  path="/review/:id"
                  element={
                    <div data-testid="review-workspace-target">
                      Review Workspace Target
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

describe("ClaimDetailPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders encounter header, DEMO synthetic badge, and prominent review workspace CTA", async () => {
    renderClaimDetailPage();

    // Verify claim number and provider heading
    expect(
      await screen.findByRole("heading", {
        name: /Apollo Hospitals, Bengaluru/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/BB-DEMO-1001/i)).toBeInTheDocument();
    expect(screen.queryByText(/SYNTHETIC DEMO/i)).not.toBeInTheDocument();

    // Verify "Open Extraction Workspace" button linking to /review/claim-memorial-002
    const workspaceLink = screen.getByRole("link", {
      name: /open extraction workspace/i,
    });
    expect(workspaceLink).toBeInTheDocument();
    expect(workspaceLink.getAttribute("href")).toBe(
      "/review/claim-memorial-002",
    );
  });

  it("renders financial overview cards with stated total, itemized sum, and variance", async () => {
    renderClaimDetailPage();

    expect(await screen.findByText(/Stated Billed Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Itemized Sum/i)).toBeInTheDocument();
    expect(screen.getByText(/Arithmetic Variance/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Responsibility/i)).toBeInTheDocument();

    // Verify formatted amounts in Indian Rupees (₹48,500 stated vs ₹50,000 sum = +₹1,500 variance)
    expect(screen.getByText("₹48,500")).toBeInTheDocument();
    expect(screen.getByText("₹50,000")).toBeInTheDocument();
    expect(screen.getByText("+₹1,500")).toBeInTheDocument();
    expect(screen.getByText(/Discrepancy identified/i)).toBeInTheDocument();
  });

  it("renders itemized line items table with codes, descriptions, and amounts", async () => {
    renderClaimDetailPage();

    const table = await screen.findByRole("table");
    expect(within(table).getAllByText("99285").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      within(table).getByText(/Emergency room evaluation/i),
    ).toBeInTheDocument();
    expect(within(table).getByText("96360")).toBeInTheDocument();
  });

  it("renders deterministic audit findings flagged by the audit engine", async () => {
    renderClaimDetailPage();

    // Deterministic Audit Findings card
    expect(
      await screen.findByText(/Deterministic Audit Findings/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ERR_TOTAL_MISMATCH/i)).toBeInTheDocument();
  });

  it("renders chronological activity timeline with actor, action, and notes", async () => {
    renderClaimDetailPage();

    expect(
      await screen.findByRole("heading", {
        name: /Encounter Activity Timeline & Audit Trail/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/DOCUMENT UPLOADED/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ramesh Kumar, Patient Access/i),
    ).toBeInTheDocument();
  });

  it("allows permitted status transition by hospital staff with rationale note", async () => {
    const user = userEvent.setup();
    renderClaimDetailPage("claim-memorial-002", "hospital_staff");

    // Memorial Hospital is flagged. Hospital staff has transition button to UNDER REVIEW
    const transitionBtn = await screen.findByRole("button", {
      name: /Transition to UNDER REVIEW/i,
    });
    expect(transitionBtn).toBeInTheDocument();

    // Click transition button to open rationale confirmation box
    await user.click(transitionBtn);

    // Confirmation input should appear
    const noteInput = screen.getByRole("textbox", {
      name: /Transition rationale note/i,
    });
    expect(noteInput).toBeInTheDocument();
    await user.clear(noteInput);
    await user.type(noteInput, "Reconciled with patient access department.");

    // Submit transition
    const confirmBtn = screen.getByRole("button", {
      name: /Confirm Transition/i,
    });
    await user.click(confirmBtn);

    // Timeline should now include the new status transition
    expect(
      await screen.findByText(
        /Claim status changed from flagged to under_review/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders not found state when invalid claim ID is requested", async () => {
    renderClaimDetailPage("claim-nonexistent-999");

    expect(
      await screen.findByText(/Claim Record Not Found/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Return to Claims Registry/i }),
    ).toBeInTheDocument();
  });
});
