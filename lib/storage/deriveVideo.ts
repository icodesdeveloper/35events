import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegStatic from "ffmpeg-static";
import * as local from "@/lib/storage/local";
import { deriveImagesFrom } from "@/lib/storage/deriveImages";

const execFileAsync = promisify(execFile);

// ffmpeg-static ships a platform-specific binary, so no system install is
// needed on the deploy host. FFMPEG_PATH overrides it for environments that
// block the postinstall download or want their own build.
const FFMPEG = process.env.FFMPEG_PATH ?? ffmpegStatic ?? "ffmpeg";

// Transcodes are CPU-bound and can take minutes on a long clip; this is a
// safety valve so a pathological file can't pin a core forever.
const TRANSCODE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2h
const POSTER_TIMEOUT_MS = 60 * 1000;

const MAX_HEIGHT = 1080;

function derivativeKey(originalKey: string, suffix: string, ext: string): string {
  const base = originalKey.replace(/\.[^./]+$/, "");
  return `${base}_${suffix}.${ext}`;
}

// Grabs a still to use as the tile image / <video poster>, then runs it
// through the same WebP pipeline as photos so video tiles are as light as
// photo tiles. Seeks 1s in — frame 0 is often black on phone recordings.
export async function derivePoster(originalKey: string): Promise<{ thumbPath: string; previewPath: string } | null> {
  const sourcePath = local.resolvePath(originalKey);
  const tempFrame = path.join(tmpdir(), `poster-${randomUUID()}.png`);

  try {
    await execFileAsync(
      FFMPEG,
      ["-y", "-ss", "1", "-i", sourcePath, "-frames:v", "1", "-an", tempFrame],
      { timeout: POSTER_TIMEOUT_MS },
    );
    return await deriveImagesFrom(tempFrame, originalKey);
  } catch (error) {
    // Logged, not swallowed: a poster failure is recoverable (the tile falls
    // back), but silently losing the reason makes it undiagnosable in prod.
    console.error(`Poster extraction failed for ${originalKey} (ffmpeg: ${FFMPEG}):`, error);
    return null;
  } finally {
    await unlink(tempFrame).catch(() => {});
  }
}

// Produces a web-friendly H.264/AAC MP4 capped at 1080p. `-movflags
// +faststart` moves the index to the front so the browser can start playing
// before the whole file arrives, and the scale filter's -2 keeps the width
// even (H.264 requires it) while preserving aspect ratio. Videos already
// smaller than 1080p are not upscaled.
export async function transcodeVideo(originalKey: string): Promise<string | null> {
  const sourcePath = local.resolvePath(originalKey);
  const webKey = derivativeKey(originalKey, "web", "mp4");
  const destination = local.resolvePath(webKey);

  try {
    await local.ensureDirFor(webKey);
    await execFileAsync(
      FFMPEG,
      [
        "-y",
        "-i", sourcePath,
        "-vf", `scale=-2:'min(${MAX_HEIGHT},ih)'`,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        destination,
      ],
      { timeout: TRANSCODE_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 10 },
    );

    // An already-small, efficiently-encoded clip (a short VP9 phone recording,
    // say) can come out *bigger* as H.264. Keeping that would cost disk and
    // make playback heavier than doing nothing, so discard it and let the
    // player fall back to the original.
    const [source, transcoded] = await Promise.all([stat(sourcePath), stat(destination)]);
    if (transcoded.size >= source.size) {
      await local.remove(webKey).catch(() => {});
      return null;
    }

    return webKey;
  } catch (error) {
    console.error(`Transcode failed for ${originalKey} (ffmpeg: ${FFMPEG}):`, error);
    // Clean up a partial file so nothing half-written is ever served.
    await local.remove(webKey).catch(() => {});
    return null;
  }
}
