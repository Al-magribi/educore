import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { setGalleryCover } from "@/modules/cms/gallery/index.js";

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    if (!body.imageId) {
      return NextResponse.json({ error: "imageId wajib diisi" }, { status: 400 });
    }
    const album = await setGalleryCover(id, body.imageId);
    return NextResponse.json({ album, message: "Cover album diperbarui" });
  } catch (error) {
    console.error("[admin/gallery/[id]/cover PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengatur cover" },
      { status: 400 }
    );
  }
}
