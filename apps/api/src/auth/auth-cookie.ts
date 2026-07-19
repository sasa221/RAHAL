import type { Request } from "express";

export const authCookieName = "rahal_session";

export function readAuthCookie(request: Request) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split("=");
    if (name === authCookieName) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
