"use client";

import { useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import type { ProductReview } from "@/app/lib/definitions";

interface ProductTabsProps {
  productDetail: Record<string, unknown>;
  reviews: ProductReview[] | undefined;
  productRate: number;
  reviewCount: number;
}

type Tab = "specs" | "ship" | "reviews";

function formatSpecLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function RatingStars({ rating, size = 14 }: Readonly<{ rating: number; size?: number }>) {
  return (
    <div className="rating-stars" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) =>
        value <= Math.floor(rating) ? (
          <StarIcon
            key={value}
            style={{ width: size, height: size, color: "var(--ink)" }}
          />
        ) : (
          <StarOutlineIcon
            key={value}
            style={{ width: size, height: size, color: "var(--hair)" }}
          />
        ),
      )}
    </div>
  );
}

export default function ProductTabs({
  productDetail,
  reviews,
  productRate,
  reviewCount,
}: Readonly<ProductTabsProps>) {
  const [tab, setTab] = useState<Tab>("specs");
  const tabs: [Tab, string][] = [
    ["specs", "Specifications"],
    ["ship", "Shipping & returns"],
    ["reviews", "Reviews"],
  ];

  const totalReviews = reviews && reviews.length > 0 ? reviews.length : reviewCount;
  const averageRating = (() => {
    if (reviews && reviews.length > 0) {
      const average =
        reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
        reviews.length;
      if (Number.isFinite(average)) return average;
    }
    const fallback = Number(productRate);
    return Number.isFinite(fallback) ? fallback : 0;
  })();
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count:
      reviews?.filter((review) => Math.round(Number(review.rating)) === rating)
        .length ?? 0,
  }));
  const specEntries = Object.entries(productDetail).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <div className="pdp-tabs">
      <div className="tab-row" role="tablist" aria-label="Product information">
        {tabs.map(([id, label]) => (
          <button type="button"
            key={id}
            className={`tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
            role="tab"
            id={`product-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`product-panel-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id={`product-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`product-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "specs" && (
          <div className="spec-grid">
            {specEntries.map(([key, value]) => (
              <div className="spec-item" key={key}>
                <span className="muted">{formatSpecLabel(key)}</span>
                <span style={{ fontWeight: 700 }}>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "ship" && (
          <div className="ship-body">
            <p>
              <strong>Free 2-day shipping</strong> on every order — no minimum.
              Orders placed before 2pm ship the same business day.
            </p>
            <p>
              <strong>30-day returns.</strong> Changed your mind? Send it back
              free within 30 days for a full refund.
            </p>
            <p>
              <strong>2-year warranty</strong> covers all NOVA products against
              manufacturing defects.
            </p>
          </div>
        )}

        {tab === "reviews" && (
          <div id="reviews">
            {reviews && reviews.length > 0 ? (
              <>
                <div className="rev-overview">
                  <div className="rev-summary">
                    <div className="rev-big">{averageRating.toFixed(1)}</div>
                    <div>
                      <RatingStars rating={averageRating} />
                      <div className="muted rev-summary-label">
                        Average review · {totalReviews.toLocaleString()} reviews
                      </div>
                    </div>
                  </div>
                  <div className="rev-distribution" aria-label="Rating distribution">
                    {ratingCounts.map(({ rating, count }) => (
                      <div className="rev-distribution-row" key={rating}>
                        <span>{rating} star</span>
                        <span className="rev-distribution-track">
                          <span
                            style={{
                              width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rev-list">
                  {reviews.map((review) => (
                    <article className="rev-item" key={`${review.name ?? "anonymous"}-${review.rating}-${review.comment}`}>
                      <div className="rev-item-head">
                        <span style={{ fontWeight: 700 }}>
                          {review.name || "Verified customer"}
                        </span>
                        <RatingStars rating={Number(review.rating)} size={12} />
                      </div>
                      <p className="muted rev-comment">{review.comment}</p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="shop-empty compact">
                <div className="empty-glyph">
                  <StarOutlineIcon style={{ width: 24 }} />
                </div>
                <p style={{ fontWeight: 700 }}>No reviews yet</p>
                <p className="muted" style={{ fontSize: 14, marginTop: 5 }}>
                  Be the first to share your experience with this product.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
