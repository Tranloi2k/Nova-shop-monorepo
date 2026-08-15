import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductForm from "./productForm";

const mocks = vi.hoisted(() => ({
  addToCart: vi.fn(),
  syncCartBadge: vi.fn(),
  toggle: vi.fn(),
  wishlisted: false,
  wishlistLoading: false,
}));

vi.mock("@/app/lib/services/cart", () => ({ addToCart: mocks.addToCart }));
vi.mock("@/app/lib/cart-events", () => ({ syncCartBadge: mocks.syncCartBadge }));
vi.mock("@/app/lib/product-fields", () => ({
  getSwatchBackground: (color: string) => color,
}));
vi.mock("@/app/ui/wishlist/wishlist-context", () => ({
  useWishlist: () => ({
    isWishlisted: () => mocks.wishlisted,
    toggle: mocks.toggle,
    isLoading: mocks.wishlistLoading,
  }),
}));
vi.mock("@/app/ui/products/BuyNowButton", () => ({
  default: ({ quantity, stock }: { quantity: number; stock: number }) => (
    <output>Buy now {quantity}/{stock}</output>
  ),
}));
vi.mock("@heroicons/react/24/outline", () => ({
  TruckIcon: () => null,
  ArrowPathIcon: () => null,
  ShieldCheckIcon: () => null,
  HeartIcon: () => <span>empty-heart</span>,
}));
vi.mock("@heroicons/react/24/solid", () => ({
  HeartIcon: () => <span>solid-heart</span>,
}));

const product = {
  id: "42",
  name: "Nova Phone",
  price: 100,
  stock: 3,
  colors: ["black", "silver"],
  storageOptions: ["128 GB", "256 GB"],
};

describe("ProductForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.wishlisted = false;
    mocks.wishlistLoading = false;
    mocks.addToCart.mockResolvedValue({ cart: { quantity: 4 } });
    mocks.toggle.mockResolvedValue(undefined);
  });

  it("selects variants and adds the requested quantity to the cart", async () => {
    const user = userEvent.setup();
    render(<ProductForm product={product} deliveryEstimate="Tomorrow" />);

    expect(screen.getByText("Only 3 left in stock")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "silver" }));
    await user.click(screen.getByRole("button", { name: "256 GB" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getAllByRole("button", { name: /Add to bag/ })[0]);

    expect(mocks.addToCart).toHaveBeenCalledWith("42", 2, {
      color: "silver",
      storage: "256 GB",
    });
    expect(mocks.syncCartBadge).toHaveBeenCalledWith(4);
    expect(await screen.findByText(/Nova Phone added to your bag/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByText("Buy now 1/3")).toBeVisible();
  });

  it("shows cart and wishlist errors without leaving controls busy", async () => {
    const user = userEvent.setup();
    mocks.addToCart.mockRejectedValueOnce(new Error("Cart unavailable"));
    mocks.toggle.mockRejectedValueOnce("network failure");
    render(<ProductForm product={product} deliveryEstimate="Tomorrow" />);

    await user.click(screen.getAllByRole("button", { name: /Add to bag/ })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Cart unavailable");

    await user.click(screen.getByRole("button", { name: "Add to wishlist" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update wishlist");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add to wishlist" })).toBeEnabled(),
    );
  });

  it("renders a selected wishlist state", () => {
    mocks.wishlisted = true;
    render(<ProductForm product={product} deliveryEstimate="Tomorrow" />);

    expect(screen.getByRole("button", { name: "Remove from wishlist" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("solid-heart")).toBeVisible();
  });

  it("disables purchase and variant controls when stock is exhausted", () => {
    render(
      <ProductForm
        product={{ ...product, stock: 0, colors: [], storageOptions: [] }}
        deliveryEstimate="Tomorrow"
      />,
    );

    expect(screen.getByText("Out of stock - unavailable to order right now.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Out of stock" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.queryByText(/Free delivery/)).not.toBeInTheDocument();
  });
});
