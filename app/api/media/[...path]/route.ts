import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolvePath } from "@/lib/storage/local";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
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

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
