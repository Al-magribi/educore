import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  deleteGalleryAlbum,
  getAdminGalleryAlbum,
  updateGalleryAlbum,
} from "@/modules/cms/gallery/index.js";

export async function GET(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const album = await getAdminGalleryAlbum(id);
    if (!album) {
      return NextResponse.json({ error: "Album tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ album });
  } catch (error) {
    console.error("[admin/gallery/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat album" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const album = await updateGalleryAlbum(id, body);
    return NextResponse.json({ album, message: "Album berhasil disimpan" });
  } catch (error) {
    console.error("[admin/gallery/[id] PUT]", error);
    const status = error.message === "Album tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan album" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteGalleryAlbum(id);
    return NextResponse.json({ message: "Album berhasil dihapus" });
  } catch (error) {
    console.error("[admin/gallery/[id] DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus album" },
      { status: 500 }
    );
  }
}
