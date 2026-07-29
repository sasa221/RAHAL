import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateDocumentStorage } from "./private-document-storage";

let temporaryRoot: string | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

describe("PrivateDocumentStorage", () => {
  it("stores local development objects under opaque contained keys", async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), "rahal-private-storage-"));
    vi.stubEnv("PRIVATE_DOCUMENT_STORAGE_PATH", temporaryRoot);
    const storage = new PrivateDocumentStorage();
    const bytes = Buffer.from("%PDF-test-contract");

    const key = await storage.put("reservation-1", "application/pdf", bytes, "contracts");

    expect(key).toMatch(/^contracts\/reservation-1\/[a-f0-9-]{36}\.pdf$/);
    await expect(storage.read(key)).resolves.toEqual(bytes);
    await storage.remove(key);
    await expect(storage.read(key)).rejects.toThrow(
      "The protected document object is temporarily unavailable.",
    );
    await expect(storage.read("../outside.pdf")).rejects.toThrow(
      "The private document key is invalid.",
    );
  });

  it("uses encrypted private S3 operations when object storage is configured", async () => {
    vi.stubEnv("PRIVATE_DOCUMENT_STORAGE_PATH", "");
    vi.stubEnv("PRIVATE_S3_REGION", "eu-central-1");
    vi.stubEnv("PRIVATE_S3_BUCKET", "rahal-private");
    vi.stubEnv("PRIVATE_S3_ACCESS_KEY_ID", "test-access");
    vi.stubEnv("PRIVATE_S3_SECRET_ACCESS_KEY", "test-secret");
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => Uint8Array.from([1, 2, 3]) },
      } as never);
    const storage = new PrivateDocumentStorage();

    const key = await storage.put(
      "reservation-2",
      "application/pdf",
      Buffer.from("%PDF-private"),
      "contracts",
    );
    const firstCommand = send.mock.calls[0]?.[0];
    expect(firstCommand).toBeInstanceOf(PutObjectCommand);
    expect((firstCommand as PutObjectCommand).input).toMatchObject({
      Bucket: "rahal-private",
      Key: key,
      ContentType: "application/pdf",
      ServerSideEncryption: "AES256",
      CacheControl: "private, no-store",
    });

    await expect(storage.read(key)).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectCommand);
  });
});
