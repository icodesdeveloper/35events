"use server";

import { signOut } from "@/lib/auth/admin";

export async function adminSignOut() {
  await signOut({ redirectTo: "/" });
}
