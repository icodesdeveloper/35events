import { prisma } from "@/lib/prisma";

// Called every 5 minutes by the scheduler set up in instrumentation.ts.
// Edge-triggered on purpose: only flips Event.registrationOpen when the
// start/end date fell since the last time this actually ran — not
// "whenever we're past it" — otherwise an admin manually closing
// registration again after an auto-open (or reopening after an auto-close)
// would get overwritten on the very next tick. The manual toggle stays the
// single source of truth read everywhere else; these dates are just a
// one-time nudge to it.
//
// The window is anchored to the previous call's `now`, not a fixed
// "5 minutes ago" guess — a fixed lookback needs slack to survive a
// slightly-late tick, but that slack then makes consecutive windows
// overlap, which re-fires the same boundary on the next tick and fights a
// manual override in between. Anchoring to the last actual run has no such
// gap-vs-overlap trade-off. This resets on process restart (in-memory,
// matching the single-persistent-process deployment noted in
// instrumentation.ts), which only means the very first post-restart tick
// falls back to a plain one-interval lookback.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
let lastCheckedAt: Date | null = null;

export async function runRegistrationWindowCheck(now: Date = new Date()): Promise<void> {
  const windowStart = lastCheckedAt ?? new Date(now.getTime() - CHECK_INTERVAL_MS);

  await prisma.event.updateMany({
    where: { registrationStartDate: { gt: windowStart, lte: now }, registrationOpen: false },
    data: { registrationOpen: true },
  });

  await prisma.event.updateMany({
    where: { registrationEndDate: { gt: windowStart, lte: now }, registrationOpen: true },
    data: { registrationOpen: false },
  });

  lastCheckedAt = now;
}
