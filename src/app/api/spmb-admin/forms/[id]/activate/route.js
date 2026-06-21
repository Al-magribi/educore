import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { activateFormDefinition } from "@/modules/spmb/forms.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const form = await activateFormDefinition(id);
    return NextResponse.json({ form, message: "Formulir diaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/forms/[id]/activate POST]", error);
    const status = error.message === "Formulir tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan formulir" },
      { status }
    );
  }
}
