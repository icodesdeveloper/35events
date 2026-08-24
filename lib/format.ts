const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatEventDate(date: Date, endDate?: Date | null): string {
  if (endDate && endDate.toDateString() !== date.toDateString()) {
    return `${dateFormatter.format(date)} – ${dateFormatter.format(endDate)}`;
  }
  return dateFormatter.format(date);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} uur`;
  return `${hours} uur ${rest} min`;
}

const priceFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(amount: number | string): string {
  return priceFormatter.format(Number(amount));
}

export function formatDistance(km: number): string {
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`;
}
