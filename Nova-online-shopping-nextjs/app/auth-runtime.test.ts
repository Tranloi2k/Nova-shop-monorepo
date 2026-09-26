import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthRuntimeConfig = {
  callbacks: {
    signIn: (input: {
      account?: { provider: string; id_token?: string };
    }) => Promise<boolean>;
  };
  events: { signOut: () => Promise<void> };
};

const mocks = vi.hoisted(() => ({
  config: undefined as AuthRuntimeConfig | undefined,
  googleLogin: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: AuthRuntimeConfig) => {
    mocks.config = config;
    return {
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      handlers: {},
    };
  },
}));
vi.mock("next-auth/providers/google", () => ({
  default: (config: unknown) => ({ id: "google", config }),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => ({ id: "credentials", config }),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet })),
}));
vi.mock("@/app/lib/actions", () => ({ googleLogin: mocks.googleLogin }));
vi.mock("@/app/lib/auth-tokens", async () => {
  const actual = await vi.importActual<typeof import("@/app/lib/auth-tokens")>(
    "@/app/lib/auth-tokens",
  );
  return {
    ...actual,
    setAuthCookies: mocks.setAuthCookies,
    clearAuthCookies: mocks.clearAuthCookies,
  };
});
vi.mock("@/app/lib/dev-logger", () => ({ devLog: vi.fn() }));

import "@/auth";

function runtimeConfig(): AuthRuntimeConfig {
  if (!mocks.config) throw new Error("NextAuth configuration was not captured");
  return mocks.config;
}

describe("Auth.js OAuth callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_EXTERNAL_API_URL", "https://api.example.invalid");
  });

  it("rejects Google callbacks without an ID token", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      runtimeConfig().callbacks.signIn({ account: { provider: "google" } }),
    ).resolves.toBe(false);
  });

  it("exchanges a Google ID token and stores only internal tokens", async () => {
    mocks.googleLogin.mockResolvedValue({
      accessToken: "internal-access-token",
      refreshToken: "internal-refresh-token",
      userId: 7,
    });

    await expect(
      runtimeConfig().callbacks.signIn({
        account: { provider: "google", id_token: "google-id-token" },
      }),
    ).resolves.toBe(true);
    expect(mocks.setAuthCookies).toHaveBeenCalledWith({
      accessToken: "internal-access-token",
      refreshToken: "internal-refresh-token",
      userId: 7,
    });
  });

  it("rejects the Auth.js sign-in when the backend exchange fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.googleLogin.mockRejectedValue(new Error("invalid token"));

    await expect(
      runtimeConfig().callbacks.signIn({
        account: { provider: "google", id_token: "invalid-id-token" },
      }),
    ).resolves.toBe(false);
  });

  it("allows non-Google providers to continue through their own authorization", async () => {
    await expect(
      runtimeConfig().callbacks.signIn({ account: { provider: "credentials" } }),
    ).resolves.toBe(true);
  });

  it("revokes the refresh token and clears cookies on sign-out", async () => {
    mocks.cookieGet.mockImplementation((name: string) =>
      name === "refresh_token" ? { value: "refresh-token" } : undefined,
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await runtimeConfig().events.signOut();

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.invalid/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "refresh-token" }),
    });
    expect(mocks.clearAuthCookies).toHaveBeenCalledOnce();
  });

  it("contains cookie cleanup errors during sign-out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.cookieGet.mockReturnValue(undefined);
    mocks.clearAuthCookies.mockRejectedValue(new Error("cookie store unavailable"));

    await expect(runtimeConfig().events.signOut()).resolves.toBeUndefined();
  });
});
