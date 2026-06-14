import { NextResponse } from "next/server";
import { getAdminSmtpSettings, upsertSmtpSettings } from "@/modules/mail/settings.js";

export async function GET() {
  try {
    const settings = await getAdminSmtpSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[smtp-settings GET]", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan SMTP" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const settings = await upsertSmtpSettings({
      enabled: Boolean(body.enabled),
      host: body.host,
      port: Number(body.port),
      secure: Boolean(body.secure),
      user: body.user || null,
      password: body.password,
      fromName: body.fromName || null,
      fromEmail: body.fromEmail || null,
    });
    return NextResponse.json({ settings, message: "Pengaturan SMTP disimpan" });
  } catch (error) {
    console.error("[smtp-settings PUT]", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan SMTP" }, { status: 500 });
  }
}
