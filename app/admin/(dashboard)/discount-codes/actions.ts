"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDiscountCodeFormData } from "@/lib/validation/discountCode";

export type DiscountCodeFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function createDiscountCode(
  _prevState: DiscountCodeFormState,
  formData: FormData,
): Promise<DiscountCodeFormState> {
  const { data, fieldErrors } = parseDiscountCodeFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existing = await prisma.discountCode.findUnique({ where: { code: data.code } });
  if (existing) return { fieldErrors: { code: "Deze code bestaat al" } };

  await prisma.discountCode.create({
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      eventId: data.eventId || null,
      participantId: data.participantId || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      maxUses: data.maxUses ?? null,
    },
  });

  revalidatePath("/admin/discount-codes");
  return {};
}

export async function updateDiscountCode(
  discountCodeId: string,
  _prevState: DiscountCodeFormState,
  formData: FormData,
): Promise<DiscountCodeFormState> {
  const { data, fieldErrors } = parseDiscountCodeFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existing = await prisma.discountCode.findFirst({
    where: { code: data.code, NOT: { id: discountCodeId } },
  });
  if (existing) return { fieldErrors: { code: "Deze code bestaat al" } };

  await prisma.discountCode.update({
    where: { id: discountCodeId },
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      eventId: data.eventId || null,
      participantId: data.participantId || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      maxUses: data.maxUses ?? null,
    },
  });

  revalidatePath("/admin/discount-codes");
  return {};
}

export async function deleteDiscountCode(discountCodeId: string) {
  await prisma.discountCode.delete({ where: { id: discountCodeId } });
  revalidatePath("/admin/discount-codes");
}
