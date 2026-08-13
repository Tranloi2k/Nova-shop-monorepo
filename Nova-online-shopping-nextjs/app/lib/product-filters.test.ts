import { describe, expect, it } from "vitest";
import {
  buildProductsSearchParams,
  categoryNavHref,
  isCategoryActive,
  parseProductFilters,
  productsHref,
} from "./product-filters";

describe("parseProductFilters", () => {
  it("normalizes valid catalog filters", () => {
    expect(
      parseProductFilters({
        query: "  iphone  ",
        category: "smartphones",
        sort: "price-low",
        view: "list",
        page: "3",
        minPrice: "100",
        maxPrice: "1200.5",
        onSale: "true",
      }),
    ).toEqual({
      query: "iphone",
      category: "smartphones",
      sort: "price-low",
      view: "list",
      page: 3,
      minPrice: 100,
      maxPrice: 1200.5,
      onSale: true,
    });
  });

  it("falls back safely for invalid values", () => {
    expect(
      parseProductFilters({
        category: "unknown",
        sort: "random",
        view: "table",
        page: "-5",
        minPrice: "not-a-number",
        maxPrice: "not-a-number",
        onSale: "yes",
      }),
    ).toEqual({
      query: "",
      category: undefined,
      sort: "popular",
      view: "grid",
      page: 1,
      minPrice: undefined,
      maxPrice: undefined,
      onSale: false,
    });
  });
});

describe("product filter URL helpers", () => {
  it("updates existing search params and removes empty values", () => {
    const current = new URLSearchParams("query=phone&page=4&category=audio");
    const result = buildProductsSearchParams(current, {
      page: 1,
      category: null,
      onSale: true,
      minPrice: "",
    });

    expect(result.toString()).toBe("query=phone&page=1&onSale=true");
    expect(current.toString()).toBe("query=phone&page=4&category=audio");
  });

  it("builds product links without false or empty filters", () => {
    expect(
      productsHref({ category: "audio", page: 2, onSale: true, query: "" }),
    ).toBe("/products?category=audio&page=2&onSale=true");
    expect(productsHref({ onSale: false, query: undefined })).toBe("/products");
  });

  it("builds category links and detects the active category", () => {
    expect(categoryNavHref("smartphones")).toBe(
      "/products?category=smartphones",
    );
    expect(categoryNavHref("all")).toBe("/products");
    expect(isCategoryActive(undefined, "all")).toBe(true);
    expect(isCategoryActive("audio", "audio")).toBe(true);
    expect(isCategoryActive("audio", "smartphones")).toBe(false);
  });
});
