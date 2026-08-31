import { randomUUID } from "node:crypto";
import * as local from "@/lib/storage/local";
import { compressToUnderBytes } from "@/lib/storage/compressImage";

// Thin abstraction over the storage backend — every call site goes through
// this module, not lib/storage/local directly, so swapping to S3-compatible
// storage later (per the Pterodactyl disk-quota note in the project plan)
// is a change to this file's implementation, not to callers.
export const storage = {
  save: local.save,
  saveStream: local.saveStream,
  readRangeStream: local.readRangeStream,
  delete: local.remove,
  getUrl: local.getUrl,
};

export function storageKey(prefix: string, originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : undefined;
  const filename = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  return `${prefix}/${filename}`;
}

export async function saveUploadedFile(file: File, prefix: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = storageKey(prefix, file.name);
  return storage.save(buffer, key);
}

// Compresses to JPEG under maxBytes before saving — used for
// participant-submitted photos (see project plan). Always saved as .jpg
// since compression re-encodes regardless of the original format.
export async function saveCompressedUploadedFile(
  file: File,
  prefix: string,
  maxBytes: number,
): Promise<string> {
  const original = Buffer.from(await file.arrayBuffer());
  const compressed = await compressToUnderBytes(original, maxBytes);
  const key = storageKey(prefix, "photo.jpg");
  return storage.save(compressed, key);
}
