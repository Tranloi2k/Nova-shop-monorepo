import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { cookies } from "next/headers";
import Google from "next-auth/providers/google";
import { googleLogin as googleAuthAction } from "@/app/lib/actions";
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "@/app/lib/auth-tokens";
import { devLog } from "@/app/lib/dev-logger";

async function login(params: { email: string; password: string }) {
  const { email, password } = params;
  const options = {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
  };
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/login`,
    options,
  ).then((res) => {
    if (!res.ok) {
      throw new Error("Login failed");
    }
    return res.json();
  });
  return response;
}

async function logout() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (refreshToken) {
      await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error("Backend logout failed:", error);
    // Continue with cookie cleanup even if backend call fails
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          try {
            const response = await login({ email, password });
            await setAuthCookies({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              userId: response.userId,
            });
            return { id: email, name: email };
          } catch (error) {
            console.error("Login failed:", error);
          }
        }
        devLog("Invalid credentials");
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google") {
        if (!account.id_token) {
          console.error("Google did not return an ID token");
          return false;
        }
        try {
          const response = await googleAuthAction({
            idToken: account.id_token,
          });

          await setAuthCookies({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            userId: response.userId,
          });

          devLog("Google login successful");
          return true;
        } catch (error) {
          console.error("❌ Google login failed:", error);
          return false;
        }
      }

      // For credentials provider, authorize already handled the logic
      return true;
    },
  },
  events: {
    async signOut() {
      devLog("Signing out user");

      try {
        await logout();

        await clearAuthCookies();

        devLog("Cookies cleared successfully");
      } catch (error) {
        console.error("❌ Sign out error:", error);
      }
    },
  },
});
