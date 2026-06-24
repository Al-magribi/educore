import { NextResponse } from "next/server";
import { requireApplicantApi } from "@/lib/api/applicant-auth.js";
import {
  getApplicantFormPageData,
  saveApplicationForm,
} from "@/modules/spmb/services/applicant-form.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const data = await getApplicantFormPageData(authResult.session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb/formulir GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat formulir" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const data = await saveApplicationForm(authResult.session.user.id, {
      answers: body.answers ?? {},
      submit: Boolean(body.submit),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb/formulir PUT]", error);
    const status = error.message?.includes("belum") || error.message?.includes("tidak dapat")
      ? 403
      : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan formulir" },
      { status }
    );
  }
}
