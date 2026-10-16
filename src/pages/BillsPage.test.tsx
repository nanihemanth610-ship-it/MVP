import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { BillsPage } from "./BillsPage";
import { getDataAccess } from "@/services/data-access";

function renderBillsPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/bills"]}>
              <Routes>
                <Route path="/bills" element={<BillsPage />} />
                <Route path="/upload" element={<div>Upload Page Target</div>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("BillsPage Component", () => {
  beforeEach(async () => {
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders page header, demo badge, and KPI metrics", async () => {
    renderBillsPage();

    expect(
      await screen.findByText(/Medical Bills & Statements/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/DEMO DATASET/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Ingested Bills/i)).toBeInTheDocument();
  });

  it("filters bills by search query", async () => {
    renderBillsPage();
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Apollo Hospitals, Bengaluru/i),
    ).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search by hospital, patient/i,
    );
    await user.type(searchInput, "Apollo");

    expect(
      screen.getByText(/Apollo Hospitals, Bengaluru/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Max Super Speciality Hospital/i),
    ).not.toBeInTheDocument();
  });

  it("supports filtering by discrepancy status", async () => {
    renderBillsPage();
    const user = userEvent.setup();

    const cleanFilterBtn = await screen.findByRole("button", {
      name: /100% Clean/i,
    });
    await user.click(cleanFilterBtn);

    expect(
      screen.getByText(/Fortis Memorial Research Institute/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Apollo Hospitals, Bengaluru/i),
    ).not.toBeInTheDocument();
  });
});
