import { prisma } from "@/lib/prisma";
import type { Event, EventMedia, EventMediaSection } from "@prisma/client";
import { getRegisteredEventIds } from "@/lib/events";

export type MediaVisibility = "PUBLIC" | "PARTICIPANTS_ONLY" | "HIDDEN";
export type DownloadPermission = "EVERYONE" | "PARTICIPANTS_ONLY" | "NOBODY";

type EventMediaSettings = Pick<
  Event,
  "mediaVisibility" | "mediaVisibleFromDate" | "mediaVisibleFromTarget" | "downloadPermission"
>;
type SectionMediaSettings = Pick<
  EventMediaSection,
  "inheritVisibility" | "visibility" | "inheritDownload" | "downloadPermission"
>;

// Visibility and download rights are two fully independent dimensions, each
// with its own inherit-from-event switch — a section may be visible to
// participants while still downloadable by nobody. See
// .claude/plans/fizzy-munching-panda.md for why these were kept separate.
export function resolveEffectiveVisibility(event: EventMediaSettings, section: SectionMediaSettings): MediaVisibility {
  return (section.inheritVisibility ? event.mediaVisibility : section.visibility) as MediaVisibility;
}

export function resolveEffectiveDownloadPermission(
  event: EventMediaSettings,
  section: SectionMediaSettings,
): DownloadPermission {
  return (section.inheritDownload ? event.downloadPermission : section.downloadPermission) as DownloadPermission;
}

export type MediaViewer = { participantId: string | null; registeredEventIds: Set<string> };

export function canViewVisibility(visibility: MediaVisibility, eventId: string, viewer: MediaViewer): boolean {
  if (visibility === "PUBLIC") return true;
  if (visibility === "HIDDEN") return false;
  return viewer.participantId !== null && viewer.registeredEventIds.has(eventId);
}

// Downloading is always bounded by visibility — someone who can't view a
// section can never download it, regardless of the download setting.
export function canDownload(
  visibility: MediaVisibility,
  downloadPermission: DownloadPermission,
  eventId: string,
  viewer: MediaViewer,
): boolean {
  if (!canViewVisibility(visibility, eventId, viewer)) return false;
  if (downloadPermission === "EVERYONE") return true;
  if (downloadPermission === "NOBODY") return false;
  return viewer.participantId !== null && viewer.registeredEventIds.has(eventId);
}

export type VisibleMediaSection = EventMediaSection & {
  media: EventMedia[];
  effectiveDownloadPermission: DownloadPermission;
  canDownloadSection: boolean;
};

// Filters an event's sections down to the ones this viewer may see, and
// annotates each with its resolved (not just inherited) download rights.
export function getVisibleSections(
  event: EventMediaSettings & { id: string; mediaSections: (EventMediaSection & { media: EventMedia[] })[] },
  viewer: MediaViewer,
): VisibleMediaSection[] {
  return event.mediaSections
    .map((section) => {
      const visibility = resolveEffectiveVisibility(event, section);
      const downloadPermission = resolveEffectiveDownloadPermission(event, section);
      return {
        ...section,
        visible: canViewVisibility(visibility, event.id, viewer),
        effectiveDownloadPermission: downloadPermission,
        canDownloadSection: canDownload(visibility, downloadPermission, event.id, viewer),
      };
    })
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);
}

export async function getMediaViewer(participantId: string | null): Promise<MediaViewer> {
  if (!participantId) return { participantId: null, registeredEventIds: new Set() };
  return { participantId, registeredEventIds: await getRegisteredEventIds(participantId) };
}

// Replaces the old getPastEvents() (lib/events.ts) as the source for the
// /media archive listing — an event now shows up there once it has at least
// one section this viewer may see, regardless of whether the event date has
// passed.
export async function getEventsVisibleUnderMedia(viewer: MediaViewer) {
  const events = await prisma.event.findMany({
    where: { published: true },
    orderBy: { date: "desc" },
    include: {
      earlybirdPrices: true,
      mediaSections: { orderBy: { order: "asc" }, include: { media: { orderBy: { order: "asc" } } } },
    },
  });
  return events.filter((event) => getVisibleSections(event, viewer).length > 0);
}
