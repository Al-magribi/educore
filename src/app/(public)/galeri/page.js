import { getPublishedGalleryAlbums } from "@/modules/cms/gallery/queries.js";
import { GALLERY_PAGE_META } from "@/lib/gallery-utils.js";
import { GalleryListView } from "@/components/gallery/GalleryListView.js";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galeri",
  description: GALLERY_PAGE_META.subtitle,
};

export default async function GaleriPage() {
  const albums = await getPublishedGalleryAlbums();

  return <GalleryListView pageMeta={GALLERY_PAGE_META} albums={albums} />;
}
