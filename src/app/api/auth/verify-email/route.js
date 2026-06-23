import { NextResponse } from "next/server";
import { verifyEmailCode } from "@/modules/auth/register.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await verifyEmailCode({
      email: body.email,
      code: body.code,
    });
    return NextResponse.json({
      ...result,
      message: result.alreadyVerified
        ? "Email sudah diverifikasi sebelumnya"
        : "Email berhasil diverifikasi",
    });
  } catch (error) {
    console.error("[auth/verify-email]", error);
    const message = error.message || "Gagal memverifikasi email";
    const status =
      message.includes("salah") ||
      message.includes("kedaluwarsa") ||
      message.includes("tidak ditemukan") ||
      message.includes("wajib")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
