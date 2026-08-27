import { notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { getEventBySlug } from "@/lib/events";
import { getMediaViewer, getVisibleSections } from "@/lib/media";
import { auth as participantAuth } from "@/lib/auth/participant";
import MediaGallery from "@/components/public/MediaGallery";

export default async function EventMediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const session = await participantAuth();
  const viewer = await getMediaViewer(session?.user?.participantId ?? null);
  const visibleSections = getVisibleSections(event, viewer);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
      <Link
        href={`/events/${event.slug}`}
        className="font-mono-label mb-8 inline-flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        {event.name}
      </Link>

      <h1 className="font-display mb-10 text-3xl font-medium tracking-tight text-white md:text-4xl">Media</h1>

      {visibleSections.length === 0 ? (
        <p className="text-white/50">Nog geen media zichtbaar voor dit event.</p>
      ) : (
        <MediaGallery sections={visibleSections} bare />
      )}
    </section>
  );
}
