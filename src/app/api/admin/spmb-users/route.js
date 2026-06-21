import { NextResponse } from "next/server";
import { requireSpmbAdminUsersApi } from "@/lib/api/cms-auth.js";
import { createSpmbAdminUser, listSpmbAdminUsers } from "@/modules/admin/spmb-users.js";

export async function GET() {
  const authResult = await requireSpmbAdminUsersApi();
  if (authResult.error) return authResult.error;

  try {
    const users = await listSpmbAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/spmb-users GET]", error);
    return NextResponse.json({ error: "Gagal memuat daftar akun SPMB" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminUsersApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const user = await createSpmbAdminUser(body);
    return NextResponse.json({ user, message: "Akun admin SPMB berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[admin/spmb-users POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat akun admin SPMB" },
      { status: 400 }
    );
  }
}
