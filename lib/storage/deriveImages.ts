import sharp from "sharp";
import * as local from "@/lib/storage/local";

// Grid tiles are small and there can be hundreds per page, so the thumb is
// aggressive. The preview is what someone actually looks at full-screen in
// the lightbox — sized to stay sharp on a phone or a mid-range laptop, with
// the pixel-level softness only showing if you zoom in (at which point the
// original is a download away).
const THUMB = { dimension: 640, quality: 70 };
const PREVIEW = { dimension: 1920, quality: 80 };

export type ImageDerivatives = { thumbPath: string; previewPath: string };

function derivativeKey(originalKey: string, suffix: string): string {
  // events/<id>/media/<uuid>.jpg -> events/<id>/media/<uuid>_thumb.webp
  const base = originalKey.replace(/\.[^./]+$/, "");
  return `${base}_${suffix}.webp`;
}

async function writeDerivative(
  sourcePath: string,
  key: string,
  { dimension, quality }: { dimension: number; quality: number },
): Promise<void> {
  // `rotate()` with no argument applies the EXIF orientation — without it,
  // phone photos come out sideways in the derivative but upright in the
  // original.
  const buffer = await sharp(sourcePath)
    .rotate()
    .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  await local.save(buffer, key);
}

// Generates the thumb + preview pair for `namedAfterKey`, reading pixels from
// `sourcePath`. Split out from deriveImages so video posters can reuse the
// exact same sizing/encoding: lib/storage/deriveVideo.ts extracts a frame to
// a temp file and points this at it, while the derivative names still follow
// the video's own storage key.
export async function deriveImagesFrom(
  sourcePath: string,
  namedAfterKey: string,
): Promise<ImageDerivatives | null> {
  const thumbPath = derivativeKey(namedAfterKey, "thumb");
  const previewPath = derivativeKey(namedAfterKey, "preview");

  try {
    await writeDerivative(sourcePath, thumbPath, THUMB);
    await writeDerivative(sourcePath, previewPath, PREVIEW);
    return { thumbPath, previewPath };
  } catch {
    // Clean up a half-written pair so no orphan file is left behind.
    await local.remove(thumbPath).catch(() => {});
    await local.remove(previewPath).catch(() => {});
    return null;
  }
}

// Generates the thumb + preview pair next to the original. Returns null if
// the source isn't a decodable image (a video, a corrupt file, an unsupported
// format) — callers fall back to serving the original, so a failure here
// costs page weight, never the upload itself.
export function deriveImages(originalKey: string): Promise<ImageDerivatives | null> {
  return deriveImagesFrom(local.resolvePath(originalKey), originalKey);
}
