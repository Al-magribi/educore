import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  deleteGalleryImage,
  updateGalleryImage,
} from "@/modules/cms/gallery/index.js";

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { imageId } = await params;

  try {
    const body = await request.json();
    const album = await updateGalleryImage(imageId, body);
    return NextResponse.json({ album, message: "Gambar disimpan" });
  } catch (error) {
    console.error("[admin/gallery/images/[imageId] PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan gambar" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { imageId } = await params;

  try {
    const album = await deleteGalleryImage(imageId);
    return NextResponse.json({ album, message: "Gambar dihapus" });
  } catch (error) {
    console.error("[admin/gallery/images/[imageId] DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus gambar" },
      { status: 400 }
    );
  }
}
