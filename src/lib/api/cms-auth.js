import { NextResponse } from "next/server";
import { auth } from "@/auth.js";
import { ROLES } from "@/config/roles.js";

const CMS_ROLES = [ROLES.SUPER_ADMIN, ROLES.CMS_ADMIN];

export async function requireCmsAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!CMS_ROLES.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
