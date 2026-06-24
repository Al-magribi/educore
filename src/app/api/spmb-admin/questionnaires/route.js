import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { createQuestionnaire, listQuestionnaires } from "@/modules/spmb/questionnaires.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const questionnaires = await listQuestionnaires();
    return NextResponse.json({ questionnaires });
  } catch (error) {
    console.error("[spmb-admin/questionnaires GET]", error);
    return NextResponse.json({ error: "Gagal memuat daftar kuesioner" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const questionnaire = await createQuestionnaire(body);
    return NextResponse.json({ questionnaire, message: "Kuesioner berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[spmb-admin/questionnaires POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat kuesioner" },
      { status: 400 }
    );
  }
}
