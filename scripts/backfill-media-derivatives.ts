import { PrismaClient } from "@prisma/client";
import { deriveImages } from "@/lib/storage/deriveImages";
import { processVideoDerivatives } from "@/lib/storage/processVideo";

const prisma = new PrismaClient();

// Generates the derivatives that make galleries light: WebP thumb/preview for
// photos, plus a poster frame and a 1080p MP4 transcode for videos. New
// uploads get theirs in app/api/admin/events/[id]/media/route.ts; this covers
// media from before that existed, re-generation after a settings change, and
// videos whose background transcode was interrupted by a restart.
//
//   npm run media:derivatives              only media still missing derivatives
//   npm run media:derivatives -- --force   re-generate everything
//
// Both modes are safe to re-run and never touch the originals — derivatives
// are always rebuilt from filePath, so a bad batch can simply be redone.
async function main() {
  const force = process.argv.includes("--force");

  const photos = await prisma.eventMedia.findMany({
    where: force ? { type: "PHOTO" } : { type: "PHOTO", OR: [{ thumbPath: null }, { previewPath: null }] },
    select: { id: true, filePath: true },
  });

  // A video needs redoing when it has no transcode yet, or when a previous
  // run died partway and left it stuck on PROCESSING.
  const videos = await prisma.eventMedia.findMany({
    where: force
      ? { type: "VIDEO" }
      : { type: "VIDEO", OR: [{ webPath: null }, { thumbPath: null }, { processingStatus: "PROCESSING" }] },
    select: { id: true, filePath: true },
  });

  if (photos.length === 0 && videos.length === 0) {
    console.log(
      force
        ? "No media found."
        : "Nothing to backfill — everything already has derivatives. Use --force to re-generate them.",
    );
    return;
  }

  let done = 0;
  let failed = 0;

  // Sequential on purpose: sharp and ffmpeg are both CPU-bound and this runs
  // against a live server — a burst of parallel encodes would spike memory
  // and starve request handling for no real wall-clock win.
  if (photos.length > 0) {
    console.log(`${force ? "Re-generating" : "Backfilling"} derivatives for ${photos.length} photo(s)...`);
    for (const media of photos) {
      const derivatives = await deriveImages(media.filePath);
      if (!derivatives) {
        failed += 1;
        console.warn(`  ! could not derive ${media.filePath} (left as-is, serves the original)`);
        continue;
      }
      await prisma.eventMedia.update({ where: { id: media.id }, data: derivatives });
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${photos.length}`);
    }
  }

  if (videos.length > 0) {
    console.log(`Transcoding ${videos.length} video(s) — this can take a while per file...`);
    for (const media of videos) {
      console.log(`  - ${media.filePath}`);
      await prisma.eventMedia.update({ where: { id: media.id }, data: { processingStatus: "PROCESSING" } });
      try {
        await processVideoDerivatives(media.id, media.filePath);
        done += 1;
      } catch (error) {
        failed += 1;
        await prisma.eventMedia.update({ where: { id: media.id }, data: { processingStatus: "FAILED" } });
        console.warn(`  ! failed: ${String(error)}`);
      }
    }
  }

  console.log(`Done: ${done} processed, ${failed} failed.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
