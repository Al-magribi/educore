import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { UPLOAD_MAX_BYTES } from "./constants.js";
import { getUploadRoot, resolveUploadFromPublicUrl, toPublicUploadUrl } from "./paths.js";
import { processImageForStorage } from "./process-image.js";

/**
 * @param {string} category
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function saveUploadedImage(category, buffer, mimeType) {
  if (buffer.length > UPLOAD_MAX_BYTES) {
    throw new Error(`Ukuran file maksimal ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB`);
  }

  const processed = await processImageForStorage(buffer, mimeType);

  const safeCategory = category.replace(/[^a-z0-9_-]/gi, "") || "cms";
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const id = randomBytes(8).toString("hex");
  const fileName = `${Date.now()}-${id}.${processed.ext}`;
  const relativeDir = path.join(safeCategory, year, month);
  const absoluteDir = path.join(getUploadRoot(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });

  const absoluteFile = path.join(absoluteDir, fileName);
  await writeFile(absoluteFile, processed.buffer);

  const relativePath = path.join(relativeDir, fileName).replace(/\\/g, "/");

  return {
    url: toPublicUploadUrl(relativePath),
    relativePath,
    size: processed.compressedSize,
    originalSize: processed.originalSize,
    mimeType: processed.mimeType,
  };
}

/**
 * @param {string} publicUrl
 */
export async function deleteUploadedFile(publicUrl) {
  try {
    const absolute = resolveUploadFromPublicUrl(publicUrl);
    await unlink(absolute);
  } catch {
    /* file may already be gone */
  }
}
