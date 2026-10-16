import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ReportsPage } from "./ReportsPage";
import { getDataAccess } from "@/services/data-access";

function renderReportsPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/reports"]}>
              <Routes>
                <Route path="/reports" element={<ReportsPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("ReportsPage Component", () => {
  beforeEach(async () => {
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders report header and financial reconciliation cards", async () => {
    renderReportsPage();

    expect(
      await screen.findByText(/Analytics & Adjudication Reports/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DEMO METRICS/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Gross Invoiced Billed/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved Payout Amount/i)).toBeInTheDocument();
  });

  it("provides export buttons for CSV and JSON", async () => {
    renderReportsPage();

    expect(
      await screen.findByRole("button", { name: /Export CSV/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export JSON/i }),
    ).toBeInTheDocument();
  });
});
