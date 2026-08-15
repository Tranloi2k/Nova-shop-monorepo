import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavbarProductSearch } from "./navbar-product-search";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/ui/nova/nova-icons", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

vi.mock("@/app/ui/shared/safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const suggestion = {
  id: 42,
  name: "Nova Phone Pro",
  image: "https://images.example.com/phone.jpg",
  price: 999,
};

describe("NavbarProductSearch", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.replace.mockReset();
    navigation.searchParams = new URLSearchParams();
    localStorage.clear();
    process.env.NEXT_PUBLIC_EXTERNAL_API_URL = "https://api.example.com";
    vi.restoreAllMocks();
  });

  it("disables the search controls", () => {
    render(<NavbarProductSearch disabled />);

    expect(screen.getByRole("combobox", { name: "Search products" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit search" })).toBeDisabled();
  });

  it("shows recent searches and navigates to the selected query", async () => {
    localStorage.setItem("novaRecentSearches", JSON.stringify(["Headphones"]));
    const user = userEvent.setup();
    render(<NavbarProductSearch />);

    await user.click(screen.getByRole("combobox", { name: "Search products" }));
    await user.click(screen.getByRole("button", { name: "Headphones" }));

    expect(navigation.push).toHaveBeenCalledWith("/products?query=Headphones");
  });

  it("renders API suggestions and opens a selected product", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [suggestion],
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<NavbarProductSearch />);

    await user.type(screen.getByRole("combobox", { name: "Search products" }), "phone");
    const option = await screen.findByRole("option", { name: /Nova Phone Pro/ });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/products/suggestions?query=phone&limit=6",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(option).toHaveTextContent("$999");
    await user.click(option);
    expect(navigation.push).toHaveBeenCalledWith("/products/Nova-Phone-Pro.42");
  });

  it("uses keyboard selection and catalog URL replacement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [suggestion] }),
    );
    navigation.searchParams = new URLSearchParams("sort=rating&page=4");
    const user = userEvent.setup();
    render(<NavbarProductSearch variant="catalog" />);
    const input = screen.getByRole("combobox", { name: "Search products" });

    await user.type(input, "phone");
    await screen.findByRole("option", { name: /Nova Phone Pro/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(navigation.push).toHaveBeenCalledWith("/products/Nova-Phone-Pro.42");

    await user.clear(input);
    await user.type(input, "tablet{Enter}");
    expect(navigation.replace).toHaveBeenCalledWith(
      "/products?sort=rating&page=1&query=tablet",
    );
  });

  it("shows empty and failure states", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<NavbarProductSearch />);
    const input = screen.getByRole("combobox", { name: "Search products" });

    await user.type(input, "missing");
    expect(await screen.findByText("No matching products.")).toBeVisible();

    await user.clear(input);
    await user.type(input, "failure");
    expect(await screen.findByText("Suggestions are unavailable.")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("Suggestions are unavailable.")).not.toBeInTheDocument(),
    );
  });
});
