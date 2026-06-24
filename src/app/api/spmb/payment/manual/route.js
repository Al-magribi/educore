import { NextResponse } from "next/server";
import { requireApplicantApi } from "@/lib/api/applicant-auth.js";
import { submitManualPayment } from "@/modules/payment/applicant-payment.js";

export async function POST(request) {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const payment = await submitManualPayment(authResult.session.user.id, body.proofUrl);
    return NextResponse.json({
      payment,
      message: "Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.",
    });
  } catch (error) {
    console.error("[spmb/payment/manual POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengirim bukti pembayaran" },
      { status: 400 }
    );
  }
}
