import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge component", () => {
  it("renders with success status variant", () => {
    render(<Badge variant="success">Reconciled</Badge>);
    const badge = screen.getByText(/reconciled/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-emerald-50");
  });

  it("renders with warning status variant", () => {
    render(<Badge variant="warning">Discrepancy</Badge>);
    const badge = screen.getByText(/discrepancy/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-amber-50");
  });

  it("renders with teal accent variant", () => {
    render(<Badge variant="teal">Verified</Badge>);
    const badge = screen.getByText(/verified/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-teal-subtle");
  });
});
