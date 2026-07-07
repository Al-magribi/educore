import { NextResponse } from "next/server";
import { requireApplicantApi } from "@/lib/api/applicant-auth.js";
import {
  initiateMidtransPayment,
  refreshMidtransPayment,
} from "@/modules/payment/applicant-payment.js";

export async function POST(request) {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await initiateMidtransPayment(authResult.session.user.id, {
      category: body.category,
      feeItemIds: body.feeItemIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[spmb/payment/midtrans POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memulai pembayaran online" },
      { status: 400 }
    );
  }
}

export async function PATCH(request) {
  const authResult = await requireApplicantApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    if (!body.paymentId) {
      return NextResponse.json({ error: "ID pembayaran wajib diisi" }, { status: 400 });
    }

    const payment = await refreshMidtransPayment(
      authResult.session.user.id,
      body.paymentId
    );

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[spmb/payment/midtrans PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui status pembayaran" },
      { status: 400 }
    );
  }
}
