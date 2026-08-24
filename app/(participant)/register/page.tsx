import AuthCard from "@/components/forms/AuthCard";
import ParticipantRegisterForm from "@/components/forms/ParticipantRegisterForm";

export default function ParticipantRegisterPage() {
  return (
    <AuthCard title="Account aanmaken" subtitle="Nodig om je te registreren voor een event.">
      <ParticipantRegisterForm />
    </AuthCard>
  );
}
