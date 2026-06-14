import { sanitizePublicImageUrl } from "@/lib/images.js";

/**
 * @param {import("@prisma/client").GalleryImage} image
 */
function mapImage(image) {
  return {
    id: image.id,
    albumId: image.albumId,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt ?? "",
    caption: image.caption ?? "",
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
  };
}

/**
 * @param {import("@prisma/client").GalleryAlbum & { images?: import("@prisma/client").GalleryImage[]; coverImage?: import("@prisma/client").GalleryImage | null; _count?: { images: number } }}
 */
export function resolveCoverFromAlbum(album) {
  if (album.coverImage) {
    return {
      url: album.coverImage.imageUrl,
      alt: album.coverImage.imageAlt ?? album.title,
    };
  }

  const first = album.images?.[0];
  if (first) {
    return {
      url: first.imageUrl,
      alt: first.imageAlt ?? album.title,
    };
  }

  return { url: null, alt: album.title };
}

/**
 * @param {import("@prisma/client").GalleryAlbum & { images?: import("@prisma/client").GalleryImage[]; coverImage?: import("@prisma/client").GalleryImage | null; _count?: { images: number } }}
 */
export function mapGalleryAlbumForAdmin(album) {
  const images = (album.images ?? []).map(mapImage);
  const cover = resolveCoverFromAlbum({ ...album, images: album.images ?? [] });

  return {
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description ?? "",
    coverImageId: album.coverImageId,
    coverImage: cover.url,
    coverAlt: cover.alt,
    status: album.status,
    sortOrder: album.sortOrder,
    publishedAt: album.publishedAt?.toISOString() ?? null,
    createdAt: album.createdAt.toISOString(),
    updatedAt: album.updatedAt.toISOString(),
    imageCount: album._count?.images ?? images.length,
    images,
  };
}

/**
 * @param {import("@prisma/client").GalleryAlbum & { images?: import("@prisma/client").GalleryImage[]; coverImage?: import("@prisma/client").GalleryImage | null; _count?: { images: number } }}
 */
export function mapGalleryAlbumForPublicList(album) {
  const cover = resolveCoverFromAlbum(album);

  return {
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description ?? "",
    coverImage: sanitizePublicImageUrl(cover.url),
    coverAlt: cover.alt,
    imageCount: album._count?.images ?? album.images?.length ?? 0,
    publishedAt: album.publishedAt?.toISOString() ?? null,
  };
}

/**
 * @param {import("@prisma/client").GalleryAlbum & { images: import("@prisma/client").GalleryImage[]; coverImage?: import("@prisma/client").GalleryImage | null }}
 */
export function mapGalleryAlbumForPublicDetail(album) {
  const list = mapGalleryAlbumForPublicList(album);

  return {
    ...list,
    images: album.images.map((image) => ({
      id: image.id,
      imageUrl: sanitizePublicImageUrl(image.imageUrl),
      imageAlt: image.imageAlt ?? album.title,
      caption: image.caption ?? "",
      sortOrder: image.sortOrder,
    })),
  };
}
