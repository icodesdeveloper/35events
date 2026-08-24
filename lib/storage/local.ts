import { mkdir, writeFile, unlink } from "node:fs/promises";
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

export async function remove(key: string): Promise<void> {
  try {
    await unlink(path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function resolvePath(key: string): string {
  return path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key);
}

export function getUrl(key: string): string {
  return `/api/media/${key}`;
}
