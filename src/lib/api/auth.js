import { NextResponse } from "next/server";
import { auth } from "@/auth.js";

export async function requireAuthApi() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
