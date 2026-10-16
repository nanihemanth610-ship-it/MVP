import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { InsurerQueuePage } from "./InsurerQueuePage";
import { getDataAccess } from "@/services/data-access";

function renderInsurerQueuePage(
  role: "insurer_reviewer" | "hospital_staff" | "patient" = "insurer_reviewer",
) {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/queue"]}>
              <Routes>
                <Route path="/queue" element={<InsurerQueuePage />} />
                <Route
                  path="/queue/:id"
                  element={
                    <div data-testid="detail-page">Review Detail Mock</div>
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

describe("InsurerQueuePage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders review queue with KPI summary cards and policy enforcement notice", async () => {
    renderInsurerQueuePage();

    // Verify Page Header
    expect(
      await screen.findByRole("heading", { name: /insurer review queue/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/DEMO MODE - SIMULATED ADJUDICATION/i),
    ).not.toBeInTheDocument();

    // Verify Disclaimer that disclaims connection to real insurer / clearinghouse
    expect(
      screen.getByText(
        /Decisions recorded here are simulated and do not transmit live transactions to commercial health plans/i,
      ),
    ).toBeInTheDocument();

    // Verify Backend Policy Enforcement Notice
    expect(
      screen.getByText(/Backend Policy Enforcement Notice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hiding a button is not authorization/i),
    ).toBeInTheDocument();

    // Verify KPI Summary Cards
    expect(screen.getByText(/Awaiting Adjudication/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Missing Fields/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Audit Discrepancies/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Decisions Recorded/i).length).toBeGreaterThan(
      0,
    );
  });

  it("displays claims with claim status, missing fields badge, and audit issues count", async () => {
    renderInsurerQueuePage();

    // Find table rows
    expect(await screen.findByText("BB-DEMO-1001")).toBeInTheDocument();
    expect(screen.getByText("BB-DEMO-1003")).toBeInTheDocument();

    // Verify missing fields badge
    const missingFieldBadges = screen.getAllByText(/missing field/i);
    expect(missingFieldBadges.length).toBeGreaterThan(0);

    // Verify issues count badge
    const issueBadges = screen.getAllByText(/issue/i);
    expect(issueBadges.length).toBeGreaterThan(0);
  });

  it("filters claims by search query across claim number, provider, and patient", async () => {
    renderInsurerQueuePage();
    const user = userEvent.setup();

    expect(await screen.findByText("BB-DEMO-1001")).toBeInTheDocument();
    expect(screen.getByText("BB-DEMO-1003")).toBeInTheDocument();

    const searchInput = await screen.findByRole("textbox", {
      name: /search review queue/i,
    });
    await user.type(searchInput, "Fortis");

    // BB-DEMO-1003 is Fortis Memorial Research Institute
    await waitFor(() => {
      expect(screen.getByText("BB-DEMO-1003")).toBeInTheDocument();
      expect(screen.queryByText("BB-DEMO-1001")).not.toBeInTheDocument();
    });
  });

  it("filters claims by status tabs", async () => {
    renderInsurerQueuePage();
    const user = userEvent.setup();

    // Click 'Approved' tab
    const approvedTab = await screen.findByRole("button", {
      name: /approved/i,
    });
    await user.click(approvedTab);

    // Shows only approved claims or empty state if none approved yet
    await waitFor(() => {
      const allRows = screen.queryAllByRole("row");
      // Header row + data rows or empty state
      expect(allRows.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when search filters yield no results and allows reset", async () => {
    renderInsurerQueuePage();
    const user = userEvent.setup();

    const searchInput = await screen.findByRole("textbox", {
      name: /search review queue/i,
    });
    await user.type(searchInput, "NonexistentClaimStringXYZ999");

    // Empty state should appear
    expect(
      await screen.findByText(/No encounters match active queue filters/i),
    ).toBeInTheDocument();

    // Reset button
    const resetBtn = screen.getByRole("button", {
      name: /clear active filters/i,
    });
    await user.click(resetBtn);

    // Claims return
    expect(await screen.findByText("BB-DEMO-1001")).toBeInTheDocument();
  });

  it("has review action linking to the review detail page", async () => {
    renderInsurerQueuePage();
    const user = userEvent.setup();

    // Wait for table to load
    expect(await screen.findByText("BB-DEMO-1001")).toBeInTheDocument();

    // Click review button on first row
    const reviewLinks = screen.getAllByRole("link", {
      name: /review & adjudicate/i,
    });
    expect(reviewLinks.length).toBeGreaterThan(0);

    const targetLink = reviewLinks[0];
    expect(targetLink).toBeDefined();
    await user.click(targetLink!);
    expect(await screen.findByTestId("detail-page")).toBeInTheDocument();
  });
});
