import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { signIn } from "@/lib/auth/admin";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  async function loginWithAuthentik() {
    "use server";
    await signIn("authentik", { redirectTo: callbackUrl || "/admin" });
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#FAFAFA] px-4 py-24 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">35events admin</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
          Log in met je Authentik-account.
        </p>
        <form action={loginWithAuthentik}>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
          >
            Inloggen met Authentik
          </button>
        </form>
      </div>
    </div>
  );
}
