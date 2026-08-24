"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, storage } from "@/lib/storage";

function mediaTypeFor(file: File): "PHOTO" | "VIDEO" {
  return file.type.startsWith("video/") ? "VIDEO" : "PHOTO";
}

export async function uploadMedia(eventId: string, formData: FormData) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const currentMax = await prisma.eventMedia.aggregate({
    where: { eventId },
    _max: { order: true },
  });
  let nextOrder = (currentMax._max.order ?? -1) + 1;

  for (const file of files) {
    const filePath = await saveUploadedFile(file, `events/${eventId}/media`);
    await prisma.eventMedia.create({
      data: {
        eventId,
        type: mediaTypeFor(file),
        filePath,
        order: nextOrder,
      },
    });
    nextOrder += 1;
  }

  revalidatePath(`/admin/events/${eventId}/media`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/media");
}

export async function deleteMedia(eventId: string, mediaId: string) {
  const media = await prisma.eventMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await prisma.eventMedia.delete({ where: { id: mediaId } });
  await storage.delete(media.filePath);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  revalidatePath(`/admin/events/${eventId}/media`);
  if (event) {
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/media");
  }
}

export async function moveMedia(eventId: string, mediaId: string, direction: "up" | "down") {
  const items = await prisma.eventMedia.findMany({ where: { eventId }, orderBy: { order: "asc" } });
  const index = items.findIndex((item) => item.id === mediaId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return;

  const a = items[index];
  const b = items[swapWith];
  await prisma.$transaction([
    prisma.eventMedia.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.eventMedia.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath(`/admin/events/${eventId}/media`);
}
