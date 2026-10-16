import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { LoginPage } from "./LoginPage";

function renderLoginPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/login"]}>
              <LoginPage />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("LoginPage Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("explains product in plain language with value pillars", () => {
    renderLoginPage();

    expect(
      screen.getByText(/clear healthcare billing\. powered by vision ai\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/vision ocr extraction/i)).toBeInTheDocument();
    expect(
      screen.getByText(/automated math reconciliation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/human-in-the-loop adjudication/i),
    ).toBeInTheDocument();
  });

  it("visibly displays synthetic data demo mode warning", () => {
    renderLoginPage();

    expect(
      screen.getByText(/DEMO MODE — ZERO SECRETS • SYNTHETIC DATA ONLY/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No real patient data is collected or transmitted/i),
    ).toBeInTheDocument();
  });

  it("provides 1-click persona entry cards for hospital, insurer, and patient", () => {
    renderLoginPage();

    expect(screen.getByText("Hospital Billing Specialist")).toBeInTheDocument();
    expect(screen.getByText("Insurer Claims Adjudicator")).toBeInTheDocument();
    expect(screen.getByText("Patient / Policyholder")).toBeInTheDocument();
  });

  it("switches to live account tab and validates inputs with recovery option", async () => {
    renderLoginPage();

    // Click Live Account Tab
    await userEvent.click(screen.getByRole("tab", { name: /live account/i }));

    const emailInput = screen.getByLabelText(/corporate email address/i);
    const passInput = screen.getByLabelText(/^password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passInput).toBeInTheDocument();

    // Type invalid email format
    await userEvent.type(emailInput, "not-an-email");
    await userEvent.type(passInput, "123456");

    const submitButton = screen.getByRole("button", {
      name: /sign in to billbridge/i,
    });
    await userEvent.click(submitButton);

    // Validation error banner appears
    expect(screen.getByText(/sign in error/i)).toBeInTheDocument();
    expect(
      screen.getByText(/valid corporate or institutional email address/i),
    ).toBeInTheDocument();

    // Recovery action is present
    expect(
      screen.getByText(/recovery: continue in demo mode instead/i),
    ).toBeInTheDocument();
  });
});
