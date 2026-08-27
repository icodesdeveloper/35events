import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolvePath } from "@/lib/storage/local";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import { getMediaViewer, canViewVisibility, canDownload, resolveEffectiveVisibility, resolveEffectiveDownloadPermission } from "@/lib/media";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

// Only paths under events/*/media/* correspond to an EventMedia row with
// visibility/download rights to enforce — cover images, vehicle photos etc.
// stay unconditionally public, exactly as before.
const EVENT_MEDIA_PATTERN = /^events\/[^/]+\/media\/[^/]+$/;

async function isAuthorized(key: string, wantsDownload: boolean): Promise<boolean> {
  if (!EVENT_MEDIA_PATTERN.test(key)) return true;

  const media = await prisma.eventMedia.findFirst({
    where: { filePath: key },
    include: { event: true, section: true },
  });
  if (!media) return true; // not a tracked EventMedia row (shouldn't happen for this path shape, but fail open to a 404 below via the normal file-not-found path)

  const session = await participantAuth();
  const viewer = await getMediaViewer(session?.user?.participantId ?? null);
  const visibility = resolveEffectiveVisibility(media.event, media.section);

  if (!wantsDownload) return canViewVisibility(visibility, media.eventId, viewer);

  const downloadPermission = resolveEffectiveDownloadPermission(media.event, media.section);
  return canDownload(visibility, downloadPermission, media.eventId, viewer);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const key = segments.join("/");
  const filePath = resolvePath(key);

  // Reject any resolved path that escapes the storage root — the dynamic
  // segments shouldn't contain ".." to begin with, but this is the actual
  // security boundary, not just a filter on the raw input.
  const storageRoot = resolvePath("");
  if (!filePath.startsWith(storageRoot + path.sep) && filePath !== storageRoot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wantsDownload = new URL(request.url).searchParams.has("download");
  // 404 (not 403) for an unauthorized request, so existence isn't confirmed.
  if (!(await isAuthorized(key, wantsDownload))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (wantsDownload) headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
