import { prisma } from "@/lib/prisma";
import AdminAllowlistManager from "@/components/admin/AdminAllowlistManager";

export default async function AdminsPage() {
  const entries = await prisma.adminAllowlist.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">Admins</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Wie hier staat kan inloggen op dit admin-paneel via Authentik met dat e-mailadres.
      </p>
      <AdminAllowlistManager entries={entries} bootstrapEmail={process.env.ADMIN_BOOTSTRAP_EMAIL ?? null} />
    </div>
  );
}
