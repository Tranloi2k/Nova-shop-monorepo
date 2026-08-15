import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuyNowButton from "./BuyNowButton";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));

vi.mock("@/app/ui/auth/use-require-auth", () => ({
  useRequireAuth: () => ({ requireAuth: mocks.requireAuth, isAuthLoading: false }),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "buyer@example.com" } } }),
}));
vi.mock("@heroicons/react/24/outline", () => ({ ArrowRightIcon: () => null }));

describe("BuyNowButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the calculated price and blocks out-of-stock products", () => {
    const { rerender } = render(
      <BuyNowButton product={{ id: 1, name: "Phone", price: 25 }} quantity={2} stock={3} />,
    );
    expect(screen.getByRole("button", { name: "Buy now - $50.00" })).toBeEnabled();

    rerender(
      <BuyNowButton product={{ id: 1, name: "Phone", price: 25 }} quantity={2} stock={0} />,
    );
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("shows progress and requests authentication after a 401 response", async () => {
    let resolveFetch!: (value: { status: number }) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })),
    );
    const user = userEvent.setup();
    render(<BuyNowButton product={{ id: 1, name: "Phone", price: 25 }} stock={3} />);

    await user.click(screen.getByRole("button", { name: "Buy now - $25.00" }));
    expect(screen.getByRole("button", { name: /Processing/ })).toBeDisabled();

    resolveFetch({ status: 401 });
    await vi.waitFor(() => expect(mocks.requireAuth).toHaveBeenCalled());
  });
});
