import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth.js";
import { getLoginRedirect } from "@/lib/auth-redirect.js";

export async function getSession() {
  return auth();
}

async function getCallbackPath() {
  const headerList = await headers();
  const nextUrl = headerList.get("next-url") || headerList.get("x-url");
  if (!nextUrl) return null;

  try {
    const pathname = new URL(nextUrl, "http://localhost").pathname;
    return pathname.startsWith("/") ? pathname : null;
  } catch {
    return null;
  }
}

export async function requireAuth(options = {}) {
  const session = await auth();
  if (!session?.user) {
    const callbackPath =
      (typeof options.callbackPath === "string" && options.callbackPath.startsWith("/")
        ? options.callbackPath
        : null) ?? (await getCallbackPath());

    if (callbackPath) {
      redirect(`/masuk?callbackUrl=${encodeURIComponent(callbackPath)}`);
    }
    redirect("/masuk");
  }
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
