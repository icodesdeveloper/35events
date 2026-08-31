import { Readable } from "node:stream";
import Busboy from "busboy";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { storage, storageKey } from "@/lib/storage";
import { MAX_MEDIA_UPLOAD_BYTES } from "@/lib/mediaLimits";

// Separate from the uploadMedia server action (app/admin/(dashboard)/events/[id]/media/actions.ts)
// so the client can drive the upload with XMLHttpRequest and get real
// per-file progress events — server actions expose no upload-progress hook.
// This path also sits outside proxy.ts's /admin/:path* matcher, so it isn't
// subject to the proxy's request-body buffering limit either.
//
// The body is parsed with busboy and piped straight to disk (storage.saveStream)
// instead of Next's request.formData(), which buffers the whole multipart
// body — and every file in it — in memory. That's fine for a photo, not for
// a multi-gigabyte video. sectionId travels as a query param rather than a
// form field so it can be validated before any of the body is read.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sectionId = new URL(request.url).searchParams.get("sectionId") ?? "";
  const section = sectionId ? await prisma.eventMediaSection.findUnique({ where: { id: sectionId } }) : null;
  if (!section || section.eventId !== eventId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type");
  if (!contentType || !request.body) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  let filePath: string | null = null;
  let fileType: "PHOTO" | "VIDEO" | null = null;
  let sawFile = false;
  let truncated = false;
  // Resolved once the file part is fully written to disk, not just once
  // busboy finishes parsing the multipart stream — those two finish at
  // different times (parsing the network stream is far faster than the
  // disk write for a multi-gigabyte file), and the write is what matters.
  let saveStreamPromise: Promise<void> = Promise.resolve();

  try {
    await new Promise<void>((resolve, reject) => {
      const busboy = Busboy({
        headers: { "content-type": contentType },
        limits: { files: 1, fileSize: MAX_MEDIA_UPLOAD_BYTES },
      });

      busboy.on("file", (_name, fileStream, info) => {
        sawFile = true;
        fileType = info.mimeType.startsWith("video/") ? "VIDEO" : "PHOTO";
        const key = storageKey(`events/${eventId}/media`, info.filename);

        saveStreamPromise = storage.saveStream(fileStream, key).then(() => {
          filePath = key;
          truncated = Boolean(fileStream.truncated);
        });
      });

      busboy.on("error", reject);
      busboy.on("close", () => {
        saveStreamPromise.then(resolve, reject);
      });

      Readable.fromWeb(request.body as import("stream/web").ReadableStream).pipe(busboy);
    });
  } catch {
    if (filePath) await storage.delete(filePath).catch(() => {});
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  if (truncated && filePath) {
    await storage.delete(filePath).catch(() => {});
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  if (!sawFile || !filePath || !fileType) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const currentMax = await prisma.eventMedia.aggregate({ where: { sectionId }, _max: { order: true } });
  const media = await prisma.eventMedia.create({
    data: {
      eventId,
      sectionId,
      type: fileType,
      filePath,
      order: (currentMax._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/events/${eventId}/media`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/media");

  return NextResponse.json({ ok: true, media });
}
