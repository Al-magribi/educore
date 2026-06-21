import { NextResponse } from "next/server";
import { auth } from "@/auth.js";
import { ROLES } from "@/config/roles.js";

const SPMB_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SPMB_ADMIN];

export async function requireSpmbAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!SPMB_ADMIN_ROLES.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
