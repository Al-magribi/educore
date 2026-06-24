import { NextResponse } from "next/server";
import { requireApplicantApi } from "@/lib/api/applicant-auth.js";
import {
  getApplicantQuestionnairePageData,
  saveQuestionnaireResponse,
} from "@/modules/spmb/services/applicant-questionnaire.js";

export async function GET() {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const data = await getApplicantQuestionnairePageData(authResult.session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb/kuesioner GET]", error);
    return NextResponse.json({ error: "Gagal memuat kuesioner" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const data = await saveQuestionnaireResponse(authResult.session.user.id, body.questionnaireId, {
      selections: body.selections ?? {},
      submit: Boolean(body.submit),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb/kuesioner PUT]", error);
    const status =
      error.message?.includes("belum") ||
      error.message?.includes("tidak dapat") ||
      error.message?.includes("tidak ditemukan")
        ? 403
        : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan kuesioner" },
      { status }
    );
  }
}
