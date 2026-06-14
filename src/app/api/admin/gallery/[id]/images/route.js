import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { addGalleryImages } from "@/modules/cms/gallery/index.js";

export async function POST(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const items = Array.isArray(body.images) ? body.images : [body];
    const album = await addGalleryImages(id, items);
    return NextResponse.json({ album, message: "Gambar berhasil ditambahkan" });
  } catch (error) {
    console.error("[admin/gallery/[id]/images POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menambahkan gambar" },
      { status: 400 }
    );
  }
}
