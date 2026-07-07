import { getToken } from "next-auth/jwt";

function prefersSecureCookies(request) {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    try {
      return new URL(authUrl).protocol === "https:";
    } catch {
      // ignore invalid URL
    }
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }

  return request.nextUrl.protocol === "https:";
}

/**
 * Read JWT session in proxy. Tries secure and non-secure cookie names because
 * Auth.js may issue `__Secure-authjs.session-token` while getToken defaults differ.
 *
 * @param {import("next/server").NextRequest} request
 */
export async function readProxyAuthToken(request) {
  const base = {
    req: request,
    secret: process.env.AUTH_SECRET,
  };
  const preferSecure = prefersSecureCookies(request);
  const attempts = preferSecure ? [true, false] : [false, true];

  for (const secureCookie of attempts) {
    const token = await getToken({ ...base, secureCookie });
    if (token) return token;
  }

  return null;
}
