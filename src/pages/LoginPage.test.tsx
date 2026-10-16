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
    expect(screen.getByText(/deterministic ocr & itemization/i)).toBeInTheDocument();
    expect(
      screen.getByText(/discrepancy audit engine/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/human-in-the-loop adjudication/i),
    ).toBeInTheDocument();
  });

  it("renders Google OAuth and Enterprise SSO options", () => {
    renderLoginPage();

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/enterprise sso/i)).toBeInTheDocument();
  });

  it("provides quick workspace profile access for super admin, hospital, and insurer", () => {
    renderLoginPage();

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Hospital Admin")).toBeInTheDocument();
    expect(screen.getByText("Hospital Staff")).toBeInTheDocument();
    expect(screen.getByText("Insurance Admin")).toBeInTheDocument();
    expect(screen.getByText("Claims Adjudicator")).toBeInTheDocument();
    expect(screen.getByText("Patient Portal")).toBeInTheDocument();
  });

  it("validates institutional email format and displays error notice", async () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText(/institutional email/i);
    const passInput = screen.getByLabelText(/^password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passInput).toBeInTheDocument();

    // Type invalid email format
    await userEvent.type(emailInput, "not-an-email");
    await userEvent.type(passInput, "123456");

    const submitButton = screen.getByRole("button", {
      name: /sign in to workspace/i,
    });
    await userEvent.click(submitButton);

    // Validation error notice appears
    expect(screen.getByText(/sign in notice/i)).toBeInTheDocument();
    expect(
      screen.getByText(/valid corporate or institutional email address/i),
    ).toBeInTheDocument();
  });
});
