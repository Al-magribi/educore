import { NextResponse } from "next/server";
import { ROLES } from "@/config/roles.js";
import { proxyAuth } from "@/lib/proxy-auth.js";

const authProxy = proxyAuth((request) => {
  const { pathname } = request.nextUrl;
  const role = request.auth?.user?.role;
  const isLoggedIn = Boolean(request.auth?.user);

  if (!isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/api/upload") {
    const uploadRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.CMS_ADMIN,
      ROLES.SPMB_ADMIN,
      ROLES.APPLICANT,
    ];
    if (!uploadRoles.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.CMS_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/spmb-admin")) {
    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.SPMB_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export async function proxy(request, event) {
  return authProxy(request, event);
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/spmb-admin/:path*", "/api/upload"],
};
