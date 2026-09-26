import { describe, expect, it } from "vitest";
import { createAuthCookieDefinitions } from "@/app/lib/auth-constants";

describe("createAuthCookieDefinitions", () => {
  it("creates secure access, refresh, expiry, and user cookies", () => {
    const definitions = createAuthCookieDefinitions(
      {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        userId: 7,
      },
      true,
      1_000,
    );

    expect(definitions).toHaveLength(4);
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "access_token",
          value: "access-token",
          maxAge: 900,
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        }),
        expect.objectContaining({
          name: "refresh_token",
          value: "refresh-token",
          maxAge: 604_800,
        }),
        expect.objectContaining({
          name: "access_token_expires_at",
          value: "1900",
        }),
        expect.objectContaining({ name: "user_id", value: "7" }),
      ]),
    );
  });

  it("omits the optional user cookie", () => {
    const definitions = createAuthCookieDefinitions(
      { accessToken: "access-token", refreshToken: "refresh-token" },
      false,
      1_000,
    );

    expect(definitions).toHaveLength(3);
    expect(definitions.some(({ name }) => name === "user_id")).toBe(false);
  });
});
