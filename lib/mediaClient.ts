import type { EventMedia } from "@prisma/client";

// Client-safe media helpers. Kept out of lib/media.ts, which imports Prisma
// and so can't be pulled into a client component.

// Event media (photos/videos) is streamed straight to disk (see
// app/api/admin/events/[id]/media/route.ts), so this is a disk-space/abuse
// guard, not a memory constraint — safe to set generously high.
export const MAX_MEDIA_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024; // 8GB

type MediaPaths = Pick<EventMedia, "filePath" | "thumbPath" | "previewPath">;
type VideoPaths = MediaPaths & Pick<EventMedia, "webPath" | "processingStatus">;

// Each falls back to the original when its derivative is missing — a video
// still being transcoded, an undecodable file, or a row predating the
// pipeline until scripts/backfill-media-derivatives.ts has run over it.

/** Small WebP for grid tiles — hundreds of these load per gallery page. */
export function thumbSrc(media: MediaPaths): string {
  return `/api/media/${media.thumbPath ?? media.filePath}`;
}

/** Larger WebP for full-screen viewing, or a video's poster frame. */
export function previewSrc(media: MediaPaths): string {
  return `/api/media/${media.previewPath ?? media.filePath}`;
}

/** The untouched upload — only ever served for an explicit download. */
export function downloadSrc(media: MediaPaths): string {
  return `/api/media/${media.filePath}?download=1`;
}

/**
 * Playback source for a video: the 1080p transcode once it exists, otherwise
 * the original (heavier, but always playable — so a video is never broken
 * while it's still processing).
 */
export function videoSrc(media: VideoPaths): string {
  return `/api/media/${media.webPath ?? media.filePath}`;
}

/** True while ffmpeg is still working on this video's derivatives. */
export function isProcessing(media: Pick<EventMedia, "processingStatus">): boolean {
  return media.processingStatus === "PROCESSING";
}
