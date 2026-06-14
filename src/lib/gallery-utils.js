export const GALLERY_PAGE_META = {
  title: "Galeri",
  subtitle: "Dokumentasi kegiatan, prestasi, dan momen berharga di sekolah kami.",
};

export function formatGalleryDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
