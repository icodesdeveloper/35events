import HeroVideo from "@/components/public/HeroVideo";
import EventGrid from "@/components/public/EventGrid";
import ContactForm from "@/components/forms/ContactForm";
import { getUpcomingEvents, getRegisteredEventIds } from "@/lib/events";
import { auth as participantAuth } from "@/lib/auth/participant";

export default async function Home() {
  const [upcomingEvents, session] = await Promise.all([getUpcomingEvents(), participantAuth()]);

  const registeredEventIds = session?.user?.participantId
    ? await getRegisteredEventIds(session.user.participantId)
    : undefined;

  return (
    <>
      <HeroVideo />

      <section id="aankomende-events" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="mb-10">
          <span className="font-mono-label text-accent text-xs">Agenda</span>
          <h2 className="font-display mt-2 text-2xl font-medium tracking-tight text-white md:text-3xl">
            Aankomende events
          </h2>
        </div>
        <EventGrid
          events={upcomingEvents}
          emptyMessage="Momenteel geen aankomende events — hou deze pagina in de gaten."
          registeredEventIds={registeredEventIds}
        />
      </section>

      <section id="contact" className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <div className="mb-10">
          <span className="font-mono-label text-accent text-xs">Contact</span>
          <h2 className="font-display mt-2 text-2xl font-medium tracking-tight text-white md:text-3xl">
            Neem contact op
          </h2>
          <p className="mt-3 text-white/60">Vraag, voorstel of gewoon een babbel? Laat het ons weten.</p>
        </div>
        <ContactForm />
      </section>
    </>
  );
}
