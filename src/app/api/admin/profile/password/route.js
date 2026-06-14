import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { changeAdminPassword } from "@/modules/admin/profile.js";

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    await changeAdminPassword(authResult.session.user.id, body);
    return NextResponse.json({ message: "Password berhasil diubah" });
  } catch (error) {
    console.error("[profile/password PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengubah password" },
      { status: 400 }
    );
  }
}
