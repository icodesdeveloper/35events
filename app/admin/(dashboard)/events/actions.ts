"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function deleteEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  await prisma.event.delete({ where: { id: eventId } });
  if (event.coverImagePath) await storage.delete(event.coverImagePath);

  revalidatePath("/admin/events");
  revalidatePath("/");
}

export async function togglePublished(eventId: string, published: boolean) {
  await prisma.event.update({ where: { id: eventId }, data: { published } });
  revalidatePath("/admin/events");
  revalidatePath("/");
}

export async function toggleRegistration(eventId: string, registrationOpen: boolean) {
  await prisma.event.update({ where: { id: eventId }, data: { registrationOpen } });
  revalidatePath("/admin/events");
}
