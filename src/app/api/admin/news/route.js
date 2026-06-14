import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { createNewsPost, listAdminNewsPosts } from "@/modules/cms/news/index.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const posts = await listAdminNewsPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[admin/news GET]", error);
    return NextResponse.json({ error: "Gagal memuat daftar berita" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const post = await createNewsPost(body, authResult.session.user.id);
    return NextResponse.json({ post, message: "Berita berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[admin/news POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat berita" },
      { status: 400 }
    );
  }
}
