type ProductReview = Readonly<{ rating?: unknown }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getReviewMetrics(
  reviews: unknown,
  reviewCount: unknown,
  rate: unknown,
) {
  const reviewList: ProductReview[] = Array.isArray(reviews) ? reviews : [];
  const reviewTotal = reviewList.length || Math.max(0, Number(reviewCount) || 0);
  const reviewAverage = reviewList.length
    ? reviewList.reduce(
        (sum, review) => sum + (Number(review.rating) || 0),
        0,
      ) / reviewList.length
    : 0;
  const apiRating = Number(rate);
  const productRating =
    Number.isFinite(apiRating) && apiRating > 0 ? apiRating : reviewAverage;

  return { reviewTotal, productRating };
}

export function parseProductDetail(
  value: unknown,
): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || !value) return null;

  try {
    let parsed: unknown = JSON.parse(value);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to parse detailInformation:", error);
    return null;
  }
}
