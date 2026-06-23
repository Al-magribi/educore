import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  getSpmbLandingContent,
  upsertSpmbLandingContent,
} from "@/modules/spmb/landing-content.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const content = await getSpmbLandingContent();
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[landing-content GET]", error);
    return NextResponse.json(
      { error: "Gagal memuat konten landing SPMB" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const content = await upsertSpmbLandingContent(body);
    return NextResponse.json({
      content,
      message: "Konten landing SPMB berhasil disimpan",
    });
  } catch (error) {
    console.error("[landing-content PUT]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan konten landing SPMB" },
      { status: 500 }
    );
  }
}
