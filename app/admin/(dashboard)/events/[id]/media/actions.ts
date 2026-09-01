"use server";

import { revalidatePath } from "next/cache";
import type { EventMedia } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
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
      collapsedByDefault: formData.get("collapsedByDefault") === "on",
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

// Every stored file for a media row: the original plus its derivatives (WebP
// stills for both kinds, and the MP4 transcode for videos). Null entries are
// rows predating a pipeline, or files that couldn't be derived.
function storedPaths(
  media: Pick<EventMedia, "filePath" | "thumbPath" | "previewPath" | "webPath">,
): string[] {
  return [media.filePath, media.thumbPath, media.previewPath, media.webPath].filter(
    (p): p is string => p !== null,
  );
}

// Best-effort on purpose: these run *after* the DB rows are already gone, so
// letting one stuck file (a Windows lock, a permissions blip) reject would
// fail the whole action with the delete already committed — the admin sees a
// 500 for work that actually succeeded. An orphaned file is the cheaper
// failure, so log and move on.
async function deleteStoredFiles(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) =>
      storage.delete(p).catch((error) => {
        console.error(`Failed to delete stored file ${p}:`, error);
      }),
    ),
  );
}

export async function deleteSection(eventId: string, sectionId: string) {
  const media = await prisma.eventMedia.findMany({
    where: { sectionId },
    select: { filePath: true, thumbPath: true, previewPath: true, webPath: true },
  });
  await prisma.eventMediaSection.delete({ where: { id: sectionId } });
  await deleteStoredFiles(media.flatMap(storedPaths));
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

// Drag-and-drop reorder: the client already knows the full new order (unlike
// moveSection's single-step swap), so this just writes index-as-order for
// every id in one go instead of computing a neighbor swap.
export async function reorderSections(eventId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.eventMediaSection.update({ where: { id }, data: { order: index } })),
  );
  revalidatePath(`/admin/events/${eventId}/media`);
}

export async function deleteMedia(eventId: string, mediaId: string) {
  const media = await prisma.eventMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await prisma.eventMedia.delete({ where: { id: mediaId } });
  await deleteStoredFiles(storedPaths(media));

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

export async function reorderMedia(eventId: string, sectionId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.eventMedia.update({ where: { id }, data: { order: index } })),
  );
  revalidatePath(`/admin/events/${eventId}/media`);
}
