import { NextResponse } from "next/server";
import {
  getAdminPaymentSettings,
  upsertPaymentSettings,
} from "@/modules/payment/settings.js";

export async function GET() {
  try {
    const settings = await getAdminPaymentSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[payment-settings GET]", error);
    return NextResponse.json(
      { error: "Gagal memuat pengaturan pembayaran" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const settings = await upsertPaymentSettings({
      registrationFee: Number(body.registrationFee),
      manualEnabled: Boolean(body.manualEnabled),
      midtransEnabled: Boolean(body.midtransEnabled),
      midtransServerKey: body.midtransServerKey,
      midtransClientKey: body.midtransClientKey || null,
      midtransMerchantId: body.midtransMerchantId || null,
      midtransProduction: Boolean(body.midtransProduction),
      manualInstructions: body.manualInstructions || null,
      bankName: body.bankName || null,
      bankAccountNumber: body.bankAccountNumber || null,
      bankAccountName: body.bankAccountName || null,
    });
    return NextResponse.json({ settings, message: "Pengaturan pembayaran disimpan" });
  } catch (error) {
    console.error("[payment-settings PUT]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan pembayaran" },
      { status: 500 }
    );
  }
}
