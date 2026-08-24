import NextAuth from "next-auth";
import Authentik from "next-auth/providers/authentik";
import { isAllowedAdminEmail } from "@/lib/auth/allowlist";

// Separate Auth.js instance from the participant one (lib/auth/participant.ts)
// — distinct basePath and cookie names so the two never collide in the same
// browser. JWT sessions only: the allowlist check runs once here, at
// sign-in/token-refresh time (Node runtime), and its result is baked into
// the token as `isAdmin` — middleware.ts then only reads that claim, since
// Next Middleware runs on the Edge runtime by default where Prisma can't.
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/admin",
  trustHost: true,
  secret: process.env.ADMIN_AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Authentik({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    }),
  ],
  cookies: {
    sessionToken: { name: "admin-auth.session-token" },
    callbackUrl: { name: "admin-auth.callback-url" },
    csrfToken: { name: "admin-auth.csrf-token" },
    pkceCodeVerifier: { name: "admin-auth.pkce.code_verifier" },
    state: { name: "admin-auth.state" },
    nonce: { name: "admin-auth.nonce" },
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedAdminEmail(user.email);
    },
    async jwt({ token }) {
      // Re-checked on every token refresh, not just at initial sign-in, so
      // a revoked allowlist entry takes effect without waiting for the
      // session to fully expire.
      token.isAdmin = await isAllowedAdminEmail(token.email);
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = Boolean(token.isAdmin);
      return session;
    },
  },
});
