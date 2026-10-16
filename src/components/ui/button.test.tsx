import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button component", () => {
  it("renders with default variant and children text", () => {
    render(<Button>Submit Claim</Button>);
    const button = screen.getByRole("button", { name: /submit claim/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });

  it("handles user clicks", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    await userEvent.click(screen.getByRole("button", { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies destructive variant styles", () => {
    render(<Button variant="destructive">Reject</Button>);
    const button = screen.getByRole("button", { name: /reject/i });
    expect(button).toHaveClass("bg-destructive");
  });

  it("does not fire click when disabled", async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
