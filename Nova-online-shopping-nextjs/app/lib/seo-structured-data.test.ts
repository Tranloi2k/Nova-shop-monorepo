import { describe, expect, it, vi } from "vitest";
import { productDetailJsonLd } from "./seo-structured-data";

vi.mock("@/app/lib/seo", () => ({
  absoluteImageUrl: (value: string) => `https://shop.example.com${value}`,
  absoluteUrl: (value: string) => `https://shop.example.com${value}`,
  DEFAULT_DESCRIPTION: "Nova store",
  getSiteUrl: () => "https://shop.example.com",
  productPath: ({ id }: { id: string | number }) => `/products/${id}`,
  SITE_NAME: "NovaShop",
}));

describe("productDetailJsonLd images", () => {
  it("normalizes a comma-separated product gallery", () => {
    const result = productDetailJsonLd({
      id: 1,
      name: "Apple Phone",
      price: 100,
      images: "/front.jpg, /back.jpg",
    });
    const product = result["@graph"][1];

    expect(product.image).toHaveLength(2);
    expect(product.image?.[0]).toContain("/front.jpg");
    expect(product.brand.name).toBe("Apple");
  });

  it("uses a single fallback image or omits an unavailable image", () => {
    const single = productDetailJsonLd({ id: 2, name: "Nova", price: 50, image: "/nova.jpg" });
    const empty = productDetailJsonLd({ id: 3, name: "Nova", price: 50 });

    expect(single["@graph"][1].image).toHaveLength(1);
    expect(empty["@graph"][1].image).toBeUndefined();
  });
});
