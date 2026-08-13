import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductToolbar from "./product-toolbar";

const navigation = vi.hoisted(() => ({
  pathname: "/products",
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("@/app/lib/hooks/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock("@/app/ui/nova/nova-icons", () => ({
  Icon: () => null,
}));

describe("ProductToolbar", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.searchParams = new URLSearchParams();
  });

  it("marks the category from the URL as active", () => {
    navigation.searchParams = new URLSearchParams("category=audio&sort=rating");
    render(<ProductToolbar />);

    expect(screen.getByRole("button", { name: "Audio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Sort products" })).toHaveTextContent(
      "Rating",
    );
  });

  it("resets pagination when a category changes", async () => {
    const user = userEvent.setup();
    navigation.searchParams = new URLSearchParams("page=5&sort=rating");
    render(<ProductToolbar />);

    await user.click(screen.getByRole("button", { name: "Audio" }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "/products?page=1&sort=rating&category=audio",
    );
  });

  it("applies price and sale filters", async () => {
    const user = userEvent.setup();
    render(<ProductToolbar />);

    await user.click(screen.getByRole("button", { name: /Filters/ }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "Min" }), "100");
    await user.type(within(dialog).getByRole("spinbutton", { name: "Max" }), "1200");
    await user.click(within(dialog).getByRole("checkbox", { name: "On sale only" }));
    await user.click(within(dialog).getByRole("button", { name: "Apply filters" }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "/products?page=1&minPrice=100&maxPrice=1200&onSale=true",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes all active advanced filters", async () => {
    const user = userEvent.setup();
    navigation.searchParams = new URLSearchParams(
      "page=2&minPrice=100&maxPrice=1200&onSale=true",
    );
    render(<ProductToolbar />);

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(navigation.replace).toHaveBeenCalledWith("/products?page=1");
  });

  it("disables interactive controls while catalog data is loading", () => {
    render(<ProductToolbar disabled />);

    expect(screen.getByRole("button", { name: "All" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Filters/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sort products" })).toBeDisabled();
  });
});
