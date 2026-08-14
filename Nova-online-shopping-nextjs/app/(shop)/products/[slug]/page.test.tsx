import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllProductSlugParams,
  getProductById,
} from "@/app/lib/services/products";
import { buildPageMetadata } from "@/app/lib/seo";
import ProductPage, { generateMetadata, generateStaticParams } from "./page";

vi.mock("@/app/lib/services/products", () => ({
  getAllProductSlugParams: vi.fn(),
  getProductById: vi.fn(),
}));

vi.mock("@/app/lib/seo", () => ({
  buildPageMetadata: vi.fn((metadata) => metadata),
  getProductOgDescription: vi.fn(() => "Product description"),
  getProductOgImage: vi.fn(() => "/product.jpg"),
  productPath: vi.fn(() => "/products/nova-phone.42"),
}));

vi.mock("@/app/lib/product-fields", () => ({
  getProductGalleryImages: vi.fn(() => ["/product.jpg"]),
  parseCommaSeparatedList: vi.fn((value: string) => value.split(",")),
}));

vi.mock("@/app/lib/seo-structured-data", () => ({
  productDetailJsonLd: vi.fn(() => ({ "@type": "Product" })),
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("@heroicons/react/24/solid", () => ({ StarIcon: () => null }));
vi.mock("@heroicons/react/24/outline", () => ({ StarIcon: () => null }));
vi.mock("@/app/ui/seo/json-ld", () => ({ default: () => null }));
vi.mock("@/app/ui/nova/nova-icons", () => ({ Icon: () => null }));
vi.mock("./slideImage", () => ({ default: () => null }));
vi.mock("./productForm", () => ({ default: () => null }));

const product = {
  id: 42,
  name: "Nova Phone",
  description: "A premium phone",
  category: "phones",
  stock: 8,
  rate: 4.5,
  reviewCount: 1,
  reviews: [{ rating: 4, comment: "Great" }],
  colors: "black,silver",
  storageOptions: "256 GB,512 GB",
  detailInformation: '{"Processor":"Nova X1"}',
};

describe("product detail page", () => {
  beforeEach(() => {
    vi.mocked(getProductById).mockResolvedValue(product);
    vi.mocked(getAllProductSlugParams).mockResolvedValue([
      { slug: "nova-phone.42" },
    ]);
  });

  it("builds static parameters", async () => {
    await expect(generateStaticParams()).resolves.toEqual([
      { slug: "nova-phone.42" },
    ]);
  });

  it("builds product metadata from the resolved slug", async () => {
    await generateMetadata({ params: Promise.resolve({ slug: "nova-phone.42" }) });

    expect(getProductById).toHaveBeenCalledWith("42", { authenticated: false });
    expect(buildPageMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Nova Phone" }),
    );
  });

  it("creates the product page using normalized product data", async () => {
    const page = await ProductPage({
      params: Promise.resolve({ slug: "nova-phone.42" }),
    });

    expect(getProductById).toHaveBeenCalledWith("42", { authenticated: false });
    expect(page.type).toBe("main");
    expect(page.props.className).toBe("pdp-main");
  });
});
