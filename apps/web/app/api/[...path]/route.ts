import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "user-agent", "x-request-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  let response: Response;
  try {
    const apiUrl = runtimeApiUrl();
    const segments = (await context.params).path;
    const pathname = segments.map((segment) => encodeURIComponent(segment)).join("/");
    const target = new URL(`/api/${pathname}${request.nextUrl.search}`, apiUrl);
    response = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : new Uint8Array(await request.arrayBuffer()),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "The Rahal service is temporarily unavailable.",
        },
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, name) => {
    if (!hopByHopHeaders.has(name.toLowerCase()) && name.toLowerCase() !== "set-cookie") {
      responseHeaders.append(name, value);
    }
  });
  for (const cookie of response.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  responseHeaders.set("cache-control", response.headers.get("cache-control") ?? "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function runtimeApiUrl() {
  const configured = process.env.API_URL ?? "http://localhost:4000";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("API_URL must be a valid HTTP URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API_URL must use HTTP or HTTPS.");
  }
  return url;
}

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
