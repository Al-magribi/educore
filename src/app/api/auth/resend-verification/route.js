import { NextResponse } from "next/server";
import { resendVerificationCode } from "@/modules/auth/register.js";

export async function POST(request) {
  try {
    const body = await request.json();
    await resendVerificationCode({ email: body.email });
    return NextResponse.json({ message: "Kode verifikasi telah dikirim ulang" });
  } catch (error) {
    console.error("[auth/resend-verification]", error);
    const message = error.message || "Gagal mengirim ulang kode";
    const status =
      message.includes("Tunggu") ||
      message.includes("sudah diverifikasi") ||
      message.includes("tidak ditemukan")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
