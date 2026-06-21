import { NextResponse } from "next/server";
import { requireSpmbAdminUsersApi } from "@/lib/api/cms-auth.js";
import {
  deleteSpmbAdminUser,
  getSpmbAdminUser,
  updateSpmbAdminUser,
} from "@/modules/admin/spmb-users.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminUsersApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const user = await getSpmbAdminUser(id);
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/spmb-users/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat akun" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminUsersApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const user = await updateSpmbAdminUser(id, body);
    return NextResponse.json({ user, message: "Akun admin SPMB berhasil disimpan" });
  } catch (error) {
    console.error("[admin/spmb-users/[id] PUT]", error);
    const status = error.message === "Akun tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan akun admin SPMB" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminUsersApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteSpmbAdminUser(id);
    return NextResponse.json({ message: "Akun admin SPMB berhasil dihapus" });
  } catch (error) {
    console.error("[admin/spmb-users/[id] DELETE]", error);
    const status = error.message === "Akun tidak ditemukan" ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus akun admin SPMB" },
      { status }
    );
  }
}
