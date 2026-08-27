"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, storage } from "@/lib/storage";
import type { MediaVisibility, DownloadPermission } from "@/lib/media";

const VISIBILITIES: MediaVisibility[] = ["PUBLIC", "PARTICIPANTS_ONLY", "HIDDEN"];
const DOWNLOAD_PERMISSIONS: DownloadPermission[] = ["EVERYONE", "PARTICIPANTS_ONLY", "NOBODY"];
const SCHEDULE_TARGETS: MediaVisibility[] = ["PUBLIC", "PARTICIPANTS_ONLY"];

function readVisibility(value: FormDataEntryValue | null): MediaVisibility {
  return VISIBILITIES.includes(value as MediaVisibility) ? (value as MediaVisibility) : "HIDDEN";
}

function readDownloadPermission(value: FormDataEntryValue | null): DownloadPermission {
  return DOWNLOAD_PERMISSIONS.includes(value as DownloadPermission) ? (value as DownloadPermission) : "NOBODY";
}

function readScheduleTarget(value: FormDataEntryValue | null): string | null {
  return SCHEDULE_TARGETS.includes(value as MediaVisibility) ? (value as string) : null;
}

function readDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw) : null;
}

async function revalidateEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  revalidatePath(`/admin/events/${eventId}/media`);
  if (event) {
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/media");
  }
}

export async function updateEventMediaSettings(eventId: string, formData: FormData) {
  const visibleFromDate = readDate(formData.get("mediaVisibleFromDate"));
  await prisma.event.update({
    where: { id: eventId },
    data: {
      mediaVisibility: readVisibility(formData.get("mediaVisibility")),
      mediaVisibleFromDate: visibleFromDate,
      mediaVisibleFromTarget: visibleFromDate ? readScheduleTarget(formData.get("mediaVisibleFromTarget")) : null,
      downloadPermission: readDownloadPermission(formData.get("downloadPermission")),
    },
  });
  await revalidateEvent(eventId);
}

export async function createSection(eventId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const currentMax = await prisma.eventMediaSection.aggregate({ where: { eventId }, _max: { order: true } });
  await prisma.eventMediaSection.create({
    data: { eventId, title, order: (currentMax._max.order ?? -1) + 1 },
  });
  await revalidateEvent(eventId);
}

export async function updateSection(eventId: string, sectionId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const inheritVisibility = formData.get("inheritVisibility") === "on";
  const inheritDownload = formData.get("inheritDownload") === "on";
  const visibleFromDate = readDate(formData.get("visibleFromDate"));

  await prisma.eventMediaSection.update({
    where: { id: sectionId },
    data: {
      title: title || undefined,
      isHighlight: formData.get("isHighlight") === "on",
      inheritVisibility,
      visibility: readVisibility(formData.get("visibility")),
      visibleFromDate,
      visibleFromTarget: visibleFromDate ? readScheduleTarget(formData.get("visibleFromTarget")) : null,
      inheritDownload,
      downloadPermission: readDownloadPermission(formData.get("downloadPermission")),
    },
  });
  await revalidateEvent(eventId);
}

export async function deleteSection(eventId: string, sectionId: string) {
  const media = await prisma.eventMedia.findMany({ where: { sectionId }, select: { filePath: true } });
  await prisma.eventMediaSection.delete({ where: { id: sectionId } });
  await Promise.all(media.map((m) => storage.delete(m.filePath)));
  await revalidateEvent(eventId);
}

export async function moveSection(eventId: string, sectionId: string, direction: "up" | "down") {
  const sections = await prisma.eventMediaSection.findMany({ where: { eventId }, orderBy: { order: "asc" } });
  const index = sections.findIndex((s) => s.id === sectionId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= sections.length) return;

  const a = sections[index];
  const b = sections[swapWith];
  await prisma.$transaction([
    prisma.eventMediaSection.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.eventMediaSection.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/admin/events/${eventId}/media`);
}

function mediaTypeFor(file: File): "PHOTO" | "VIDEO" {
  return file.type.startsWith("video/") ? "VIDEO" : "PHOTO";
}

export async function uploadMedia(eventId: string, sectionId: string, formData: FormData) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const currentMax = await prisma.eventMedia.aggregate({
    where: { sectionId },
    _max: { order: true },
  });
  let nextOrder = (currentMax._max.order ?? -1) + 1;

  for (const file of files) {
    const filePath = await saveUploadedFile(file, `events/${eventId}/media`);
    await prisma.eventMedia.create({
      data: {
        eventId,
        sectionId,
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

  await revalidateEvent(eventId);
}

export async function moveMedia(eventId: string, sectionId: string, mediaId: string, direction: "up" | "down") {
  const items = await prisma.eventMedia.findMany({ where: { sectionId }, orderBy: { order: "asc" } });
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
