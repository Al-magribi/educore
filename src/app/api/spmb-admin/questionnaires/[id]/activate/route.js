import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { activateQuestionnaire } from "@/modules/spmb/questionnaires.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const questionnaire = await activateQuestionnaire(id);
    return NextResponse.json({ questionnaire, message: "Kuesioner berhasil diaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/questionnaires/[id]/activate POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan kuesioner" },
      { status: 400 }
    );
  }
}
