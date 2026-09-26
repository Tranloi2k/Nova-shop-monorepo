import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));
vi.mock("next/server", () => {
  class MockResponse {
    cookies = { set: vi.fn(), delete: vi.fn() };
    options: unknown;

    constructor(options?: unknown) {
      this.options = options;
    }

    static next(options?: unknown) {
      return new MockResponse(options);
    }
  }

  return { NextResponse: MockResponse };
});

import middleware from "@/middleware";

function requestWithCookies(values: Record<string, string>) {
  const current = new Map(Object.entries(values));
  return {
    headers: new Headers(),
    cookies: {
      get: (name: string) => {
        const value = current.get(name);
        return value === undefined ? undefined : { value };
      },
      set: (name: string, value: string) => current.set(name, value),
      toString: () =>
        [...current.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
    },
  };
}

type MiddlewareResponse = {
  cookies: {
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  options?: { request?: { headers: Headers } };
};

const runMiddleware = middleware as unknown as (
  request: ReturnType<typeof requestWithCookies>,
) => Promise<MiddlewareResponse>;

describe("authentication middleware refresh", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "https://api.example.invalid");
  });

  it("does not refresh a non-expired access token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const future = Math.floor(Date.now() / 1000) + 300;

    await runMiddleware(
      requestWithCookies({
        access_token: "access-token",
        refresh_token: "refresh-token",
        access_token_expires_at: String(future),
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears backend cookies when refresh is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const response = await runMiddleware(
      requestWithCookies({ refresh_token: "invalid-refresh-token" }),
    );

    expect(response.cookies.delete).toHaveBeenCalledTimes(4);
  });

  it("skips refresh when the backend URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await runMiddleware(requestWithCookies({ refresh_token: "refresh-token" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("contains network failures while refreshing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(
      runMiddleware(requestWithCookies({ refresh_token: "refresh-token" })),
    ).resolves.toBeDefined();
  });

  it("forwards refreshed credentials to the request and browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: "new-access-token",
          refreshToken: "refresh-token",
          userId: 7,
        }),
      }),
    );

    const response = await runMiddleware(
      requestWithCookies({ refresh_token: "refresh-token" }),
    );

    expect(response.options?.request?.headers.get("cookie")).toContain(
      "access_token=new-access-token",
    );
    expect(response.cookies.set).toHaveBeenCalledTimes(4);
    expect(response.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "user_id",
        value: "7",
        httpOnly: true,
        sameSite: "lax",
      }),
    );
  });

  it("refreshes successfully when the backend omits an optional user id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: "new-access-token",
          refreshToken: "refresh-token",
        }),
      }),
    );

    const response = await runMiddleware(
      requestWithCookies({ refresh_token: "refresh-token" }),
    );

    expect(response.cookies.set).toHaveBeenCalledTimes(3);
  });
});
