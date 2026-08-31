import { prisma } from "@/lib/prisma";
import { derivePoster, transcodeVideo } from "@/lib/storage/deriveVideo";

// Poster first, then the transcode: the poster takes a second or two and
// immediately makes the grid tile light, while the transcode can run for
// minutes on a long clip. Each result is written as soon as it lands, so a
// crash midway still leaves the finished half usable.
//
// Marks the row READY even when the transcode failed but the poster worked —
// `webPath` staying null is what tells players to fall back to the original,
// and FAILED is reserved for "nothing usable was produced", which is what the
// admin badge warns about.
export async function processVideoDerivatives(mediaId: string, filePath: string): Promise<void> {
  const poster = await derivePoster(filePath);
  if (poster) {
    await prisma.eventMedia.update({ where: { id: mediaId }, data: poster });
  }

  const webPath = await transcodeVideo(filePath);

  await prisma.eventMedia.update({
    where: { id: mediaId },
    data: { webPath, processingStatus: poster || webPath ? "READY" : "FAILED" },
  });
}

// Fire-and-forget wrapper for the upload request path: the response must not
// wait minutes for ffmpeg. If the process dies mid-transcode the row is left
// PROCESSING — `npm run media:derivatives` picks those back up.
export function startVideoProcessing(mediaId: string, filePath: string): void {
  void processVideoDerivatives(mediaId, filePath).catch(async (error) => {
    console.error(`Video processing failed for ${filePath}:`, error);
    await prisma.eventMedia
      .update({ where: { id: mediaId }, data: { processingStatus: "FAILED" } })
      .catch(() => {});
  });
}
