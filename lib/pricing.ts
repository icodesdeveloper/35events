type DecimalLike = { toString(): string } | number | string;

export type EarlybirdTier = { deadline: Date; price: DecimalLike };

// The earliest deadline that hasn't passed yet wins — i.e. the currently
// active (cheapest still-available) tier. Once every deadline has passed
// (or there are no tiers at all), the event's regular price applies.
export function getEffectivePrice(
  event: { price: DecimalLike | null; earlybirdPrices: EarlybirdTier[] },
  now: Date = new Date(),
): number {
  const activeTiers = event.earlybirdPrices
    .filter((tier) => new Date(tier.deadline) >= now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  if (activeTiers.length > 0) return Number(activeTiers[0].price.toString());
  return event.price != null ? Number(event.price.toString()) : 0;
}

// The active tier itself (if any) — used to show "earlybird price until X"
// on the public site without recomputing the sort twice.
export function getActiveEarlybirdTier(
  event: { earlybirdPrices: EarlybirdTier[] },
  now: Date = new Date(),
): EarlybirdTier | null {
  const activeTiers = event.earlybirdPrices
    .filter((tier) => new Date(tier.deadline) >= now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  return activeTiers[0] ?? null;
}
