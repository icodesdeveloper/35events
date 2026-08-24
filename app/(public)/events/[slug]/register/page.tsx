import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import RegistrationForm from "@/components/forms/RegistrationForm";

export default async function EventRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.published) notFound();
  if (!event.registrationOpen) redirect(`/events/${slug}`);

  const session = await participantAuth();
  if (!session?.user?.participantId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}`);
  }

  const existing = await prisma.registration.findUnique({
    where: { eventId_participantId: { eventId: event.id, participantId: session.user.participantId } },
  });
  if (existing) redirect(`/events/${slug}/register/success`);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-white">Registreren</h1>
      <p className="mb-8 text-slate-600 dark:text-slate-300">{event.name}</p>
      <RegistrationForm
        slug={slug}
        price={event.price?.toString() ?? null}
        passengerPrice={event.passengerPrice?.toString() ?? null}
      />
    </div>
  );
}
