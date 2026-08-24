import type { DefaultSession } from "next-auth";

// Shared augmentation for both Auth.js instances (lib/auth/admin.ts,
// lib/auth/participant.ts) — each only ever populates its own fields.
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      isAdmin?: boolean;
      participantId?: string;
      username?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    isAdmin?: boolean;
    participantId?: string;
    username?: string;
  }
}
