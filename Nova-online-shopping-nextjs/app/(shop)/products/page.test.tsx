import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPageMetadata } from "@/app/lib/seo";
import { generateMetadata } from "./page";

vi.mock("@/app/lib/seo", () => ({ buildPageMetadata: vi.fn((value) => value) }));
vi.mock("./listProductsComponent", () => ({ default: () => null }));
vi.mock("./search", () => ({ default: () => null }));
vi.mock("@/app/ui/products/product-toolbar", () => ({ default: () => null }));
vi.mock("@/app/ui/products/product-pagination", () => ({ default: () => null }));
vi.mock("@/app/lib/catalog-auth", () => ({ getCatalogAuthenticated: vi.fn() }));
vi.mock("@/app/lib/services/products", () => ({ getProducts: vi.fn() }));
vi.mock("@/app/lib/seo-structured-data", () => ({ productListJsonLd: vi.fn() }));
vi.mock("@/app/ui/seo/json-ld", () => ({ default: () => null }));
vi.mock("@/app/ui/shop/skeletons", () => ({ ProductGridSkeleton: () => null }));

describe("products page metadata", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [
      { query: "headphones" },
      'Search results for "headphones" at NOVA - premium tech and accessories.',
    ],
    [
      { category: "smartphones" },
      "Browse the latest smartphones - flagship performance, premium design.",
    ],
    [
      {},
      "Browse our full catalog of premium tech - phones, laptops, audio, and more.",
    ],
  ])("builds the expected catalog description", async (searchParams, description) => {
    await generateMetadata({ searchParams: Promise.resolve(searchParams) });

    expect(buildPageMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ description }),
    );
  });
});
