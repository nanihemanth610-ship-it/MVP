import { describe, it, expect, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { InsurerReviewDetailPage } from "./InsurerReviewDetailPage";
import { getDataAccess } from "@/services/data-access";

function renderInsurerReviewDetailPage(
  claimId = "claim-memorial-002",
  role: "insurer_reviewer" | "hospital_staff" | "patient" = "insurer_reviewer",
) {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[`/queue/${claimId}`]}>
              <Routes>
                <Route
                  path="/queue/:id"
                  element={<InsurerReviewDetailPage />}
                />
                <Route path="/queue" element={<div>Review Queue Mock</div>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("InsurerReviewDetailPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders side-by-side source document and audit issues workspace", async () => {
    renderInsurerReviewDetailPage("claim-memorial-002", "insurer_reviewer");

    // Header and Claim Number
    expect(await screen.findByText("BB-DEMO-1001")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Apollo Hospitals, Bengaluru" }),
    ).toBeInTheDocument();

    // Verify Policy and audit notice banner
    expect(
      screen.getByText(
        /All adjudication decisions are recorded with an immutable audit log/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Authorised reviewer decisions update claim status/i,
      ),
    ).toBeInTheDocument();

    // Source Document panel on left
    expect(
      screen.getByText(/Source Medical Bill Document/i),
    ).toBeInTheDocument();

    // Deterministic Audit & Missing Fields tab on right
    expect(
      screen.getByText(/Deterministic Audit Findings/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Missing Required Fields Checklist/i),
    ).toBeInTheDocument();

    // Completeness Indicator
    expect(
      screen.getByText(/Completeness & Adjudication Readiness/i),
    ).toBeInTheDocument();
  });

  it("renders authorized reviewer actions (Approve, Query, Reject) for insurer reviewer", async () => {
    renderInsurerReviewDetailPage("claim-memorial-002", "insurer_reviewer");

    expect(
      await screen.findByRole("button", { name: /approve claim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /query provider/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reject claim/i }),
    ).toBeInTheDocument();
  });

  it("supports Approve action with accessible confirmation dialog and records audit event", async () => {
    renderInsurerReviewDetailPage("claim-memorial-002", "insurer_reviewer");
    const user = userEvent.setup();

    const approveButton = await screen.findByRole("button", {
      name: /approve claim/i,
    });
    await user.click(approveButton);

    // Confirmation dialog should open with accessible attributes
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Confirm Claim Approval/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/SIMULATED ADJUDICATION/i).length,
    ).toBeGreaterThan(0);

    // Confirm button in dialog
    const confirmButton = within(dialog).getByRole("button", {
      name: /confirm approval/i,
    });
    await user.click(confirmButton);

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Check activity timeline tab
    const timelineTab = screen.getByRole("button", { name: /timeline/i });
    fireEvent.click(timelineTab);

    // Verify audit event exists
    expect(
      await screen.findByText(/SIMULATED DECISION - DEMO MODE/i),
    ).toBeInTheDocument();
  });

  it("strictly requires an explanatory note when querying a provider", async () => {
    renderInsurerReviewDetailPage("claim-memorial-002", "insurer_reviewer");
    const user = userEvent.setup();

    const queryButton = await screen.findByRole("button", {
      name: /query provider/i,
    });
    await user.click(queryButton);

    // Confirmation dialog should open
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Query Healthcare Provider/i),
    ).toBeInTheDocument();

    // Mandatory note indicator
    expect(within(dialog).getByText(/Required for query/i)).toBeInTheDocument();

    // Send button should be disabled without a note
    const submitQueryButton = within(dialog).getByRole("button", {
      name: /send query to provider/i,
    });
    expect(submitQueryButton).toBeDisabled();

    // Type query note
    const textarea = within(dialog).getByPlaceholderText(
      /specify the clarification requested from provider/i,
    );
    await user.type(
      textarea,
      "Please provide itemized breakdown for pharmacy charge discrepancy.",
    );

    // Submit button is now enabled
    const enabledSubmit = within(dialog).getByRole("button", {
      name: /send query to provider/i,
    });
    expect(enabledSubmit).toBeEnabled();
    await user.click(enabledSubmit);

    // Wait for submission
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Check timeline for the query note
    const timelineTab = screen.getByRole("button", { name: /timeline/i });
    fireEvent.click(timelineTab);

    const matches = await screen.findAllByText(
      /Please provide itemized breakdown for pharmacy charge discrepancy/i,
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("strictly requires an explanatory note when rejecting a claim", async () => {
    renderInsurerReviewDetailPage("claim-memorial-002", "insurer_reviewer");
    const user = userEvent.setup();

    const rejectButton = await screen.findByRole("button", {
      name: /reject claim/i,
    });
    await user.click(rejectButton);

    // Dialog opens
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Confirm Claim Rejection/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Required for rejection/i),
    ).toBeInTheDocument();

    // Confirm button is disabled without note
    const confirmRejectButton = within(dialog).getByRole("button", {
      name: /confirm rejection/i,
    });
    expect(confirmRejectButton).toBeDisabled();

    // Type rejection note
    const textarea = within(dialog).getByPlaceholderText(
      /specify the denial rationale/i,
    );
    await user.type(
      textarea,
      "Service unbundled and duplicates previously paid surgical charge.",
    );

    const enabledReject = within(dialog).getByRole("button", {
      name: /confirm rejection/i,
    });
    expect(enabledReject).toBeEnabled();
    await user.click(enabledReject);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Check timeline for the rejection note
    const timelineTab = screen.getByRole("button", { name: /timeline/i });
    fireEvent.click(timelineTab);

    const matches = await screen.findAllByText(
      /Service unbundled and duplicates previously paid surgical charge/i,
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("enforces backend policy when unauthorized role attempts adjudication", async () => {
    // Render as hospital staff
    renderInsurerReviewDetailPage("claim-memorial-002", "hospital_staff");

    // Action buttons are not shown for hospital_staff persona in the insurer UI
    expect(
      screen.queryByRole("button", { name: /approve claim/i }),
    ).not.toBeInTheDocument();

    // Data access directly rejects non-insurer reviewer decisions
    const dataAccess = getDataAccess();
    await expect(
      dataAccess.recordDecision({
        claimId: "claim-memorial-002",
        outcome: "approved",
        rationale: "Unauthorized bypass attempt",
        adjudicatorRole: "hospital_staff" as any,
        adjudicatorName: "Hospital User",
      }),
    ).rejects.toThrow(
      /Role "hospital_staff" is not authorized to adjudicate claims/i,
    );
  });
});
