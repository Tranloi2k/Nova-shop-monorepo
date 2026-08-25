import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NotFound from "./not-found";

vi.mock("@/app/ui/shop/shop-shell", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="shop-shell">{children}</div>
  ),
}));

describe("NotFound", () => {
  it("renders the message and recovery links", () => {
    render(<NotFound />);

    expect(screen.getByTestId("shop-shell")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has been moved.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /Browse products/i }),
    ).toHaveAttribute("href", "/products");
  });
});
