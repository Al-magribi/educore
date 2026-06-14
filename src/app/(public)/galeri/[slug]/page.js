import { notFound } from "next/navigation";
import { getPublishedGalleryAlbumBySlug } from "@/modules/cms/gallery/queries.js";
import { GalleryAlbumView } from "@/components/gallery/GalleryAlbumView.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const album = await getPublishedGalleryAlbumBySlug(slug);

  if (!album) {
    return { title: "Album tidak ditemukan" };
  }

  return {
    title: album.title,
    description: album.description || `Album foto: ${album.title}`,
  };
}

export default async function GaleriAlbumPage({ params }) {
  const { slug } = await params;
  const album = await getPublishedGalleryAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  return <GalleryAlbumView album={album} />;
}
