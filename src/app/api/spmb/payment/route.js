import { NextResponse } from "next/server";
import { requireApplicantApi } from "@/lib/api/applicant-auth.js";
import { getApplicantPaymentPageData } from "@/modules/payment/applicant-payment.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const data = await getApplicantPaymentPageData(authResult.session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb/payment GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat data pembayaran" },
      { status: 500 }
    );
  }
}
