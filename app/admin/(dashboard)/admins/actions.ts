"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type AdminAllowlistFormState = { error?: string; fieldErrors?: Record<string, string> };

const addSchema = z.object({
  email: z.email("Ongeldig e-mailadres").trim().toLowerCase(),
  label: z.string().trim().optional(),
});

export async function addAdminAllowlistEntry(
  _prevState: AdminAllowlistFormState,
  formData: FormData,
): Promise<AdminAllowlistFormState> {
  const result = addSchema.safeParse({
    email: formData.get("email"),
    label: formData.get("label") || undefined,
  });
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, label } = result.data;
  const existing = await prisma.adminAllowlist.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: "Dit e-mailadres staat al op de lijst" } };

  await prisma.adminAllowlist.create({ data: { email, label: label || null } });
  revalidatePath("/admin/admins");
  return {};
}

export async function removeAdminAllowlistEntry(id: string) {
  await prisma.adminAllowlist.delete({ where: { id } });
  revalidatePath("/admin/admins");
}
