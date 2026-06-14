import "server-only";
import sharp from "sharp";
import {
  OUTPUT_MAX_BYTES,
  UPLOAD_MIME_TO_EXT,
} from "./constants.js";

const QUALITY_STEPS = [85, 75, 65, 55, 45, 35, 25];
const DIMENSION_STEPS = [2400, 1920, 1600, 1280, 1024, 800, 640];

/**
 * @param {Buffer} inputBuffer
 * @param {string} inputMimeType
 * @param {{ maxDimension: number; quality: number; hasAlpha: boolean }} opts
 */
async function encodeWebp(inputBuffer, { maxDimension, quality, hasAlpha }) {
  return sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
      smartSubsample: true,
      ...(hasAlpha ? { alphaQuality: quality } : {}),
    })
    .toBuffer();
}

/**
 * Optimasi gambar dengan Sharp — dipakai global untuk semua upload.
 * Output selalu WebP dengan ukuran di bawah OUTPUT_MAX_BYTES bila memungkinkan.
 *
 * @param {Buffer} inputBuffer
 * @param {string} inputMimeType
 */
export async function processImageForStorage(inputBuffer, inputMimeType) {
  if (!UPLOAD_MIME_TO_EXT[inputMimeType]) {
    throw new Error("Format gambar tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.");
  }

  const meta = await sharp(inputBuffer, {
    animated: inputMimeType === "image/gif",
    failOn: "none",
  }).metadata();

  const hasAlpha = Boolean(meta.hasAlpha);
  let smallest = inputBuffer;

  for (const maxDimension of DIMENSION_STEPS) {
    for (const quality of QUALITY_STEPS) {
      const buffer = await encodeWebp(inputBuffer, {
        maxDimension,
        quality,
        hasAlpha,
      });

      if (buffer.length <= OUTPUT_MAX_BYTES) {
        return {
          buffer,
          mimeType: "image/webp",
          ext: "webp",
          originalSize: inputBuffer.length,
          compressedSize: buffer.length,
        };
      }

      if (buffer.length < smallest.length) {
        smallest = buffer;
      }
    }
  }

  if (smallest.length <= OUTPUT_MAX_BYTES) {
    return {
      buffer: smallest,
      mimeType: "image/webp",
      ext: "webp",
      originalSize: inputBuffer.length,
      compressedSize: smallest.length,
    };
  }

  throw new Error(
    "Gambar tidak dapat dioptimasi di bawah 1 MB. Coba gunakan resolusi lebih kecil."
  );
}
