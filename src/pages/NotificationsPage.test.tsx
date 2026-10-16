import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationsPage } from "./NotificationsPage";

function renderNotificationsPage() {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter>
              <NotificationsPage />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("NotificationsPage Component", () => {
  it("renders integration status for SMTP and WhatsApp with honest states", () => {
    renderNotificationsPage();

    expect(
      screen.getByText(/Notifications & Outbound Communication/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Transactional Email \(SMTP\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp Business API/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Outbound Communication Audit Log/i),
    ).toBeInTheDocument();
  });

  it("handles test probe and truthfully records NOT_CONFIGURED when SMTP is absent", async () => {
    renderNotificationsPage();
    const user = userEvent.setup();

    const probeBtn = screen.getByRole("button", { name: /Send Probe/i });
    await user.click(probeBtn);

    expect(await screen.findByText(/SMTP Not Configured/i)).toBeInTheDocument();
  });
});
