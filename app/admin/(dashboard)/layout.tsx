import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  // proxy.ts already gates /admin/**, this is just a defense-in-depth
  // fallback in case a future route falls outside its matcher.
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/admin/login");

  const userLabel = session?.user?.email ?? session?.user?.name ?? "";
  const pendingCount = await prisma.registration.count({ where: { paymentStatus: "PENDING_PAYMENT" } });
  const settings = await getSettings();

  return (
    <AdminShell userLabel={userLabel} pendingCount={pendingCount} logoPath={settings.logoPath}>
      {children}
    </AdminShell>
  );
}
