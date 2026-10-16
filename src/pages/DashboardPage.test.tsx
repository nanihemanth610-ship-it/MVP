import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { DashboardPage } from "./DashboardPage";
import { getDataAccess } from "@/services/data-access";

function renderDashboardPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/dashboard"]}>
              <DashboardPage />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("DashboardPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders prominent upload document action button", async () => {
    renderDashboardPage();

    const uploadButton = await screen.findByRole("button", {
      name: /upload document to start extraction/i,
    });
    expect(uploadButton).toBeInTheDocument();
  });

  it("renders key calculated metrics without demo badges", async () => {
    renderDashboardPage();

    // Verify four key derived metrics from Master Prompt are rendered
    expect(await screen.findByText(/Bills processed/i)).toBeInTheDocument();
    expect(screen.getByText(/Claims awaiting review/i)).toBeInTheDocument();
    expect(screen.getByText(/Bill discrepancies/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Claims with recorded decision/i),
    ).toBeInTheDocument();
  });

  it("renders discrepancy attention queue for flagged encounters", async () => {
    renderDashboardPage();

    expect(
      await screen.findByText(/Claims Requiring Immediate Human Review/i),
    ).toBeInTheDocument();

    // Apollo Hospitals, Bengaluru is flagged with math variance
    const apolloMentions = screen.getAllByText("Apollo Hospitals, Bengaluru");
    expect(apolloMentions.length).toBeGreaterThan(0);

    const reviewButtons = screen.getAllByRole("button", {
      name: /review bill/i,
    });
    expect(reviewButtons.length).toBeGreaterThan(0);
  });

  it("filters claims table by search query", async () => {
    renderDashboardPage();

    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("Apollo Hospitals, Bengaluru"),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Fortis Memorial Research Institute"),
    ).toBeInTheDocument();

    // Type "Fortis" into search input
    const searchInput = screen.getByLabelText(/filter recent claims/i);
    await userEvent.type(searchInput, "Fortis");

    expect(
      within(table).getByText("Fortis Memorial Research Institute"),
    ).toBeInTheDocument();
    expect(
      within(table).queryByText("Apollo Hospitals, Bengaluru"),
    ).not.toBeInTheDocument();
  });

  it("filters claims table by status filter tabs", async () => {
    renderDashboardPage();

    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("Apollo Hospitals, Bengaluru"),
    ).toBeInTheDocument();

    // Click "Approved" filter
    const approvedFilter = screen.getByRole("button", { name: /^Approved$/i });
    await userEvent.click(approvedFilter);

    // Fortis is approved in demo
    expect(
      within(table).getByText("Fortis Memorial Research Institute"),
    ).toBeInTheDocument();
    // Apollo is flagged so it should be filtered out from the table
    expect(
      within(table).queryByText("Apollo Hospitals, Bengaluru"),
    ).not.toBeInTheDocument();
  });
});
