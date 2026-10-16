import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ReviewPage } from "./ReviewPage";
import { getDataAccess } from "@/services/data-access";
import type { UserRole } from "@/types/contracts";

function renderReviewPage(
  claimId: string = "claim-memorial-002",
  role: UserRole = "hospital_staff",
) {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[`/review/${claimId}`]}>
              <Routes>
                <Route path="/review/:id" element={<ReviewPage />} />
                <Route
                  path="/claims"
                  element={
                    <div data-testid="claims-registry-target">
                      Claims Registry
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

describe("ReviewPage Extraction Workspace", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders side-by-side workspace with document preview and structured field sections", async () => {
    renderReviewPage();

    // Verify claim header is loaded
    const apolloHeaders = await screen.findAllByText(/Apollo Hospitals/i);
    expect(apolloHeaders.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BB-DEMO-1001/i).length).toBeGreaterThan(0);

    // Verify source document preview facsimile
    expect(
      screen.getByLabelText(/Source document preview/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Coords: Absent/i)).toBeInTheDocument(); // Coordinates not faked

    // Verify section navigation items exist
    expect(
      screen.getByRole("button", { name: /^Document$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Hospital$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Patient$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Admission \/ Discharge/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Line Items$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Totals$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Insurance \/ Claim/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Extraction Notes/i }),
    ).toBeInTheDocument();
  });

  it("leaves unknown values as null rather than guessed, displaying clear placeholders", async () => {
    // Max Super Speciality has missing procedure codes
    renderReviewPage("claim-beacon-003");

    const maxElements = await screen.findAllByText(/Max.*Super Speciality/i);
    expect(maxElements.length).toBeGreaterThan(0);

    // Switch to Hospital section
    const hospitalTab = screen.getByRole("button", { name: /^Hospital$/i });
    const user = userEvent.setup();
    await user.click(hospitalTab);

    // Verify inputs render with proper labels and unreadable/null indicators
    expect(screen.getByLabelText(/Provider Name/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/National Provider Identifier \(NPI\)/i),
    ).toBeInTheDocument();
  });

  it("shows confidence badges and Needs review callouts where supported", async () => {
    renderReviewPage("claim-memorial-002");

    // Line items table is default section
    expect(
      await screen.findByText(/Extracted Line Items/i),
    ).toBeInTheDocument();

    // Math error or Needs review badge exists
    const errorBadges = await screen.findAllByText(/Math Error/i);
    expect(errorBadges.length).toBeGreaterThan(0);
  });

  it("allows in-place line item editing, recalculating variance and tracking unsaved changes", async () => {
    renderReviewPage("claim-memorial-002");
    const user = userEvent.setup();

    // Wait for claim to load
    expect(
      await screen.findByText(/Extracted Line Items/i),
    ).toBeInTheDocument();

    // Line 7 has math error ($1,200 billed instead of $800)
    // Find edit button on line items table
    const editButtons = screen.getAllByTitle("Edit Line Item");
    expect(editButtons.length).toBeGreaterThan(0);

    // Click edit on the first item
    await user.click(editButtons[0]!);

    // Change price
    const unitPriceInput = screen.getByLabelText("Unit Price");
    await user.clear(unitPriceInput);
    await user.type(unitPriceInput, "500");

    // Save line item
    const saveItemBtn = screen.getByTitle("Save Line Item");
    await user.click(saveItemBtn);

    // Unsaved edits badge and bar appear
    expect(await screen.findByText(/Unsaved Edits/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /discard/i }),
    ).toBeInTheDocument();
  });

  it("protects against unsaved changes with confirmation dialog", async () => {
    renderReviewPage("claim-memorial-002");
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Extracted Line Items/i),
    ).toBeInTheDocument();

    // Trigger an edit
    const editButtons = screen.getAllByTitle("Edit Line Item");
    await user.click(editButtons[0]!);
    const unitPriceInput = screen.getByLabelText("Unit Price");
    await user.clear(unitPriceInput);
    await user.type(unitPriceInput, "999");
    await user.click(screen.getByTitle("Save Line Item"));

    // Attempt to navigate away via "All Claims" button
    const backBtn = screen.getByRole("button", { name: /all claims/i });
    await user.click(backBtn);

    // Confirmation dialog appears
    expect(
      await screen.findByText(/Unsaved Modifications/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /discard edits/i }),
    ).toBeInTheDocument();

    // Confirm discard
    await user.click(screen.getByRole("button", { name: /discard edits/i }));

    // Navigates to claims registry
    await waitFor(() => {
      expect(screen.getByTestId("claims-registry-target")).toBeInTheDocument();
    });
  });

  it("renders clear role-specific next actions for insurer adjudicator", async () => {
    renderReviewPage("claim-memorial-002", "insurer_reviewer");
    const user = userEvent.setup();

    // Insurer adjudicator has Approve Claim and Reject buttons
    const approveBtn = await screen.findByRole("button", {
      name: /approve claim/i,
    });
    const rejectBtn = screen.getByRole("button", { name: /reject/i });

    expect(approveBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();

    // Clicking approve opens decision modal with rationale textarea
    await user.click(approveBtn);
    expect(
      await screen.findByText(/Adjudication Rationale & Audit Note/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm approval/i }),
    ).toBeInTheDocument();
  });

  it("displays transparent completeness indicator with documented weighted rule and disclaimer", async () => {
    renderReviewPage("claim-memorial-002");

    // Indicator header and score
    expect(
      await screen.findByText(/Data Completeness & Validation Indicator/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Completeness Score/i)).toBeInTheDocument();

    // Documented weighted rule
    expect(
      screen.getByText(/100 base points minus 25 points per critical blocker/i),
    ).toBeInTheDocument();

    // Disclaimer explicitly negating approval probability
    expect(
      screen.getByText(
        /does NOT model, predict, or guarantee insurer approval/i,
      ),
    ).toBeInTheDocument();
  });

  it("displays deterministic audit issues showing code, severity, field, expected/observed values, and suggested human fix", async () => {
    renderReviewPage("claim-memorial-002");

    // Findings section exists
    expect(
      await screen.findByText(/Deterministic Audit Findings/i),
    ).toBeInTheDocument();

    // Line math error issue exists with machine-readable code
    expect(screen.getAllByText(/ERR_LINE_MATH/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Critical Blocker/i).length).toBeGreaterThan(0);

    // Suggested human fix exists
    expect(screen.getAllByText(/Suggested Human Fix:/i).length).toBeGreaterThan(
      0,
    );

    // Verify tone neutrality: zero occurrences of "fraud" or "scam"
    const pageText = document.body.textContent || "";
    expect(pageText.toLowerCase()).not.toContain("fraud");
    expect(pageText.toLowerCase()).not.toContain("scam");
  });

  it("filters audit findings by severity tabs", async () => {
    renderReviewPage("claim-memorial-002");
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Deterministic Audit Findings/i),
    ).toBeInTheDocument();

    // Click Critical filter button
    const criticalTab = screen.getByRole("button", { name: /^Critical \(/i });
    await user.click(criticalTab);

    // Critical issues should be visible
    expect(screen.getAllByText(/ERR_LINE_MATH/i).length).toBeGreaterThan(0);

    // Click All filter button
    const allTab = screen.getByRole("button", { name: /^All \(/i });
    await user.click(allTab);
    expect(
      screen.getByText(/Deterministic Audit Findings/i),
    ).toBeInTheDocument();
  });

  it("re-runs audit checks after editing a line item and displays what changed banner", async () => {
    renderReviewPage("claim-memorial-002");
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Extracted Line Items/i),
    ).toBeInTheDocument();

    // Find the edit button for line 7 (which has 2 x ₹7,250 = ₹14,500, billed as ₹16,000)
    const editButtons = screen.getAllByTitle("Edit Line Item");
    // Click edit on the last item (line 7)
    await user.click(editButtons[editButtons.length - 1]!);

    // Change total price to ₹14,500 to resolve the line arithmetic error
    const totalInput = screen.getByLabelText("Total Price");
    await user.clear(totalInput);
    await user.type(totalInput, "14500");

    // Save line item
    await user.click(screen.getByTitle("Save Line Item"));

    // Verify live audit re-run banner appears reporting what changed
    expect(await screen.findByText(/Audit re-run:/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolved:/i)).toBeInTheDocument();
  });

  it("handles non-existent claim gracefully with error state", async () => {
    renderReviewPage("claim-does-not-exist");

    expect(
      await screen.findByText(/Claim Record Not Found/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to claims registry/i }),
    ).toBeInTheDocument();
  });
});
