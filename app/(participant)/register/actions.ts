"use server";

import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";
import { participantRegisterSchema } from "@/lib/validation/participant";
import { signIn } from "@/lib/auth/participant";

export type RegisterState = { error?: string; fieldErrors?: Record<string, string> };

export async function registerParticipant(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const result = participantRegisterSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { username, email, password } = result.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.participant.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username }] },
  });
  if (existing) {
    return {
      fieldErrors:
        existing.email === normalizedEmail
          ? { email: "Dit e-mailadres is al in gebruik" }
          : { username: "Deze gebruikersnaam is al in gebruik" },
    };
  }

  const passwordHash = await hash(password);
  await prisma.participant.create({
    data: { username, email: normalizedEmail, passwordHash },
  });

  await signIn("credentials", { identifier: normalizedEmail, password, redirectTo: "/account" });
  return {};
}
