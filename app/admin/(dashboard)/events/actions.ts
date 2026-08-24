"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseEventFormData } from "@/lib/validation/event";
import { saveUploadedFile, storage } from "@/lib/storage";

export type EventFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function createEvent(_prevState: EventFormState, formData: FormData): Promise<EventFormState> {
  const { data, fieldErrors } = parseEventFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existing = await prisma.event.findUnique({ where: { slug: data.slug } });
  if (existing) return { fieldErrors: { slug: "Deze slug is al in gebruik" } };

  let coverImagePath: string | undefined;
  const coverImage = formData.get("coverImage");
  if (coverImage instanceof File && coverImage.size > 0) {
    coverImagePath = await saveUploadedFile(coverImage, "events/covers");
  }

  const event = await prisma.event.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      distanceKm: data.distanceKm ?? null,
      durationMinutes: data.durationMinutes ?? null,
      price: data.price ?? null,
      passengerPrice: data.passengerPrice ?? null,
      published: data.published,
      registrationOpen: data.registrationOpen,
      coverImagePath,
    },
  });

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect(`/admin/events/${event.id}/edit`);
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { data, fieldErrors } = parseEventFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existing = await prisma.event.findFirst({
    where: { slug: data.slug, NOT: { id: eventId } },
  });
  if (existing) return { fieldErrors: { slug: "Deze slug is al in gebruik" } };

  const current = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  let coverImagePath = current.coverImagePath;
  const coverImage = formData.get("coverImage");
  if (coverImage instanceof File && coverImage.size > 0) {
    if (coverImagePath) await storage.delete(coverImagePath);
    coverImagePath = await saveUploadedFile(coverImage, "events/covers");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      distanceKm: data.distanceKm ?? null,
      durationMinutes: data.durationMinutes ?? null,
      price: data.price ?? null,
      passengerPrice: data.passengerPrice ?? null,
      published: data.published,
      registrationOpen: data.registrationOpen,
      coverImagePath,
    },
  });

  revalidatePath("/admin/events");
  revalidatePath(`/events/${data.slug}`);
  revalidatePath("/");
  return {};
}

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
