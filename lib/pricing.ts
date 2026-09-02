type DecimalLike = { toString(): string } | number | string;

export type EarlybirdTier = { deadline: Date; price: DecimalLike; passengerPrice?: DecimalLike | null };

type PricedEvent = {
  price: DecimalLike | null;
  passengerPrice?: DecimalLike | null;
  earlybirdPrices: EarlybirdTier[];
};

function toNumber(value: DecimalLike | null | undefined): number {
  return value != null ? Number(value.toString()) : 0;
}

// The active tier itself (if any) — the earliest deadline that hasn't passed
// yet, i.e. the currently valid (cheapest still-available) tier. Once every
// deadline has passed, or there are no tiers, the event's regular prices
// apply. Used directly on the public site to show "earlybird until X".
export function getActiveEarlybirdTier(
  event: { earlybirdPrices: EarlybirdTier[] },
  now: Date = new Date(),
): EarlybirdTier | null {
  const activeTiers = event.earlybirdPrices
    .filter((tier) => new Date(tier.deadline) >= now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  return activeTiers[0] ?? null;
}

export function getEffectivePrice(event: PricedEvent, now: Date = new Date()): number {
  const tier = getActiveEarlybirdTier(event, now);
  return tier ? toNumber(tier.price) : toNumber(event.price);
}

// Passengers only get the earlybird rate when the active tier actually sets
// one. A tier with no passengerPrice falls back to the event's regular rate,
// which is what every tier did before per-passenger earlybird existed — so
// existing events keep pricing exactly as they did.
export function getEffectivePassengerPrice(event: PricedEvent, now: Date = new Date()): number {
  const tier = getActiveEarlybirdTier(event, now);
  if (tier && tier.passengerPrice != null) return toNumber(tier.passengerPrice);
  return toNumber(event.passengerPrice);
}

// Everything the registration flow needs to price a booking in one call, so
// the driver and passenger rates can never be read from different tiers.
export function getEffectivePricing(
  event: PricedEvent,
  now: Date = new Date(),
): { price: number; passengerPrice: number; tier: EarlybirdTier | null } {
  const tier = getActiveEarlybirdTier(event, now);
  return {
    price: tier ? toNumber(tier.price) : toNumber(event.price),
    passengerPrice: tier && tier.passengerPrice != null ? toNumber(tier.passengerPrice) : toNumber(event.passengerPrice),
    tier,
  };
}
