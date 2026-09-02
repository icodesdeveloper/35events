import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import RegistrationForm from "@/components/forms/RegistrationForm";
import { getEffectivePricing } from "@/lib/pricing";

export default async function EventRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      questionForm: { include: { questions: { orderBy: { order: "asc" } } } },
      earlybirdPrices: true,
    },
  });
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

  const questions =
    event.questionForm?.published
      ? event.questionForm.questions.map((q) => ({
          id: q.id,
          type: q.type as "TEXT" | "EMAIL" | "NUMBER" | "SELECT",
          label: q.label,
          required: q.required,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
          perPassenger: q.perPassenger,
        }))
      : [];

  const hasPrice = event.price != null || event.earlybirdPrices.length > 0;
  // Quote the same rates the server will charge on submit (earlybird tier
  // included), so the total shown in the form matches the payment request.
  const pricing = getEffectivePricing(event);
  const price = hasPrice ? String(pricing.price) : null;
  const hasPassengerPrice = event.passengerPrice != null || pricing.passengerPrice > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-white">Registreren</h1>
      <p className="mb-8 text-slate-600 dark:text-slate-300">{event.name}</p>
      <RegistrationForm
        slug={slug}
        price={price}
        passengerPrice={hasPassengerPrice ? String(pricing.passengerPrice) : null}
        maxPassengers={event.maxPassengers}
        questions={questions}
      />
    </div>
  );
}
