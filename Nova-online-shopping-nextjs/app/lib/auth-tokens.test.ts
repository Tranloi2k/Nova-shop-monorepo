import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookieSet: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet })),
}));

import { fetchTokenRefresh, setAuthCookies } from "@/app/lib/auth-tokens";

describe("fetchTokenRefresh", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.cookieSet.mockReset();
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "https://api.example.invalid");
  });

  it("writes one consistent definition for every authentication cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await setAuthCookies({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      userId: 7,
    });

    expect(mocks.cookieSet).toHaveBeenCalledTimes(4);
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "user_id",
        value: "7",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }),
    );
  });

  it("requests a non-cacheable token refresh", async () => {
    const tokens = {
      accessToken: "new-access-token",
      refreshToken: "refresh-token",
      userId: 7,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(tokens),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTokenRefresh("refresh-token")).resolves.toEqual(tokens);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.invalid/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "refresh-token" }),
      cache: "no-store",
    });
  });

  it("returns null when refresh is unavailable or rejected", async () => {
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "");
    await expect(fetchTokenRefresh("refresh-token")).resolves.toBeNull();

    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "https://api.example.invalid");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchTokenRefresh("refresh-token")).resolves.toBeNull();
  });
});
