import { put } from "@vercel/blob";
import type { ApiSuccess, AuthSession } from "@rahal/contracts";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maximumImageBytes = 4 * 1024 * 1024;
const supportedImages = {
  "image/jpeg": { extension: "jpg", signature: isJpeg },
  "image/png": { extension: "png", signature: isPng },
  "image/webp": { extension: "webp", signature: isWebp },
} as const;

export async function POST(request: NextRequest) {
  if (!(await isAdministrator(request))) {
    return failure("FORBIDDEN", "Administrator access is required.", 403);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return failure("MEDIA_STORAGE_UNAVAILABLE", "Vehicle image storage is not configured.", 503);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return failure("IMAGE_REQUIRED", "Choose an image to upload.", 400);
  }
  const rule = supportedImages[file.type as keyof typeof supportedImages];
  if (!rule || file.size === 0 || file.size > maximumImageBytes) {
    return failure("INVALID_IMAGE", "Use a JPG, PNG, or WebP image up to 4 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!rule.signature(bytes)) {
    return failure("INVALID_IMAGE", "The selected file is not a valid image.", 400);
  }

  const blob = await put(`vehicles/${crypto.randomUUID()}.${rule.extension}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });
  return Response.json(
    { data: { url: blob.url } },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

async function isAdministrator(request: NextRequest) {
  try {
    const response = await fetch(new URL("/api/auth/session", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as ApiSuccess<AuthSession>;
    return payload.data.user.role === "ADMIN" || payload.data.user.role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

function failure(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array) {
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isWebp(bytes: Uint8Array) {
  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}
