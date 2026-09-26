export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const ACCESS_EXPIRES_COOKIE = "access_token_expires_at";
export const USER_ID_COOKIE = "user_id";

export type AuthCookieTokens = {
  accessToken: string;
  refreshToken: string;
  userId?: string | number;
};

export function createAuthCookieDefinitions(
  tokens: AuthCookieTokens,
  secure: boolean,
  nowInSeconds = Math.floor(Date.now() / 1000),
) {
  const commonOptions = {
    httpOnly: true,
    path: "/",
    secure,
    sameSite: "lax" as const,
  };
  const definitions = [
    {
      ...commonOptions,
      name: ACCESS_TOKEN_COOKIE,
      value: tokens.accessToken,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    },
    {
      ...commonOptions,
      name: REFRESH_TOKEN_COOKIE,
      value: tokens.refreshToken,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    },
    {
      ...commonOptions,
      name: ACCESS_EXPIRES_COOKIE,
      value: String(nowInSeconds + ACCESS_TOKEN_MAX_AGE),
      maxAge: ACCESS_TOKEN_MAX_AGE,
    },
  ];

  if (tokens.userId !== undefined) {
    definitions.push({
      ...commonOptions,
      name: USER_ID_COOKIE,
      value: String(tokens.userId),
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return definitions;
}

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function isAccessTokenExpired(
  expiresAt: string | number | undefined,
): boolean {
  if (expiresAt === undefined || expiresAt === "") {
    return true;
  }
  const exp =
    typeof expiresAt === "string" ? Number.parseInt(expiresAt, 10) : expiresAt;
  if (Number.isNaN(exp)) {
    return true;
  }
  return Math.floor(Date.now() / 1000) >= exp;
}
