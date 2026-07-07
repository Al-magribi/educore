/**
 * Auth.js uses `__Secure-authjs.session-token` on HTTPS sites.
 * getToken() defaults to the non-secure cookie name unless secureCookie is set.
 *
 * @param {import("next/server").NextRequest} request
 */
export function useSecureAuthCookie(request) {
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
 * @param {import("next/server").NextRequest} request
 */
export function getAuthTokenOptions(request) {
  return {
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: useSecureAuthCookie(request),
  };
}
