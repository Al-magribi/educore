import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { createFormDefinition, listFormDefinitions } from "@/modules/spmb/forms.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const forms = await listFormDefinitions();
    return NextResponse.json({ forms });
  } catch (error) {
    console.error("[spmb-admin/forms GET]", error);
    return NextResponse.json({ error: "Gagal memuat daftar formulir" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const form = await createFormDefinition(body);
    return NextResponse.json({ form, message: "Formulir berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[spmb-admin/forms POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat formulir" },
      { status: 400 }
    );
  }
}
