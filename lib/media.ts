import { prisma } from "@/lib/prisma";
import type { Event, EventMedia, EventMediaSection } from "@prisma/client";
import { getRegisteredEventIds } from "@/lib/events";
import { getSharedEventIds } from "@/lib/mediaShare";

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

export type MediaViewer = {
  participantId: string | null;
  registeredEventIds: Set<string>;
  // Events unlocked by a media share link (see lib/mediaShare.ts) — the
  // holder has no account, but for this event they count as a participant.
  sharedEventIds: Set<string>;
};

// "Counts as a participant for this event": either genuinely registered, or
// holding a valid share link for it. Single chokepoint so view and download
// can never drift apart on what participant-level means.
function hasParticipantAccess(eventId: string, viewer: MediaViewer): boolean {
  if (viewer.sharedEventIds.has(eventId)) return true;
  return viewer.participantId !== null && viewer.registeredEventIds.has(eventId);
}

export function canViewVisibility(visibility: MediaVisibility, eventId: string, viewer: MediaViewer): boolean {
  if (visibility === "PUBLIC") return true;
  // HIDDEN stays hidden even for a share-link holder — the link lifts someone
  // to participant level, it is not an admin backdoor.
  if (visibility === "HIDDEN") return false;
  return hasParticipantAccess(eventId, viewer);
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
  return hasParticipantAccess(eventId, viewer);
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

// Reads the share cookie itself rather than making every call site pass it —
// the same viewer must come out whether this is called from a page or from
// the /api/media file route, and a call site that forgot would silently 404
// a share link's images.
export async function getMediaViewer(participantId: string | null): Promise<MediaViewer> {
  const sharedEventIds = await getSharedEventIds();
  if (!participantId) return { participantId: null, registeredEventIds: new Set(), sharedEventIds };
  return { participantId, registeredEventIds: await getRegisteredEventIds(participantId), sharedEventIds };
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
