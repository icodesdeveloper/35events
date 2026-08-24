"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { generateMagicLinkToken, hashMagicLinkToken } from "@/lib/auth/magicLinkToken";
import { sendMail } from "@/lib/mail/transporter";
import { magicLinkEmail } from "@/lib/mail/templates";

export type MagicLinkState = { sent?: boolean; error?: string };

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function requestMagicLink(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email) return { error: "Vul een e-mailadres in." };
  const normalizedEmail = email.toLowerCase();

  // Magic link doubles as sign-up: create the account on first request.
  let participant = await prisma.participant.findUnique({ where: { email: normalizedEmail } });
  if (!participant) {
    participant = await prisma.participant.create({
      data: { email: normalizedEmail, username: `deelnemer-${randomUUID().slice(0, 8)}` },
    });
  }

  const token = generateMagicLinkToken();
  await prisma.participantMagicLinkToken.create({
    data: {
      participantId: participant.id,
      tokenHash: hashMagicLinkToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const url = `${SITE_URL}/magic-link/verify?email=${encodeURIComponent(normalizedEmail)}&token=${token}`;
  const { subject, text, html } = magicLinkEmail(url);
  await sendMail({ to: normalizedEmail, subject, text, html });

  return { sent: true };
}
