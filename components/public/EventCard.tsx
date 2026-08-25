import Link from "next/link";
import type { Event } from "@prisma/client";
import { formatDistance, formatDuration, formatEventDate, formatPrice } from "@/lib/format";
import { getEffectivePrice, type EarlybirdTier } from "@/lib/pricing";

export default function EventCard({
  event,
  isRegistered,
}: {
  event: Event & { earlybirdPrices: EarlybirdTier[] };
  isRegistered?: boolean;
}) {
  const hasPrice = event.price != null || event.earlybirdPrices.length > 0;
  const stats = [
    event.distanceKm ? formatDistance(event.distanceKm) : null,
    event.durationMinutes ? formatDuration(event.durationMinutes) : null,
    hasPrice ? formatPrice(getEffectivePrice(event)) : null,
  ].filter((stat): stat is string => stat !== null);

  return (
    <Link href={`/events/${event.slug}`} className="group flex flex-col">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
        {event.coverImagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- served via the media API route, not a static asset next/image can optimize
          <img
            src={`/api/media/${event.coverImagePath}`}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {isRegistered ? (
          <span className="font-mono-label absolute top-3 right-3 border border-emerald-400/40 bg-zinc-950/70 px-2 py-1 text-[10px] text-emerald-400 backdrop-blur-sm">
            Ingeschreven
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <h3 className="font-display inline-block border-b-2 border-transparent pb-0.5 text-lg font-medium text-white transition-colors duration-300 group-hover:border-accent">
          {event.name}
        </h3>
        <div className="font-mono-label mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
          <span>{formatEventDate(event.date, event.endDate)}</span>
          {stats.map((stat) => (
            <span key={stat} className="border-l border-white/15 pl-3">
              {stat}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
