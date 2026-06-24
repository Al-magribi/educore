import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { listQuestionnaireResponses } from "@/modules/spmb/questionnaires.js";

export async function GET(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const questionnaireId = searchParams.get("questionnaireId") || undefined;
    const responses = await listQuestionnaireResponses({ questionnaireId });
    return NextResponse.json({ responses });
  } catch (error) {
    console.error("[spmb-admin/questionnaire-responses GET]", error);
    return NextResponse.json({ error: "Gagal memuat hasil kuesioner" }, { status: 500 });
  }
}
