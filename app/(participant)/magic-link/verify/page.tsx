import AuthCard from "@/components/forms/AuthCard";
import MagicLinkVerifyForm from "@/components/forms/MagicLinkVerifyForm";

export default async function MagicLinkVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; callbackUrl?: string }>;
}) {
  const { email, token, callbackUrl } = await searchParams;

  if (!email || !token) {
    return (
      <AuthCard title="Ongeldige link">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Deze login-link ontbreekt vereiste gegevens. Vraag een nieuwe aan.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Inloggen" subtitle="Klik hieronder om je login-link te bevestigen.">
      <MagicLinkVerifyForm email={email} token={token} callbackUrl={callbackUrl || "/account"} />
    </AuthCard>
  );
}
