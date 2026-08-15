import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://shop.example.com";
});

import { DEFAULT_TITLE, getProductOgDescription } from "./seo";

describe("SEO product descriptions", () => {
  it("uses the ASCII title separator", () => {
    expect(DEFAULT_TITLE).toBe("NOVA - Premium Tech Store");
  });

  it("builds a price-aware fallback description", () => {
    expect(getProductOgDescription({ name: "Nova Phone", price: 999 })).toBe(
      "Shop Nova Phone at NOVA - $999 with secure checkout and fast delivery.",
    );
  });

  it("builds a generic fallback when the product has no valid price", () => {
    expect(getProductOgDescription({ name: "Nova Phone" })).toBe(
      "Buy Nova Phone at NOVA - premium tech with secure checkout.",
    );
  });
});
