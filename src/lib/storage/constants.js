/** Batas ukuran file saat diunggah (sebelum kompresi). */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Batas ukuran file setelah dioptimasi dengan Sharp. */
export const OUTPUT_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

/** Lebar/tinggi maksimum piksel sebelum kompresi bertahap. */
export const IMAGE_MAX_DIMENSION = 2400;

export const UPLOAD_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Dokumen yang disimpan apa adanya (tanpa optimasi Sharp). */
export const UPLOAD_DOCUMENT_MIME_TO_EXT = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export const UPLOAD_EXT_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** @type {Record<string, string[]>} */
export const UPLOAD_CATEGORY_ROLES = {
  cms: ["super_admin", "cms_admin"],
  gallery: ["super_admin", "cms_admin"],
  school: ["super_admin", "cms_admin"],
  spmb: ["super_admin", "spmb_admin"],
  spmb_docs: ["super_admin", "spmb_admin", "applicant"],
};
