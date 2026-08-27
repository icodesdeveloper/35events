import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

// Upserts the singleton row on first read so callers never have to handle a
// missing-settings case — mirrors how a fresh install has no rows yet but
// every field is optional until the admin fills it in via /admin/settings.
export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function updateSettings(data: {
  bankAccountIban: string | null;
  bankAccountName: string | null;
  logoPath?: string;
}) {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
}
