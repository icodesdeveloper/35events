import { NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { resolvePath } from "@/lib/storage/local";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import { auth as adminAuth } from "@/lib/auth/admin";
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

  // Matched against every derivative column, not just filePath: a thumb,
  // preview or transcode lives under the same events/*/media/* prefix as its
  // original, so a filePath-only lookup would leave the derivatives of a
  // hidden section publicly reachable.
  const media = await prisma.eventMedia.findFirst({
    where: { OR: [{ filePath: key }, { thumbPath: key }, { previewPath: key }, { webPath: key }] },
    include: { event: true, section: true },
  });
  if (!media) return true; // not a tracked EventMedia row (shouldn't happen for this path shape, but fail open to a 404 below via the normal file-not-found path)

  const session = await participantAuth();
  const viewer = await getMediaViewer(session?.user?.participantId ?? null);
  const visibility = resolveEffectiveVisibility(media.event, media.section);

  const allowed = wantsDownload
    ? canDownload(visibility, resolveEffectiveDownloadPermission(media.event, media.section), media.eventId, viewer)
    : canViewVisibility(visibility, media.eventId, viewer);
  if (allowed) return true;

  // Admins manage this media, so they may always see it. Without this the
  // admin grid renders broken tiles for every section that isn't publicly
  // visible — which is the normal state while an event is still being
  // prepared. Checked only after the public rules say no, so the common
  // visitor request never pays for an extra session lookup.
  const admin = await adminAuth();
  return Boolean(admin?.user?.isAdmin);
}

// Deliberately not `Readable.toWeb()`: that adapter keeps enqueueing after the
// consumer has gone away, and the resulting "Invalid state: Controller is
// already closed" surfaces as an *uncaught* exception that can take the server
// down. Clients abort mid-response constantly — a <video> element does it on
// every seek, and the bigger the file the wider the window — so this wires the
// events up itself, guards every controller call, and destroys the file handle
// on cancel.
function fileStreamToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  let finished = false;

  const finish = (fn: () => void) => {
    if (finished) return;
    finished = true;
    try {
      fn();
    } catch {
      // The consumer already tore the stream down; nothing left to report to.
    }
    nodeStream.destroy();
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        if (finished) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          finish(() => {});
          return;
        }
        // Respect backpressure so a big file isn't slurped into memory.
        if (controller.desiredSize !== null && controller.desiredSize <= 0) nodeStream.pause();
      });
      nodeStream.on("end", () => finish(() => controller.close()));
      nodeStream.on("error", (error) => finish(() => controller.error(error)));
    },
    pull() {
      nodeStream.resume();
    },
    cancel() {
      finish(() => {});
    },
  });
}

// bytes=<start>-<end> | bytes=<start>- | bytes=-<suffixLength>. Only the
// first range in a (rare, multi-range) header is honored — plenty for the
// single-range requests every browser video element actually sends.
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header || !header.startsWith("bytes=")) return null;
  const [startStr, endStr] = header.slice(6).split(",")[0].trim().split("-");

  let start = startStr ? parseInt(startStr, 10) : NaN;
  let end = endStr ? parseInt(endStr, 10) : size - 1;

  if (Number.isNaN(start)) {
    const suffixLength = parseInt(endStr, 10);
    if (Number.isNaN(suffixLength)) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  }
  if (Number.isNaN(end) || end > size - 1) end = size - 1;
  if (start > end || start < 0) return null;

  return { start, end };
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

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    // Advertised unconditionally so <video> knows it can seek — required for
    // scrubbing/partial playback on anything but tiny files.
    "Accept-Ranges": "bytes",
  };
  if (wantsDownload) headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;

  // Streamed via fs.createReadStream either way — never buffered fully into
  // memory, which matters once videos run into the gigabytes.
  const range = parseRange(request.headers.get("range"), fileStat.size);
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${fileStat.size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
    return new NextResponse(fileStreamToWeb(storage.readRangeStream(key, range)), { status: 206, headers });
  }

  headers["Content-Length"] = String(fileStat.size);
  return new NextResponse(fileStreamToWeb(storage.readRangeStream(key)), { status: 200, headers });
}
