import sharp from "sharp";

const MAX_DIMENSION = 1920;
const QUALITY_STEPS = [80, 65, 50, 40, 30];

// Resizes (if needed) and re-encodes as JPEG, stepping quality down until
// the result fits under maxBytes. Only used for participant-submitted
// vehicle photos — admin uploads are left untouched (see project plan).
export async function compressToUnderBytes(buffer: Buffer, maxBytes: number): Promise<Buffer> {
  const resized = sharp(buffer).rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  for (const quality of QUALITY_STEPS) {
    const output = await resized.clone().jpeg({ quality }).toBuffer();
    if (output.byteLength <= maxBytes) return output;
  }

  // Even the lowest quality step didn't fit — return it anyway rather than
  // failing the upload; it's the smallest we can reasonably produce.
  return resized.clone().jpeg({ quality: QUALITY_STEPS[QUALITY_STEPS.length - 1] }).toBuffer();
}
