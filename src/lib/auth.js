import { redirect } from "next/navigation";
import { auth } from "@/auth.js";
import { getLoginRedirect } from "@/lib/auth-redirect.js";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/masuk");
  return session;
}

/** @param {...string} roles */
export async function requireRole(...roles) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect(getLoginRedirect(session.user.role));
  }
  return session;
}
