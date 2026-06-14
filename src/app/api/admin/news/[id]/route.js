import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  deleteNewsPost,
  getAdminNewsPost,
  updateNewsPost,
} from "@/modules/cms/news/index.js";

export async function GET(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const post = await getAdminNewsPost(id);
    if (!post) {
      return NextResponse.json({ error: "Berita tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error("[admin/news/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat berita" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const post = await updateNewsPost(id, body, authResult.session.user.id);
    return NextResponse.json({ post, message: "Berita berhasil disimpan" });
  } catch (error) {
    console.error("[admin/news/[id] PUT]", error);
    const status = error.message === "Berita tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan berita" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteNewsPost(id);
    return NextResponse.json({ message: "Berita berhasil dihapus" });
  } catch (error) {
    console.error("[admin/news/[id] DELETE]", error);
    const status = error.message === "Berita tidak ditemukan" ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus berita" },
      { status }
    );
  }
}
