import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import {
  ACCESS_EXPIRES_COOKIE,
  ACCESS_TOKEN_COOKIE,
  createAuthCookieDefinitions,
  isAccessTokenExpired,
  REFRESH_TOKEN_COOKIE,
  USER_ID_COOKIE,
} from "@/app/lib/auth-constants";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const expiresAt = req.cookies.get(ACCESS_EXPIRES_COOKIE)?.value;

  const needsRefresh =
    refreshToken && (!accessToken || isAccessTokenExpired(expiresAt));

  if (!needsRefresh) {
    return NextResponse.next();
  }

  const apiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL;
  if (!apiUrl) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${apiUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) {
      const response = NextResponse.next();
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      response.cookies.delete(ACCESS_EXPIRES_COOKIE);
      response.cookies.delete(USER_ID_COOKIE);
      return response;
    }

    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      userId?: string | number;
    };

    const isProd = process.env.NODE_ENV === "production";
    const cookieDefinitions = createAuthCookieDefinitions(data, isProd);

    // Make the refreshed credentials visible to Server Components in this
    // same request as well as to the browser on subsequent requests.
    const requestHeaders = new Headers(req.headers);
    const requestCookies = req.cookies;
    for (const definition of cookieDefinitions) {
      requestCookies.set(definition.name, definition.value);
    }
    requestHeaders.set("cookie", requestCookies.toString());
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    for (const definition of cookieDefinitions) {
      response.cookies.set(definition);
    }

    return response;
  } catch {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    /*
     * Exclude static assets and SEO files (sitemap.xml, robots.txt) so
     * Googlebot never hits NextAuth token refresh on metadata routes.
     */
    "/((?!api|monitoring|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*[.].*).*)",
  ],
};
