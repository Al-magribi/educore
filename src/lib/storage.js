/**
 * Server-only storage API.
 * Client Components: gunakan `@/lib/storage/urls.js` untuk validasi URL.
 */
import "server-only";

export {
  UPLOAD_MAX_BYTES,
  OUTPUT_MAX_BYTES,
  UPLOAD_CATEGORY_ROLES,
  getUploadRoot,
  isServedFromPublicDir,
  toPublicUploadUrl,
  resolveUploadFromPublicUrl,
  resolveUploadRelativePath,
  processImageForStorage,
  saveUploadedImage,
  deleteUploadedFile,
} from "./storage/index.js";
