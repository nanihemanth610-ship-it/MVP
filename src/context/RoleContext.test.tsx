import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleProvider, useRole } from "./RoleContext";

function RoleConsumer() {
  const { role, roleConfig, setRole, isDemoMode } = useRole();
  return (
    <div>
      <span data-testid="role-id">{role}</span>
      <span data-testid="role-title">{roleConfig.title}</span>
      <span data-testid="demo-mode">{isDemoMode ? "demo" : "live"}</span>
      <button onClick={() => setRole("insurer_reviewer")}>
        Switch to Insurer
      </button>
      <button onClick={() => setRole("patient")}>Switch to Patient</button>
    </div>
  );
}

describe("RoleContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default hospital_staff role and updates when changed", async () => {
    render(
      <RoleProvider defaultRole="hospital_staff">
        <RoleConsumer />
      </RoleProvider>,
    );

    expect(screen.getByTestId("role-id")).toHaveTextContent("hospital_staff");
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("demo");

    await userEvent.click(screen.getByText("Switch to Insurer"));
    expect(screen.getByTestId("role-id")).toHaveTextContent("insurer_reviewer");
    expect(screen.getByTestId("role-title")).toHaveTextContent(
      "Insurer Claims Reviewer",
    );

    await userEvent.click(screen.getByText("Switch to Patient"));
    expect(screen.getByTestId("role-id")).toHaveTextContent("patient");
    expect(screen.getByTestId("role-title")).toHaveTextContent(
      "Patient / Policyholder",
    );
  });
});
