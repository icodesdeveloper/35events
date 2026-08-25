import { notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { getEventBySlug } from "@/lib/events";
import { formatDistance, formatDuration, formatEventDate, formatPrice } from "@/lib/format";
import MediaGallery from "@/components/public/MediaGallery";
import CornerBrackets from "@/components/public/CornerBrackets";
import { auth as participantAuth } from "@/lib/auth/participant";
import { prisma } from "@/lib/prisma";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Betaling in afwachting",
  CONFIRMED: "Bevestigd",
  CANCELLED: "Geannuleerd",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const session = await participantAuth();
  const registration = session?.user?.participantId
    ? await prisma.registration.findUnique({
        where: { eventId_participantId: { eventId: event.id, participantId: session.user.participantId } },
      })
    : null;

  const stats = [
    event.distanceKm ? formatDistance(event.distanceKm) : null,
    event.durationMinutes ? formatDuration(event.durationMinutes) : null,
    event.price != null ? `${formatPrice(event.price.toString())} deelname` : null,
    event.passengerPrice != null ? `${formatPrice(event.passengerPrice.toString())} passagier` : null,
  ].filter((stat): stat is string => stat !== null);

  return (
    <article>
      {event.coverImagePath ? (
        <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- served via the media API route */}
          <img src={`/api/media/${event.coverImagePath}`} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40" />
          <CornerBrackets />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-4 pb-8 md:px-8">
            <h1 className="font-display text-3xl font-medium tracking-tight text-white md:text-5xl">{event.name}</h1>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        {!event.coverImagePath ? (
          <h1 className="font-display mb-4 text-3xl font-medium tracking-tight text-white md:text-4xl">
            {event.name}
          </h1>
        ) : null}

        <div className="font-mono-label flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/50">
          <span>{formatEventDate(event.date, event.endDate)}</span>
          {stats.map((stat) => (
            <span key={stat} className="border-l border-white/15 pl-4">
              {stat}
            </span>
          ))}
        </div>

        {registration ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-emerald-400/30 px-5 py-4 text-sm text-emerald-300">
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
              Je bent ingeschreven voor dit event — {PAYMENT_STATUS_LABEL[registration.paymentStatus]}
            </span>
            <Link
              href="/account"
              className="border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-400/10"
            >
              Bekijk mijn registratie
            </Link>
          </div>
        ) : event.registrationOpen ? (
          <div className="border-accent/40 mt-8 flex flex-wrap items-center justify-between gap-3 border px-5 py-4 text-sm text-white/80">
            <span>Registraties zijn open voor dit event.</span>
            <Link
              href={`/events/${event.slug}/register`}
              className="bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
            >
              Registreren
            </Link>
          </div>
        ) : null}

        <div
          className="prose prose-invert prose-p:text-white/70 prose-headings:font-display mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />

        <MediaGallery media={event.media} />
      </div>
    </article>
  );
}
