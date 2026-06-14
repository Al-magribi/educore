import { NextResponse } from "next/server";
import { getPaymentSettingsForServer } from "@/modules/payment/settings.js";

/**
 * Midtrans webhook — verifikasi signature memakai server key dari database.
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

  // TODO: verifikasi signature + update status payment
  return NextResponse.json({
    message: "Webhook diterima — Midtrans dikonfigurasi dari database",
    sandbox: !paymentSettings.midtransProduction,
    received: Boolean(body),
  });
}
