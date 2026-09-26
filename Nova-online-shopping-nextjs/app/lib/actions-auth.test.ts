import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  refreshShopRoute: vi.fn(),
}));

vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "AuthError";
  },
}));
vi.mock("@/app/lib/revalidate-shop", () => ({
  refreshShopRoute: mocks.refreshShopRoute,
}));

import { googleLogin } from "@/app/lib/actions";

describe("googleLogin server action", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "https://api.example.invalid");
  });

  it("forwards the ID token without allowing response caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ accessToken: "internal-access-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(googleLogin({ idToken: "google-id-token" })).resolves.toEqual({
      accessToken: "internal-access-token",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.invalid/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "google-id-token" }),
      cache: "no-store",
    });
  });

  it("rejects a failed backend exchange", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, statusText: "Unauthorized" }),
    );

    await expect(googleLogin({ idToken: "invalid-id-token" })).rejects.toThrow(
      "Google login failed: Unauthorized",
    );
  });
});
