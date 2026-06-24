import { NextResponse } from "next/server";
import { handleMidtransNotification } from "@/modules/payment/applicant-payment.js";
import { getPaymentSettingsForServer } from "@/modules/payment/settings.js";

/**
 * Midtrans webhook — update status payment dari notifikasi transaksi.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);

  const paymentSettings = await getPaymentSettingsForServer().catch(() => null);

  if (!paymentSettings?.midtransEnabled) {
    return NextResponse.json(
      { error: "Midtrans tidak aktif di pengaturan database" },
      { status: 503 }
    );
  }

  if (!body?.order_id) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  try {
    const result = await handleMidtransNotification(body);
    return NextResponse.json({
      message: "Webhook diproses",
      sandbox: !paymentSettings.midtransProduction,
      ...result,
    });
  } catch (error) {
    console.error("[webhooks/midtrans POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses webhook" },
      { status: 500 }
    );
  }
}
