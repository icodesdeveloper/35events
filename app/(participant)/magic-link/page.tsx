import AuthCard from "@/components/forms/AuthCard";
import MagicLinkRequestForm from "@/components/forms/MagicLinkRequestForm";

export default function MagicLinkPage() {
  return (
    <AuthCard title="Login-link" subtitle="We sturen je een link waarmee je zonder wachtwoord inlogt.">
      <MagicLinkRequestForm />
    </AuthCard>
  );
}
