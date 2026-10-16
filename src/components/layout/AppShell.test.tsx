import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "./AppShell";

describe("AppShell Component", () => {
  it("renders skip link, sidebar, header, and content area", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <RoleProvider defaultRole="hospital_staff">
          <ToastProvider>
            <MemoryRouter initialEntries={["/dashboard"]}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route
                    path="/dashboard"
                    element={<div>Test Dashboard Content</div>}
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </RoleProvider>
      </ThemeProvider>,
    );

    // Skip to main content link
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();

    // Brand Monogram Logo
    expect(screen.getAllByLabelText(/BillBridge Home/i).length).toBeGreaterThan(
      0,
    );

    // Role switcher
    expect(
      screen.getByRole("button", { name: /current persona/i }),
    ).toBeInTheDocument();

    // Content rendered inside main outlet
    expect(screen.getByText("Test Dashboard Content")).toBeInTheDocument();
  });
});
