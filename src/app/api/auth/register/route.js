import { NextResponse } from "next/server";
import { registerApplicant } from "@/modules/auth/register.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await registerApplicant({
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
    });
    return NextResponse.json({
      ...result,
      message: "Kode verifikasi telah dikirim ke email Anda",
    });
  } catch (error) {
    console.error("[auth/register]", error);
    const message = error.message || "Gagal mendaftar";
    const status =
      message.includes("sudah terdaftar") || message.includes("tidak valid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
