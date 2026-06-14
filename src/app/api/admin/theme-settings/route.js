import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  getThemeSettingsForAdmin,
  upsertThemeSettings,
} from "@/modules/theme/settings.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const theme = await getThemeSettingsForAdmin();
    return NextResponse.json({ theme });
  } catch (error) {
    console.error("[theme-settings GET]", error);
    return NextResponse.json({ error: "Gagal memuat tema" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const theme = await upsertThemeSettings(body);
    return NextResponse.json({ theme, message: "Tema warna berhasil disimpan" });
  } catch (error) {
    console.error("[theme-settings PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan tema" },
      { status: 500 }
    );
  }
}
