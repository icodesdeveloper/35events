"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/participant";

export type VerifyMagicLinkState = { error?: string };

export async function verifyMagicLink(
  email: string,
  token: string,
  callbackUrl: string,
  _prevState: VerifyMagicLinkState,
): Promise<VerifyMagicLinkState> {
  try {
    await signIn("magic-link", { email, token, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Deze login-link is ongeldig of verlopen. Vraag een nieuwe aan." };
    }
    throw error; // Next's redirect() throws internally on success — let it propagate.
  }

  return {};
}
