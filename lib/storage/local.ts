import { mkdir, writeFile, unlink } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";

// STORAGE_ROOT defaults to a project-local folder for dev convenience; in
// production (Pterodactyl) it should point at a subfolder of the
// persistent server data directory, e.g. /home/container/storage/uploads.
const STORAGE_ROOT = process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage", "uploads");

// `key` is always a relative path (e.g. "events/<id>/media/<mediaId>.jpg")
// stored as-is in the DB (Event.coverImagePath, EventMedia.filePath,
// Registration.vehiclePhotoPath) and passed straight to getUrl(), which
// points at app/api/media/[...path]/route.ts.
export async function save(buffer: Buffer, key: string): Promise<string> {
  const destination = path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  return key;
}

// Streaming counterpart to save() — pipes directly to disk instead of
// buffering the whole upload in memory first, so multi-gigabyte videos
// don't blow up process memory. Caller is responsible for deleting the
// partial file on error (e.g. a busboy size-limit abort mid-pipe).
export async function saveStream(source: NodeJS.ReadableStream, key: string): Promise<string> {
  const destination = path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await pipeline(source, createWriteStream(destination));
  return key;
}

export function readRangeStream(key: string, range?: { start: number; end: number }) {
  const destination = path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key);
  return range ? createReadStream(destination, range) : createReadStream(destination);
}

export async function remove(key: string): Promise<void> {
  try {
    await unlink(path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// For writers that produce a file at resolvePath(key) themselves (ffmpeg
// writing its own output) rather than going through save()/saveStream().
export async function ensureDirFor(key: string): Promise<void> {
  await mkdir(path.dirname(path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key)), { recursive: true });
}

export function resolvePath(key: string): string {
  return path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key);
}

export function getUrl(key: string): string {
  return `/api/media/${key}`;
}
