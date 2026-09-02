import { prisma } from "@/lib/prisma";

// Participant.username is required and unique, but someone the admin adds by
// email never picked one — so derive it from the address and de-duplicate.
function baseUsernameFrom(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
  return cleaned.length >= 3 ? cleaned.slice(0, 24) : "deelnemer";
}

async function uniqueUsername(base: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const taken = await prisma.participant.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // Practically unreachable; keeps the return type honest rather than looping
  // forever on a pathologically contested base.
  return `${base}-${Date.now().toString(36)}`;
}

export type FindOrCreateResult = {
  participant: { id: string; email: string; username: string };
  created: boolean;
};

// Used by the admin's "add someone who has no account" flow. The account is
// created without a password on purpose: Participant.passwordHash is optional
// and the magic-link login (lib/auth/participant.ts) works fine without one,
// so the person can get in from the confirmation mail without ever setting
// one up. An existing address is reused rather than rejected, so adding the
// same friend to a second event just works.
export async function findOrCreateParticipantByEmail(rawEmail: string): Promise<FindOrCreateResult> {
  const email = rawEmail.trim().toLowerCase();

  const existing = await prisma.participant.findUnique({
    where: { email },
    select: { id: true, email: true, username: true },
  });
  if (existing) return { participant: existing, created: false };

  const username = await uniqueUsername(baseUsernameFrom(email));
  const participant = await prisma.participant.create({
    data: { email, username },
    select: { id: true, email: true, username: true },
  });
  return { participant, created: true };
}
