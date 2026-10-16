import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { App } from "./App";

describe("App", () => {
  it("renders the landing page with healthcare finance branding and role selection", async () => {
    await act(async () => {
      render(<App />);
    });
    expect(
      screen.getByRole("heading", { name: /Medical bills, made clear/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Hospital Bill.*Insurance Reader/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/BillBridge Home/i).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/Patient Workspace/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Hospital Workspace/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Insurance \/ TPA Workspace/i).length,
    ).toBeGreaterThan(0);
  });
});
