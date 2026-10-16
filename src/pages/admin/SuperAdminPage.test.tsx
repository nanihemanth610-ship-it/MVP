import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { SuperAdminPage } from "./SuperAdminPage";

function renderSuperAdminPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="super_admin">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/admin"]}>
              <SuperAdminPage />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("SuperAdminPage Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders Super Admin header and primary overview metric cards", async () => {
    renderSuperAdminPage();

    expect(
      screen.getByText("BillBridge Super Admin Portal"),
    ).toBeInTheDocument();
    expect(screen.getByText("Root Authority")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Registered Hospitals")).toBeInTheDocument();
      expect(screen.getAllByText(/Insurers & TPAs/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Authorized Users")).toBeInTheDocument();
      expect(screen.getByText("Claims Reconciled")).toBeInTheDocument();
    });
  });

  it("navigates to hospitals tab and displays registered facilities", async () => {
    renderSuperAdminPage();

    const hospitalsTab = screen.getByRole("tab", { name: /hospitals/i });
    await userEvent.click(hospitalsTab);

    await waitFor(() => {
      expect(
        screen.getByText("Apollo Hospitals Bannerghatta Road"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Fortis Memorial Research Institute"),
      ).toBeInTheDocument();
    });
  });

  it("navigates to insurers tab and displays carriers with payer codes", async () => {
    renderSuperAdminPage();

    const insurersTab = screen.getByRole("tab", { name: /insurers/i });
    await userEvent.click(insurersTab);

    await waitFor(() => {
      expect(
        screen.getByText("Star Health and Allied Insurance"),
      ).toBeInTheDocument();
      expect(screen.getByText("STAR-HLTH-01")).toBeInTheDocument();
      expect(
        screen.getByText("HDFC ERGO General Insurance"),
      ).toBeInTheDocument();
    });
  });

  it("renders user RBAC management tab and lists users with assignable roles", async () => {
    renderSuperAdminPage();

    const usersTab = screen.getByRole("tab", { name: /user rbac/i });
    await userEvent.click(usersTab);

    await waitFor(() => {
      expect(
        screen.getByText("admin.blr@apollo-hospitals.in"),
      ).toBeInTheDocument();
      expect(screen.getByText("claims.head@starhealth.in")).toBeInTheDocument();
    });
  });

  it("verifies system health monitoring displays safe metrics without exposing secrets", async () => {
    renderSuperAdminPage();

    const monitoringTab = screen.getByRole("tab", { name: /system health/i });
    await userEvent.click(monitoringTab);

    await waitFor(() => {
      expect(
        screen.getByText("Gemini Multimodal Vision API"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("n8n Webhook Intake Service"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Zero Secret Leakage Compliance"),
      ).toBeInTheDocument();
    });

    // Verify secret strings are NOT rendered anywhere
    expect(screen.queryByText(/AIza[0-9A-Za-z-_]{35}/)).toBeNull();
    expect(screen.queryByText(/service_role/)).toBeNull();
  });

  it("renders audit trail tab with immutable administrative actions", async () => {
    renderSuperAdminPage();

    const auditTab = screen.getByRole("tab", { name: /audit trail/i });
    await userEvent.click(auditTab);

    await waitFor(() => {
      expect(
        screen.getByText("Immutable Governance Audit Log"),
      ).toBeInTheDocument();
      expect(screen.getByText("SYSTEM_BOOTSTRAP")).toBeInTheDocument();
      expect(screen.getByText("APPROVE_HOSPITAL")).toBeInTheDocument();
    });
  });
});
