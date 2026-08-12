"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productPath } from "@/app/lib/product-path";
import { getSafeImageUrl } from "@/app/lib/utils";
import { Icon } from "@/app/ui/nova/nova-icons";
import { formatMoney } from "@/app/ui/nova/nova-utils";
import { SafeImage } from "@/app/ui/shared/safe-image";

type ProductSuggestion = {
  id: number;
  name: string;
  image: string;
  price: number;
  discount?: number;
};

type CacheEntry = { data: ProductSuggestion[]; expiresAt: number };

const suggestionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 30;
const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const RECENT_SEARCHES_KEY = "novaRecentSearches";

function readRecentSearches(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const normalized = query.trim();
  if (!normalized) return;
  const next = [
    normalized,
    ...readRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

async function fetchSuggestions(query: string, signal: AbortSignal): Promise<ProductSuggestion[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = suggestionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    suggestionCache.delete(cacheKey);
    suggestionCache.set(cacheKey, cached);
    return cached.data;
  }
  if (cached) suggestionCache.delete(cacheKey);

  const apiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL;
  if (!apiUrl) throw new Error("Product API is not configured");

  const params = new URLSearchParams({ query: query.trim(), limit: "6" });
  const response = await fetch(`${apiUrl}/products/suggestions?${params}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Suggestion request failed: ${response.status}`);

  const data = (await response.json()) as ProductSuggestion[];
  const suggestions = Array.isArray(data) ? data.slice(0, 6) : [];

  if (suggestionCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey) suggestionCache.delete(oldestKey);
  }
  suggestionCache.set(cacheKey, { data: suggestions, expiresAt: Date.now() + CACHE_TTL_MS });
  return suggestions;
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const index = name.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0 || !query.trim()) return name;
  const end = index + query.trim().length;
  return (
    <>
      {name.slice(0, index)}
      <mark>{name.slice(index, end)}</mark>
      {name.slice(end)}
    </>
  );
}

export function NavbarProductSearch({
  variant = "desktop",
  onNavigate,
  disabled = false,
}: {
  variant?: "desktop" | "mobile" | "catalog";
  onNavigate?: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function cancelPendingRequest() {
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function queueSuggestions(value: string) {
    if (disabled) return;
    const normalized = value.trim();
    cancelPendingRequest();
    setActiveIndex(-1);
    setFailed(false);

    if (normalized.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const next = await fetchSuggestions(normalized, controller.signal);
        if (requestId === requestIdRef.current) setSuggestions(next);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
          setFailed(true);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function navigateToResults(value: string) {
    const normalized = value.trim();
    if (normalized) saveRecentSearch(normalized);
    setOpen(false);
    onNavigate?.();
    if (variant === "catalog") {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      if (normalized) params.set("query", normalized);
      else params.delete("query");
      router.replace(`/products?${params.toString()}`);
      return;
    }
    router.push(normalized ? `/products?query=${encodeURIComponent(normalized)}` : "/products");
  }

  function navigateToProduct(product: ProductSuggestion) {
    saveRecentSearch(query);
    setOpen(false);
    onNavigate?.();
    router.push(productPath(product));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      navigateToProduct(suggestions[activeIndex]);
      return;
    }
    navigateToResults(query);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showRecent = query.trim().length < MIN_QUERY_LENGTH && recentSearches.length > 0;
  const showDropdown = open && (showRecent || loading || failed || query.trim().length >= MIN_QUERY_LENGTH);
  const formClassName =
    variant === "desktop"
      ? "navbar-search-inline show-md"
      : variant === "mobile"
        ? "mobile-menu-search"
        : `catalog-search-autocomplete${disabled ? " is-disabled" : ""}`;

  return (
    <form
      ref={formRef}
      className={formClassName}
      role="search"
      onSubmit={handleSubmit}
      onFocusCapture={() => {
        if (disabled) return;
        setRecentSearches(readRecentSearches());
        setOpen(true);
        if (query.trim().length >= MIN_QUERY_LENGTH && suggestions.length === 0) {
          queueSuggestions(query);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Icon name="search" size={variant === "desktop" ? 17 : 18} sw={1.8} />
      <input
        type="search"
        role="combobox"
        name="query"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          setOpen(true);
          queueSuggestions(value);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search products"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-controls={showDropdown ? listboxId : undefined}
        aria-expanded={showDropdown}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        disabled={disabled}
      />
      <button type="submit" aria-label="Submit search" disabled={disabled}>
        <Icon name="arrow" size={variant === "desktop" ? 16 : 17} sw={2} />
      </button>

      {showDropdown ? (
        <div className="search-suggestions" id={listboxId} role="listbox">
          {showRecent ? (
            <div className="search-recent">
              <span className="search-suggestions-label">Recent searches</span>
              {recentSearches.map((item) => (
                <button key={item} type="button" onClick={() => navigateToResults(item)}>
                  <Icon name="refresh" size={15} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          ) : null}

          {loading ? <div className="search-suggestions-state">Searching…</div> : null}
          {!loading && failed ? (
            <div className="search-suggestions-state">Suggestions are unavailable.</div>
          ) : null}
          {!loading && !failed && query.trim().length >= MIN_QUERY_LENGTH && suggestions.length === 0 ? (
            <div className="search-suggestions-state">No matching products.</div>
          ) : null}

          {!loading && suggestions.length > 0 ? (
            <div className="search-suggestion-products">
              {suggestions.map((product, index) => {
                const image = getSafeImageUrl(product.image);
                return (
                  <Link
                    id={`${listboxId}-${index}`}
                    key={product.id}
                    href={productPath(product)}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "is-active" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToProduct(product);
                    }}
                  >
                    <span className="search-suggestion-image">
                      {image ? (
                        <SafeImage src={image} alt="" fill sizes="48px" />
                      ) : null}
                    </span>
                    <span className="search-suggestion-copy">
                      <strong><HighlightedName name={product.name} query={query} /></strong>
                      <small>{formatMoney(Number(product.price))}</small>
                    </span>
                    <Icon name="arrow" size={16} />
                  </Link>
                );
              })}
              <button
                type="button"
                className="search-view-all"
                onClick={() => navigateToResults(query)}
              >
                View all results for “{query.trim()}”
                <Icon name="arrow" size={16} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
