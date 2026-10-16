import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

function renderWithAuth(
  initialRoute: string,
  element: React.ReactNode,
  userSession?: any,
) {
  if (userSession) {
    localStorage.setItem(
      "billbridge_auth_session",
      JSON.stringify(userSession),
    );
  }

  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole={userSession?.role || "hospital_staff"}>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route path="/login" element={<div>Login Page Screen</div>} />
              <Route
                path="/pending-approval"
                element={<div>Pending Approval Screen</div>}
              />
              <Route
                path="/unauthorized"
                element={<div>Unauthorized Access Screen</div>}
              />
              <Route path="/test" element={element} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("ProtectedRoute Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders protected child when role matches allowedRoles", () => {
    renderWithAuth(
      "/test",
      <ProtectedRoute allowedRoles={["hospital_admin", "hospital_staff"]}>
        <div>Authorized Hospital Secret Content</div>
      </ProtectedRoute>,
      {
        id: "u-1",
        email: "hosp@apollo.in",
        displayName: "Apollo Staff",
        role: "hospital_admin",
        isDemo: true,
        signedInAt: new Date().toISOString(),
      },
    );

    expect(
      screen.getByText("Authorized Hospital Secret Content"),
    ).toBeInTheDocument();
  });

  it("redirects to unauthorized when role is not in allowedRoles", () => {
    renderWithAuth(
      "/test",
      <ProtectedRoute allowedRoles={["super_admin"]}>
        <div>Super Admin Only Screen</div>
      </ProtectedRoute>,
      {
        id: "u-2",
        email: "staff@apollo.in",
        displayName: "Hospital Biller",
        role: "hospital_staff",
        isDemo: true,
        signedInAt: new Date().toISOString(),
      },
    );

    expect(
      screen.getByText("Unauthorized Access Screen"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Super Admin Only Screen")).toBeNull();
  });

  it("permits super_admin to access any portal", () => {
    renderWithAuth(
      "/test",
      <ProtectedRoute allowedRoles={["hospital_admin"]}>
        <div>Hospital Restricted View</div>
      </ProtectedRoute>,
      {
        id: "u-3",
        email: "superadmin@billbridge.health",
        displayName: "Root Admin",
        role: "super_admin",
        isDemo: true,
        signedInAt: new Date().toISOString(),
      },
    );

    expect(screen.getByText("Hospital Restricted View")).toBeInTheDocument();
  });

  it("redirects users with pending role to /pending-approval", () => {
    renderWithAuth(
      "/test",
      <ProtectedRoute allowedRoles={["hospital_staff"]}>
        <div>Hospital Content</div>
      </ProtectedRoute>,
      {
        id: "u-4",
        email: "newuser@gmail.com",
        displayName: "New Google User",
        role: "pending",
        isDemo: false,
        signedInAt: new Date().toISOString(),
      },
    );

    expect(
      screen.getByText("Pending Approval Screen"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hospital Content")).toBeNull();
  });
});
