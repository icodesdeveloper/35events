import AuthCard from "@/components/forms/AuthCard";
import ParticipantLoginForm from "@/components/forms/ParticipantLoginForm";

export default async function ParticipantLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthCard title="Inloggen" subtitle="Log in om je te registreren voor een event.">
      <ParticipantLoginForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
