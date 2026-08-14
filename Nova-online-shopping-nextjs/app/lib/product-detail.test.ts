import { afterEach, describe, expect, it, vi } from "vitest";
import { getReviewMetrics, parseProductDetail } from "./product-detail";

describe("getReviewMetrics", () => {
  it("uses reviews for the count and average when no API rating exists", () => {
    expect(
      getReviewMetrics([{ rating: 5 }, { rating: 3 }, { rating: "invalid" }], 99, 0),
    ).toEqual({ reviewTotal: 3, productRating: 8 / 3 });
  });

  it("prefers a positive finite API rating", () => {
    expect(getReviewMetrics([{ rating: 1 }], 1, "4.5")).toEqual({
      reviewTotal: 1,
      productRating: 4.5,
    });
  });

  it("falls back to a valid review count when reviews are unavailable", () => {
    expect(getReviewMetrics(undefined, "12", Number.NaN)).toEqual({
      reviewTotal: 12,
      productRating: 0,
    });
  });

  it("never returns a negative or invalid fallback count", () => {
    expect(getReviewMetrics(null, -4, -1)).toEqual({
      reviewTotal: 0,
      productRating: 0,
    });
    expect(getReviewMetrics({}, "invalid", undefined).reviewTotal).toBe(0);
  });
});

describe("parseProductDetail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns an existing detail record", () => {
    const details = { processor: "Nova X1", memory: "32 GB" };
    expect(parseProductDetail(details)).toBe(details);
  });

  it("parses regular and double-encoded JSON records", () => {
    expect(parseProductDetail('{"storage":"1 TB"}')).toEqual({ storage: "1 TB" });
    expect(parseProductDetail('"{\\"color\\":\\"black\\"}"')).toEqual({
      color: "black",
    });
  });

  it.each([null, undefined, "", [], "42", "null"])(
    "returns null for unsupported detail value %j",
    (value) => {
      expect(parseProductDetail(value)).toBeNull();
    },
  );

  it("returns null and logs malformed JSON", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(parseProductDetail("{invalid json")).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to parse detailInformation:",
      expect.any(SyntaxError),
    );
  });
});
