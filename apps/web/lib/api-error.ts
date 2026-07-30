type ApiErrorPayload = {
  error?: {
    message?: unknown;
  };
  message?: unknown;
};

function messageFrom(value: unknown) {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string" && item.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const errorPayload = payload as ApiErrorPayload;
  return messageFrom(errorPayload.error?.message) ?? messageFrom(errorPayload.message) ?? fallback;
}
