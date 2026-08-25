import type { Event } from "@prisma/client";
import EventCard from "@/components/public/EventCard";
import FadeIn from "@/components/public/FadeIn";
import type { EarlybirdTier } from "@/lib/pricing";

export default function EventGrid({
  events,
  emptyMessage,
  registeredEventIds,
}: {
  events: (Event & { earlybirdPrices: EarlybirdTier[] })[];
  emptyMessage: string;
  registeredEventIds?: Set<string>;
}) {
  if (events.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <FadeIn key={event.id} delay={index * 0.06}>
          <EventCard event={event} isRegistered={registeredEventIds?.has(event.id)} />
        </FadeIn>
      ))}
    </div>
  );
}
