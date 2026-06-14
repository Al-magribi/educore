import "server-only";
import { prisma } from "@/lib/db.js";
import { deleteUploadedFile } from "@/lib/storage/local.js";
import { assertAppUploadUrl } from "@/lib/storage/urls.js";
import { slugify } from "@/modules/cms/news/slug.js";
import { GALLERY_STATUSES } from "./constants.js";
import {
  mapGalleryAlbumForAdmin,
} from "./mapper.js";

const albumInclude = {
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  coverImage: true,
  _count: { select: { images: true } },
};

const albumIncludeDetail = {
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  coverImage: true,
};

function validateStatus(status) {
  const value = String(status ?? "draft");
  if (!GALLERY_STATUSES.includes(value)) {
    throw new Error("Status tidak valid");
  }
  return value;
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug || "album";
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.galleryAlbum.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
  }
}

async function getAlbumOrThrow(id) {
  const album = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!album) throw new Error("Album tidak ditemukan");
  return album;
}

async function deleteImageFile(imageUrl) {
  if (imageUrl) await deleteUploadedFile(imageUrl);
}

/**
 * @param {object} input
 */
function buildAlbumData(input) {
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Judul album wajib diisi");

  const status = validateStatus(input.status);
  const description = String(input.description ?? "").trim() || null;

  let publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  if (status === "published" && (!publishedAt || Number.isNaN(publishedAt.getTime()))) {
    publishedAt = new Date();
  }
  if (status === "draft") {
    publishedAt = null;
  }

  return {
    title,
    description,
    status,
    publishedAt,
    ...(Number.isFinite(Number(input.sortOrder))
      ? { sortOrder: Math.max(0, Math.round(Number(input.sortOrder))) }
      : {}),
  };
}

export async function listAdminGalleryAlbums() {
  const rows = await prisma.galleryAlbum.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: albumInclude,
  });
  return rows.map(mapGalleryAlbumForAdmin);
}

export async function getAdminGalleryAlbum(id) {
  const row = await prisma.galleryAlbum.findUnique({
    where: { id },
    include: albumIncludeDetail,
  });
  if (!row) return null;
  return mapGalleryAlbumForAdmin(row);
}

export async function createGalleryAlbum(input) {
  const data = buildAlbumData(input);
  const baseSlug = slugify(String(input.slug ?? "").trim() || data.title);
  const slug = await ensureUniqueSlug(baseSlug);

  const row = await prisma.galleryAlbum.create({
    data: { ...data, slug },
    include: albumIncludeDetail,
  });

  return mapGalleryAlbumForAdmin(row);
}

export async function updateGalleryAlbum(id, input) {
  await getAlbumOrThrow(id);
  const data = buildAlbumData(input);

  let slug;
  const requestedSlug = String(input.slug ?? "").trim();
  if (requestedSlug) {
    slug = await ensureUniqueSlug(slugify(requestedSlug), id);
  }

  if (input.coverImageId !== undefined) {
    if (input.coverImageId === null || input.coverImageId === "") {
      data.coverImageId = null;
    } else {
      const image = await prisma.galleryImage.findFirst({
        where: { id: String(input.coverImageId), albumId: id },
      });
      if (!image) throw new Error("Gambar cover harus berasal dari album ini");
      data.coverImageId = image.id;
    }
  }

  const row = await prisma.galleryAlbum.update({
    where: { id },
    data: {
      ...data,
      ...(slug ? { slug } : {}),
    },
    include: albumIncludeDetail,
  });

  return mapGalleryAlbumForAdmin(row);
}

export async function deleteGalleryAlbum(id) {
  const album = await prisma.galleryAlbum.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!album) throw new Error("Album tidak ditemukan");

  await prisma.galleryAlbum.delete({ where: { id } });

  await Promise.all(album.images.map((img) => deleteImageFile(img.imageUrl)));
}

/**
 * @param {string} albumId
 * @param {Array<{ imageUrl: string; imageAlt?: string; caption?: string }>} items
 */
export async function addGalleryImages(albumId, items) {
  await getAlbumOrThrow(albumId);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Minimal satu gambar wajib diunggah");
  }

  const last = await prisma.galleryImage.findFirst({
    where: { albumId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let nextOrder = (last?.sortOrder ?? -1) + 1;

  const created = [];

  for (const item of items) {
    const imageUrl = assertAppUploadUrl(String(item.imageUrl ?? "").trim());
    if (!imageUrl) throw new Error("URL gambar tidak valid");

    const row = await prisma.galleryImage.create({
      data: {
        albumId,
        imageUrl,
        imageAlt: String(item.imageAlt ?? "").trim() || null,
        caption: String(item.caption ?? "").trim() || null,
        sortOrder: nextOrder,
      },
    });
    created.push(row);
    nextOrder += 1;
  }

  const album = await prisma.galleryAlbum.findUnique({
    where: { id: albumId },
    select: { coverImageId: true },
  });

  if (!album?.coverImageId && created[0]) {
    await prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { coverImageId: created[0].id },
    });
  }

  return getAdminGalleryAlbum(albumId);
}

export async function updateGalleryImage(imageId, input) {
  const existing = await prisma.galleryImage.findUnique({ where: { id: imageId } });
  if (!existing) throw new Error("Gambar tidak ditemukan");

  await prisma.galleryImage.update({
    where: { id: imageId },
    data: {
      imageAlt: String(input.imageAlt ?? existing.imageAlt ?? "").trim() || null,
      caption: String(input.caption ?? existing.caption ?? "").trim() || null,
    },
  });

  return getAdminGalleryAlbum(existing.albumId);
}

export async function deleteGalleryImage(imageId) {
  const existing = await prisma.galleryImage.findUnique({ where: { id: imageId } });
  if (!existing) throw new Error("Gambar tidak ditemukan");

  const album = await prisma.galleryAlbum.findUnique({
    where: { id: existing.albumId },
    select: { coverImageId: true },
  });

  if (album?.coverImageId === imageId) {
    const nextCover = await prisma.galleryImage.findFirst({
      where: { albumId: existing.albumId, NOT: { id: imageId } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    await prisma.galleryAlbum.update({
      where: { id: existing.albumId },
      data: { coverImageId: nextCover?.id ?? null },
    });
  }

  await prisma.galleryImage.delete({ where: { id: imageId } });
  await deleteImageFile(existing.imageUrl);

  return getAdminGalleryAlbum(existing.albumId);
}

/**
 * @param {string} albumId
 * @param {string[]} orderedIds
 */
export async function reorderGalleryImages(albumId, orderedIds) {
  await getAlbumOrThrow(albumId);

  const images = await prisma.galleryImage.findMany({
    where: { albumId },
    select: { id: true },
  });

  const validIds = new Set(images.map((i) => i.id));
  if (orderedIds.length !== validIds.size) {
    throw new Error("Daftar urutan gambar tidak lengkap");
  }

  for (const id of orderedIds) {
    if (!validIds.has(id)) {
      throw new Error("ID gambar tidak valid");
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.galleryImage.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return getAdminGalleryAlbum(albumId);
}

export async function setGalleryCover(albumId, imageId) {
  await getAlbumOrThrow(albumId);

  const image = await prisma.galleryImage.findFirst({
    where: { id: imageId, albumId },
  });
  if (!image) throw new Error("Gambar tidak ditemukan di album ini");

  await prisma.galleryAlbum.update({
    where: { id: albumId },
    data: { coverImageId: imageId },
  });

  return getAdminGalleryAlbum(albumId);
}
