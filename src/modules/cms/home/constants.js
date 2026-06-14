/** @type {import("@prisma/client").HomeSectionType[]} */
export const HOME_SECTION_TYPES = [
  "hero",
  "achievements",
  "extracurricular",
  "alumni_testimonials",
  "spmb_cta",
  "contact",
];

export const HOME_SECTION_LABELS = {
  hero: "Hero",
  achievements: "Prestasi",
  extracurricular: "Ekstrakurikuler",
  alumni_testimonials: "Testimoni Alumni",
  spmb_cta: "Kartu SPMB",
  contact: "Kontak",
};

export const HOME_SECTION_SORT_ORDER = {
  hero: 0,
  achievements: 1,
  extracurricular: 2,
  alumni_testimonials: 3,
  spmb_cta: 4,
  contact: 5,
};

/** Section dengan field `content` JSON (judul, pengaturan, dll.). */
export const SECTIONS_WITH_CONTENT = new Set([
  "hero",
  "spmb_cta",
  "alumni_testimonials",
  "contact",
]);

/** @deprecated gunakan SECTIONS_WITH_CONTENT */
export const CONTENT_ONLY_SECTIONS = SECTIONS_WITH_CONTENT;

/** Section yang menyimpan daftar kartu di `items`. */
export const ITEMS_SECTIONS = new Set([
  "achievements",
  "extracurricular",
  "alumni_testimonials",
]);
