import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { deactivateQuestionnaire } from "@/modules/spmb/questionnaires.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const questionnaire = await deactivateQuestionnaire(id);
    return NextResponse.json({ questionnaire, message: "Kuesioner berhasil dinonaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/questionnaires/[id]/deactivate POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menonaktifkan kuesioner" },
      { status: 400 }
    );
  }
}
