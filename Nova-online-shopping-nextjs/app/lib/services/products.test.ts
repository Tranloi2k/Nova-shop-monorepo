import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "@/app/lib/api-client";
import { getProducts } from "./products";

vi.mock("@/app/lib/api-client", () => ({
  authFetch: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const authFetchMock = vi.mocked(authFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const emptyResult = {
  products: [],
  total: 0,
  page: 1,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

describe("getProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.NEXT_PUBLIC_EXTERNAL_API_URL = "https://api.nova.test";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EXTERNAL_API_URL;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns an empty result when the API URL is not configured", async () => {
    delete process.env.NEXT_PUBLIC_EXTERNAL_API_URL;

    await expect(getProducts()).resolves.toEqual(emptyResult);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends normalized public catalog filters and maps the response", async () => {
    const product = { id: 1, name: "NOVA Phone", price: 999 };
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ products: [product], total: 1, page: 2, totalPages: 3 }),
    );

    await expect(
      getProducts({
        query: "nova phone",
        page: 2,
        limit: 6,
        category: "smartphones",
        sort: "price-low",
        minPrice: 100,
        maxPrice: 1200,
        onSale: true,
      }),
    ).resolves.toEqual({
      products: [product],
      total: 1,
      page: 2,
      totalPages: 3,
      hasNextPage: false,
      hasPrevPage: false,
    });

    const [url, init] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe("/products");
    expect(Object.fromEntries(parsedUrl.searchParams)).toEqual({
      search: "nova phone",
      category: "smartphones",
      sort: "price-low",
      minPrice: "100",
      maxPrice: "1200",
      onSale: "true",
      page: "2",
      limit: "6",
    });
    expect(init).toMatchObject({
      method: "GET",
      next: { tags: ["products", "catalog"], revalidate: 60 },
    });
  });

  it("uses authenticated fetch when requested", async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ products: [], page: 1 }));

    await getProducts({}, { authenticated: true });

    expect(authFetchMock).toHaveBeenCalledWith(
      "https://api.nova.test/products?sort=popular&page=1&limit=12",
      {
        method: "GET",
        cache: "no-store",
        next: { tags: ["products", "catalog"] },
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a public request after an authenticated 401", async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({}, 401));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ products: [], total: 0, page: 1, totalPages: 0 }),
    );

    await expect(getProducts({}, { authenticated: true })).resolves.toEqual(emptyResult);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns an empty result for HTTP and network failures", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(getProducts()).resolves.toEqual(emptyResult);

    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(getProducts()).resolves.toEqual(emptyResult);
    expect(console.error).toHaveBeenCalled();
  });

  it("rethrows Next.js navigation errors", async () => {
    const navigationError = { digest: "NEXT_REDIRECT;replace;/products;307;" };
    fetchMock.mockRejectedValueOnce(navigationError);

    await expect(getProducts()).rejects.toBe(navigationError);
  });
});
