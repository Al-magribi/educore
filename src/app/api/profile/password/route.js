import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/api/auth.js";
import { changeUserPassword } from "@/modules/profile/index.js";

export async function PUT(request) {
  const authResult = await requireAuthApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    await changeUserPassword(authResult.session.user.id, body);
    return NextResponse.json({ message: "Password berhasil diubah" });
  } catch (error) {
    console.error("[profile/password PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengubah password" },
      { status: 400 }
    );
  }
}
