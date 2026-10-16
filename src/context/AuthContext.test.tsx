import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleProvider } from "./RoleContext";
import { AuthProvider, useAuth } from "./AuthContext";

function AuthConsumer() {
  const { user, isAuthenticated, isDemoMode, loginDemo, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? "authenticated" : "anonymous"}
      </span>
      <span data-testid="demo-status">{isDemoMode ? "demo" : "live"}</span>
      <span data-testid="user-role">{user?.role}</span>
      <button onClick={() => loginDemo("insurer_reviewer")}>
        Login as Insurer
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("manages demo authentication sessions cleanly", async () => {
    render(
      <RoleProvider>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </RoleProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "authenticated",
    );
    expect(screen.getByTestId("demo-status")).toHaveTextContent("demo");

    await userEvent.click(screen.getByText("Login as Insurer"));
    expect(screen.getByTestId("user-role")).toHaveTextContent(
      "insurer_reviewer",
    );

    await userEvent.click(screen.getByText("Logout"));
    expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
  });
});
