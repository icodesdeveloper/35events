"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/settings";
import { saveUploadedFile, storage } from "@/lib/storage";

export async function saveSettings(formData: FormData) {
  const bankAccountIban = String(formData.get("bankAccountIban") ?? "").trim();
  const bankAccountName = String(formData.get("bankAccountName") ?? "").trim();

  const logo = formData.get("logo");
  let logoPath: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    logoPath = await saveUploadedFile(logo, "settings");
    const current = await getSettings();
    if (current.logoPath) await storage.delete(current.logoPath);
  }

  await updateSettings({
    bankAccountIban: bankAccountIban || null,
    bankAccountName: bankAccountName || null,
    ...(logoPath ? { logoPath } : {}),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}
