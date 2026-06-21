import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessPath, getLoginRedirect } from "@/lib/auth-redirect.js";

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const role = token?.role;

  if ((pathname === "/masuk" || pathname === "/daftar") && token) {
    return NextResponse.redirect(new URL(getLoginRedirect(role), request.url));
  }

  const needsAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/api/upload" ||
    pathname.startsWith("/spmb-admin") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/spmb/");

  if (!needsAuth) return NextResponse.next();

  if (!token) {
    const login = new URL("/masuk", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/api/upload") {
    const uploadRoles = ["super_admin", "cms_admin", "spmb_admin", "applicant"];
    if (!uploadRoles.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (role !== "super_admin" && role !== "cms_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/spmb-admin")) {
    if (role !== "super_admin" && role !== "spmb_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(getLoginRedirect(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/masuk",
    "/daftar",
    "/admin",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
    "/api/spmb-admin",
    "/api/spmb-admin/:path*",
    "/api/upload",
    "/spmb-admin",
    "/spmb-admin/:path*",
    "/user",
    "/user/:path*",
    "/spmb",
    "/spmb/:path*",
  ],
};
