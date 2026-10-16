import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { SettingsPage } from "./SettingsPage";
import { getDataAccess } from "@/services/data-access";

function renderSettingsPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter>
              <SettingsPage />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("SettingsPage Component", () => {
  beforeEach(async () => {
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders role selector and cloud integration matrix", () => {
    renderSettingsPage();

    expect(
      screen.getByText(/Platform Settings & Integrations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hospital Billing Desk/i)).toBeInTheDocument();
    expect(screen.getByText(/Insurer Adjudicator/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient \/ Policyholder/i)).toBeInTheDocument();
    expect(screen.getByText(/Supabase PostgreSQL/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini Vision OCR/i)).toBeInTheDocument();
    expect(screen.getByText(/n8n Workflow Automation/i)).toBeInTheDocument();
  });

  it("supports sample data reset with confirmation dialog", async () => {
    renderSettingsPage();
    const user = userEvent.setup();

    const initialResetBtn = screen.getByRole("button", {
      name: /Reset to Default State/i,
    });
    await user.click(initialResetBtn);

    expect(
      screen.getByText(/Are you sure you want to restore default records\?/i),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Restore/i });
    await user.click(confirmBtn);

    expect(
      await screen.findByText(/Records Restored/i),
    ).toBeInTheDocument();
  });
});
