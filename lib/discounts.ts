import { prisma } from "@/lib/prisma";
import type { DiscountCode } from "@prisma/client";

export type DiscountType = "PERCENT" | "FIXED";

export type DiscountValidationFailureReason =
  | "NOT_FOUND"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "WRONG_EVENT"
  | "WRONG_PARTICIPANT"
  | "MAX_USES_REACHED";

export const DISCOUNT_VALIDATION_MESSAGE: Record<DiscountValidationFailureReason, string> = {
  NOT_FOUND: "Ongeldige kortingscode",
  NOT_YET_VALID: "Deze kortingscode is nog niet geldig",
  EXPIRED: "Deze kortingscode is verlopen",
  WRONG_EVENT: "Deze kortingscode is niet geldig voor dit event",
  WRONG_PARTICIPANT: "Deze kortingscode is niet geldig voor jouw account",
  MAX_USES_REACHED: "Deze kortingscode is al het maximaal aantal keer gebruikt",
};

export type DiscountValidationResult =
  | { ok: true; discount: DiscountCode }
  | { ok: false; reason: DiscountValidationFailureReason };

export async function validateDiscountCode(
  code: string,
  { eventId, participantId }: { eventId: string; participantId: string },
): Promise<DiscountValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "NOT_FOUND" };

  const discount = await prisma.discountCode.findUnique({ where: { code: normalized } });
  if (!discount) return { ok: false, reason: "NOT_FOUND" };

  const now = new Date();
  if (discount.validFrom && now < discount.validFrom) return { ok: false, reason: "NOT_YET_VALID" };
  if (discount.validUntil && now > discount.validUntil) return { ok: false, reason: "EXPIRED" };
  if (discount.eventId && discount.eventId !== eventId) return { ok: false, reason: "WRONG_EVENT" };
  if (discount.participantId && discount.participantId !== participantId) {
    return { ok: false, reason: "WRONG_PARTICIPANT" };
  }
  if (discount.maxUses != null && discount.useCount >= discount.maxUses) {
    return { ok: false, reason: "MAX_USES_REACHED" };
  }

  return { ok: true, discount };
}

export function computeDiscountAmount(discount: Pick<DiscountCode, "type" | "value">, subtotal: number): number {
  const value = Number(discount.value.toString());
  const amount = discount.type === "PERCENT" ? subtotal * (value / 100) : value;
  return Math.min(Math.max(0, amount), Math.max(0, subtotal));
}
