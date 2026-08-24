import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";
import { hashMagicLinkToken } from "@/lib/auth/magicLinkToken";

// Separate Auth.js instance from the admin one (lib/auth/admin.ts) — own
// basePath, own cookie names, no adapter. Both providers here are type
// "credentials" (password AND magic-link) — deliberately NOT Auth.js's
// built-in "email" provider type. @auth/core's assertConfig has a bug where
// `hasEmail`/`hasCredentials`/`hasWebAuthn` are module-level `let`s instead
// of being scoped inside the function (see node_modules/@auth/core/lib/utils/assert.js),
// so validating an "email"-type provider anywhere in the process permanently
// flips a shared flag that then makes every *other* NextAuth() instance's
// config validation (e.g. lib/auth/admin.ts, which has no adapter) fail with
// "Email login requires an adapter" — even though it has no email provider
// itself. Keeping every provider, in every instance, as "credentials" type
// sidesteps that bug entirely, regardless of how many NextAuth() instances
// coexist in the app.
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/participant",
  trustHost: true,
  secret: process.env.PARTICIPANT_AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: { name: "participant-auth.session-token" },
    callbackUrl: { name: "participant-auth.callback-url" },
    csrfToken: { name: "participant-auth.csrf-token" },
  },
  providers: [
    Credentials({
      id: "credentials",
      credentials: {
        identifier: { label: "E-mail of gebruikersnaam" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier;
        const password = credentials?.password;
        if (typeof identifier !== "string" || typeof password !== "string") return null;

        const participant = await prisma.participant.findFirst({
          where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
        });
        if (!participant?.passwordHash) return null;

        const valid = await verify(participant.passwordHash, password);
        if (!valid) return null;

        return { id: participant.id, email: participant.email, name: participant.username };
      },
    }),
    Credentials({
      id: "magic-link",
      credentials: { email: {}, token: {} },
      async authorize(credentials) {
        const email = credentials?.email;
        const token = credentials?.token;
        if (typeof email !== "string" || typeof token !== "string") return null;

        const participant = await prisma.participant.findUnique({ where: { email: email.toLowerCase() } });
        if (!participant) return null;

        const tokenHash = hashMagicLinkToken(token);
        const record = await prisma.participantMagicLinkToken.findUnique({ where: { tokenHash } });
        if (!record || record.participantId !== participant.id || record.consumedAt) return null;
        if (record.expiresAt < new Date()) return null;

        await prisma.participantMagicLinkToken.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        });

        return { id: participant.id, email: participant.email, name: participant.username };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.participantId = user.id;
        token.username = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.participantId = token.participantId;
      session.user.username = token.username;
      return session;
    },
  },
});
