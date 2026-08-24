"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/participant";

export type LoginState = { error?: string };

export async function loginParticipant(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/account";

  try {
    await signIn("credentials", { identifier, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Ongeldige inloggegevens." };
    }
    throw error; // Next's redirect() throws internally on success — let it propagate.
  }

  return {};
}
