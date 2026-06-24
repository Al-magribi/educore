import { NextResponse } from "next/server";
import { auth } from "@/auth.js";
import { ROLES } from "@/config/roles.js";

export async function requireApplicantApi() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== ROLES.APPLICANT) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
