import type { NextAuthConfig } from "next-auth";
import {
  ACCESS_EXPIRES_COOKIE,
  isAccessTokenExpired,
  REFRESH_TOKEN_COOKIE,
} from "@/app/lib/auth-constants";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 12 * 60 * 60, // 12 hours
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl, cookies } }) {
      const isLoggedIn = !!auth?.user;
      const hasAccessToken = !!cookies.get("access_token")?.value;
      const hasRefreshToken = !!cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      const accessExpired = isAccessTokenExpired(
        cookies.get(ACCESS_EXPIRES_COOKIE)?.value,
      );
      const hasValidSession =
        isLoggedIn &&
        ((hasAccessToken && !accessExpired) || hasRefreshToken);
      const isProtectedRoute =
        nextUrl.pathname.startsWith("/customers") ||
        nextUrl.pathname.startsWith("/checkout");

      if (isProtectedRoute) {
        if (hasValidSession) {
          return true;
        }
        return false; // Redirect unauthenticated users to login page
      } else if (hasValidSession && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/products", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
