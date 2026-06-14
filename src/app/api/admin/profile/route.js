import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { getAdminProfile, updateAdminProfile } from "@/modules/admin/profile.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const profile = await getAdminProfile(authResult.session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[profile GET]", error);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const profile = await updateAdminProfile(authResult.session.user.id, body);
    return NextResponse.json({ profile, message: "Profil berhasil diperbarui" });
  } catch (error) {
    console.error("[profile PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui profil" },
      { status: 400 }
    );
  }
}
