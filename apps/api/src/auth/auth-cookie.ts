import type { Request } from "express";

export const authCookieName = "rahal_session";
export const staffMfaChallengeCookieName = "rahal_staff_mfa_challenge";

export function readAuthCookie(request: Request) {
  return readCookie(request, authCookieName);
}

export function readStaffMfaChallengeCookie(request: Request) {
  return readCookie(request, staffMfaChallengeCookieName);
}

function readCookie(request: Request, cookieName: string) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split("=");
    if (name === cookieName) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
