import { getEventsVisibleUnderMedia, getMediaViewer } from "@/lib/media";
import { auth as participantAuth } from "@/lib/auth/participant";
import FadeIn from "@/components/public/FadeIn";
import EventCard from "@/components/public/EventCard";

export default async function MediaPage() {
  const session = await participantAuth();
  const viewer = await getMediaViewer(session?.user?.participantId ?? null);
  const pastEvents = await getEventsVisibleUnderMedia(viewer);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
      <div className="mb-10">
        <span className="font-mono-label text-accent text-xs">Archief</span>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-tight text-white md:text-4xl">Media</h1>
        <p className="mt-3 max-w-xl text-white/60">
          Foto&apos;s en video&apos;s van vorige edities. Kies een event om de volledige galerij te bekijken.
        </p>
      </div>

      {pastEvents.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Nog geen afgelopen events.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {pastEvents.map((event, index) => (
            <FadeIn key={event.id} delay={index * 0.06}>
              <EventCard event={event} />
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  );
}
