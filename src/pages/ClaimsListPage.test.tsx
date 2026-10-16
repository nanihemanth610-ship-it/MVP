import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ClaimsListPage } from "./ClaimsListPage";
import { getDataAccess } from "@/services/data-access";
import type { UserRole } from "@/types/contracts";

function renderClaimsListPage(role: UserRole = "hospital_staff") {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={role}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/claims"]}>
              <Routes>
                <Route path="/claims" element={<ClaimsListPage />} />
                <Route
                  path="/claims/:id"
                  element={
                    <div data-testid="claim-detail-view">Claim Detail View</div>
                  }
                />
                <Route
                  path="/review/:id"
                  element={
                    <div data-testid="review-workspace-view">
                      Review Workspace View
                    </div>
                  }
                />
                <Route
                  path="/upload"
                  element={<div data-testid="upload-view">Upload View</div>}
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("ClaimsListPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders claims registry heading and initial claims table", async () => {
    renderClaimsListPage();

    // Verify header
    expect(
      await screen.findByRole("heading", { name: /claims registry/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DEMO SYNTHETIC DATA/i)).not.toBeInTheDocument();

    // Verify initial claims table is rendered with seeded records
    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("Apollo Hospitals, Bengaluru"),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Fortis Memorial Research Institute"),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Max Super Speciality Hospital, New Delhi"),
    ).toBeInTheDocument();

    // Verify Upload Document button exists
    expect(
      screen.getByRole("link", { name: /upload document/i }),
    ).toBeInTheDocument();
  });

  it("filters claims table by patient or provider search query", async () => {
    const user = userEvent.setup();
    renderClaimsListPage();

    const searchInput = await screen.findByPlaceholderText(
      /Search patient, provider/i,
    );
    expect(searchInput).toBeInTheDocument();

    // Search for "Apollo"
    await user.type(searchInput, "Apollo");

    // Apollo Hospital should remain, others should be filtered out
    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("Apollo Hospitals, Bengaluru"),
    ).toBeInTheDocument();
    expect(
      within(table).queryByText("Fortis Memorial Research Institute"),
    ).not.toBeInTheDocument();
  });

  it("filters claims when status pill button is clicked", async () => {
    const user = userEvent.setup();
    renderClaimsListPage();

    await screen.findByRole("table");

    // Click on "Approved" status filter pill
    const approvedPill = screen.getByRole("button", { name: /^Approved$/i });
    await user.click(approvedPill);

    const table = await screen.findByRole("table");
    // Fortis is approved
    expect(
      within(table).getByText("Fortis Memorial Research Institute"),
    ).toBeInTheDocument();
    // Apollo is flagged, should not appear
    expect(
      within(table).queryByText("Apollo Hospitals, Bengaluru"),
    ).not.toBeInTheDocument();
  });

  it("renders empty state when search query produces no matches and allows filter clearing", async () => {
    const user = userEvent.setup();
    renderClaimsListPage();

    const searchInput = await screen.findByPlaceholderText(
      /Search patient, provider/i,
    );
    await user.type(searchInput, "NonexistentPatientQueryXYZ");

    // Empty state should be visible
    expect(
      await screen.findByText(/No matching claims found/i),
    ).toBeInTheDocument();

    // Clear filters button (one in toolbar, one in empty state)
    const clearBtn = screen.getAllByRole("button", {
      name: /clear filters/i,
    })[0]!;
    await user.click(clearBtn);

    // Records should be restored
    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("Apollo Hospitals, Bengaluru"),
    ).toBeInTheDocument();
  });

  it("renders navigation action buttons linking to details and review workspace", async () => {
    renderClaimsListPage("hospital_staff");

    const table = await screen.findByRole("table");
    const detailLinks = within(table).getAllByRole("link", {
      name: /details/i,
    });
    expect(detailLinks.length).toBeGreaterThanOrEqual(3);

    // Check link destination
    expect(detailLinks[0]?.getAttribute("href")).toMatch(/\/claims\/claim-/);

    const reviewLinks = within(table).getAllByRole("link", { name: /review/i });
    expect(reviewLinks.length).toBeGreaterThanOrEqual(3);
    expect(reviewLinks[0]?.getAttribute("href")).toMatch(/\/review\/claim-/);
  });

  it("shows role-specific action button labels (Adjudicate for insurer, Inspect for patient)", async () => {
    // Insurer reviewer role
    const { unmount } = renderClaimsListPage("insurer_reviewer");
    const tableInsurer = await screen.findByRole("table");
    expect(
      within(tableInsurer).getAllByRole("link", { name: /adjudicate/i }).length,
    ).toBeGreaterThan(0);
    unmount();

    // Patient role
    renderClaimsListPage("patient");
    const tablePatient = await screen.findByRole("table");
    expect(
      within(tablePatient).getAllByRole("link", { name: /inspect/i }).length,
    ).toBeGreaterThan(0);
  });

  it("displays pagination controls and page indicator", async () => {
    renderClaimsListPage();

    await screen.findByRole("table");
    expect(screen.getByText(/claims encounters/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
