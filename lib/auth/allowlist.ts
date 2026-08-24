import { prisma } from "@/lib/prisma";

// Authentik authenticating someone is not the same as this app authorizing
// them — mirrors cflow's Instellingen > Toegangsbeheer pattern. The bootstrap
// email always works even against an empty AdminAllowlist table, so the
// first login (before anyone's had a chance to add themselves) never locks
// the owner out.
export async function isAllowedAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();

  if (process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase() === normalized) {
    return true;
  }

  const entry = await prisma.adminAllowlist.findUnique({ where: { email: normalized } });
  return entry !== null;
}
