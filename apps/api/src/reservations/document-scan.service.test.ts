import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentScanService } from "./document-scan.service";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("DocumentScanService", () => {
  it("allows local development when no external scanner is configured", async () => {
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_URL", "");
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_SECRET", "");
    await expect(
      new DocumentScanService().assertClean(Buffer.from("safe-local-file"), "application/pdf"),
    ).resolves.toBeUndefined();
  });

  it("signs bytes and accepts only an explicit clean response", async () => {
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_URL", "https://scanner.example.test/v1/scan");
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_SECRET", "scanner-test-secret-with-at-least-32-characters");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ clean: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const bytes = Buffer.from("%PDF-safe");

    await expect(
      new DocumentScanService().assertClean(bytes, "application/pdf"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scanner.example.test/v1/scan",
      expect.objectContaining({
        method: "POST",
        body: expect.any(Uint8Array),
        headers: expect.objectContaining({
          "x-rahal-content-type": "application/pdf",
          "x-rahal-signature": expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(Buffer.from((fetchMock.mock.calls[0]?.[1]?.body ?? []) as Uint8Array)).toEqual(bytes);
  });

  it("blocks suspicious results and fails closed on provider errors", async () => {
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_URL", "https://scanner.example.test/v1/scan");
    vi.stubEnv("DOCUMENT_SCAN_WEBHOOK_SECRET", "scanner-test-secret-with-at-least-32-characters");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ clean: false }), { status: 200 }),
    );
    await expect(
      new DocumentScanService().assertClean(Buffer.from("unsafe"), "application/pdf"),
    ).rejects.toBeInstanceOf(BadRequestException);

    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("provider offline"));
    await expect(
      new DocumentScanService().assertClean(Buffer.from("unknown"), "application/pdf"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
