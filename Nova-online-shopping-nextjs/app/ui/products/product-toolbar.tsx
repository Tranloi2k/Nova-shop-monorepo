"use client";

import {
  PRODUCT_CATEGORIES,
  buildProductsSearchParams,
  type ProductSort,
} from "@/app/lib/product-filters";
import ProductSortDropdown from "@/app/ui/products/product-sort-dropdown";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/app/ui/nova/nova-icons";
import { useFocusTrap } from "@/app/lib/hooks/use-focus-trap";

export default function ProductToolbar({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") || "all";
  const activeSort = (searchParams.get("sort") || "popular") as ProductSort;
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";
  const activeOnSale = searchParams.get("onSale") === "true";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(activeMinPrice);
  const [maxPrice, setMaxPrice] = useState(activeMaxPrice);
  const [onSale, setOnSale] = useState(activeOnSale);
  const filterPanelRef = useFocusTrap<HTMLDialogElement>(filtersOpen, () =>
    setFiltersOpen(false),
  );

  useEffect(() => {
    if (!filtersOpen || !window.matchMedia("(max-width: 768px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const pushParams = (
    updates: Record<string, string | number | boolean | null | undefined>,
  ) => {
    const next = buildProductsSearchParams(searchParams, {
      page: 1,
      ...updates,
    });
    router.replace(`${pathname}?${next.toString()}`);
  };

  const hasAdvancedFilters = Boolean(
    activeMinPrice || activeMaxPrice || activeOnSale,
  );

  const applyAdvancedFilters = () => {
    pushParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      onSale: onSale ? true : null,
    });
    setFiltersOpen(false);
  };

  const clearAdvancedFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setOnSale(false);
    pushParams({ minPrice: null, maxPrice: null, onSale: null });
  };

  return (
    <div
      className={`catalog-controls${filtersOpen ? " filters-open" : ""}${
        disabled ? " pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="shop-toolbar">
        <div className="chip-row" aria-label="Product categories">
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`chip${activeCategory === cat.id ? " is-active" : ""}`}
              onClick={() =>
                !disabled && pushParams({ category: cat.id === "all" ? null : cat.id })
              }
              disabled={disabled}
              aria-pressed={activeCategory === cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="sort-wrap">
          <button
            type="button"
            className={`filter-trigger${hasAdvancedFilters ? " has-filters" : ""}`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel"
            disabled={disabled}
          >
            <Icon name="menu" size={16} />
            Filters
            {hasAdvancedFilters && <span className="filter-count" aria-label="Filters applied" />}
          </button>
          <ProductSortDropdown
            value={activeSort}
            onChange={(sort) => pushParams({ sort })}
            disabled={disabled}
          />
        </div>
      </div>

      {filtersOpen && (
        <>
          <button
            type="button"
            className="catalog-filter-scrim"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />
          <dialog
            open
            ref={filterPanelRef}
            id="catalog-filter-panel"
            className="catalog-filter-panel"
            aria-labelledby="catalog-filter-title"
          >
          <div className="catalog-filter-head">
            <div>
              <span className="eyebrow">Refine</span>
              <h2 id="catalog-filter-title">Filters</h2>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="price-filter-group">
            <span className="filter-label">Price range</span>
            <label>
              <span>Min</span>
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="$0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </label>
            <span className="price-separator">-</span>
            <label>
              <span>Max</span>
              <input
                className="input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Any"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
              </label>
          </div>
          <label className="sale-filter">
            <input
              type="checkbox"
              checked={onSale}
              onChange={(event) => setOnSale(event.target.checked)}
            />
            {" "}
            On sale only
          </label>
          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearAdvancedFilters}
              disabled={!hasAdvancedFilters && !minPrice && !maxPrice && !onSale}
            >
              Clear
            </button>
            <button type="button" className="btn btn-dark btn-sm" onClick={applyAdvancedFilters}>
              Apply filters
            </button>
          </div>
          </dialog>
        </>
      )}

      {hasAdvancedFilters && (
        <div className="applied-filters" aria-label="Applied filters">
          <span className="filter-label">Applied:</span>
          {activeMinPrice && <span className="tag">From ${activeMinPrice}</span>}
          {activeMaxPrice && <span className="tag">Up to ${activeMaxPrice}</span>}
          {activeOnSale && <span className="tag sale">On sale</span>}
          <button type="button" className="clear-filter-link" onClick={clearAdvancedFilters}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
