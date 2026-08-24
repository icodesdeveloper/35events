"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function ensureQuestionForm(eventId: string) {
  return prisma.eventQuestionForm.upsert({
    where: { eventId },
    update: {},
    create: { eventId },
  });
}

export async function unpublishQuestionForm(eventId: string, formId: string) {
  await prisma.eventQuestionForm.update({ where: { id: formId }, data: { published: false } });
  revalidatePath(`/admin/events/${eventId}/edit`);
}
