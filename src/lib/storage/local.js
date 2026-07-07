import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  UPLOAD_DOCUMENT_MIME_TO_EXT,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIME_TO_EXT,
} from "./constants.js";
import { getUploadRoot, resolveUploadFromPublicUrl, toPublicUploadUrl } from "./paths.js";
import { processImageForStorage } from "./process-image.js";

function detectMimeType(buffer, declaredMime) {
  if (UPLOAD_MIME_TO_EXT[declaredMime] || UPLOAD_DOCUMENT_MIME_TO_EXT[declaredMime]) {
    return declaredMime;
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }

  return declaredMime;
}

async function prepareUploadBuffer(buffer, mimeType) {
  if (UPLOAD_MIME_TO_EXT[mimeType]) {
    return processImageForStorage(buffer, mimeType);
  }

  if (UPLOAD_DOCUMENT_MIME_TO_EXT[mimeType]) {
    return {
      buffer,
      mimeType,
      ext: UPLOAD_DOCUMENT_MIME_TO_EXT[mimeType],
      originalSize: buffer.length,
      compressedSize: buffer.length,
    };
  }

  throw new Error(
    "Format file tidak didukung. Gunakan JPEG, PNG, WebP, GIF, PDF, DOC, atau Excel."
  );
}

/**
 * @param {string} category
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function saveUploadedImage(category, buffer, mimeType) {
  if (buffer.length > UPLOAD_MAX_BYTES) {
    throw new Error(`Ukuran file maksimal ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB`);
  }

  const resolvedMimeType = detectMimeType(buffer, mimeType);
  const processed = await prepareUploadBuffer(buffer, resolvedMimeType);

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
