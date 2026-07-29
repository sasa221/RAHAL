import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { loadApiConfig, type ApiConfig } from "../config";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

@Injectable()
export class PrivateDocumentStorage {
  private readonly config: ApiConfig = loadApiConfig();
  private s3Client?: S3Client;

  async put(reservationId: string, mimeType: string, bytes: Buffer, namespace = "reservations") {
    const storageKey = this.createStorageKey(reservationId, mimeType, namespace);
    if (this.config.privateDocumentStorageS3) {
      await this.putS3(storageKey, mimeType, bytes);
      return storageKey;
    }

    const root = this.localRoot();
    const folder = resolve(root, namespace, reservationId);
    await mkdir(folder, { recursive: true });
    const name = storageKey.split("/").at(-1)!;
    const finalPath = resolve(folder, name);
    const temporaryPath = `${finalPath}.uploading`;
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, finalPath);
    return storageKey;
  }

  async remove(storageKey: string) {
    this.assertStorageKey(storageKey);
    if (this.config.privateDocumentStorageS3) {
      try {
        await this.client().send(
          new DeleteObjectCommand({
            Bucket: this.config.privateDocumentStorageS3.bucket,
            Key: storageKey,
          }),
        );
      } catch {
        throw this.unavailable();
      }
      return;
    }
    await rm(this.resolveLocalKey(storageKey), { force: true });
  }

  async read(storageKey: string) {
    this.assertStorageKey(storageKey);
    if (this.config.privateDocumentStorageS3) {
      try {
        const response = await this.client().send(
          new GetObjectCommand({
            Bucket: this.config.privateDocumentStorageS3.bucket,
            Key: storageKey,
          }),
        );
        if (!response.Body) throw new Error("Object body missing");
        const bytes = Buffer.from(await response.Body.transformToByteArray());
        if (bytes.length > 12 * 1024 * 1024) throw new Error("Object exceeds protected size limit");
        return bytes;
      } catch {
        throw this.unavailable();
      }
    }

    try {
      return await readFile(this.resolveLocalKey(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw this.unavailable();
      }
      throw error;
    }
  }

  async readiness() {
    if (this.config.privateDocumentStorageS3) {
      try {
        await this.client().send(
          new HeadBucketCommand({ Bucket: this.config.privateDocumentStorageS3.bucket }),
        );
        return;
      } catch {
        throw this.unavailable();
      }
    }
    await mkdir(this.localRoot(), { recursive: true });
  }

  private async putS3(storageKey: string, mimeType: string, bytes: Buffer) {
    try {
      await this.client().send(
        new PutObjectCommand({
          Bucket: this.config.privateDocumentStorageS3!.bucket,
          Key: storageKey,
          Body: bytes,
          ContentType: mimeType,
          ServerSideEncryption: "AES256",
          CacheControl: "private, no-store",
        }),
      );
    } catch {
      throw this.unavailable();
    }
  }

  private client() {
    const storage = this.config.privateDocumentStorageS3;
    if (!storage) throw this.unavailable();
    this.s3Client ??= new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
      credentials: {
        accessKeyId: storage.accessKeyId,
        secretAccessKey: storage.secretAccessKey,
      },
    });
    return this.s3Client;
  }

  private createStorageKey(reservationId: string, mimeType: string, namespace: string) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(reservationId)) {
      throw new ServiceUnavailableException("The private document owner is invalid.");
    }
    if (!["reservations", "contracts"].includes(namespace)) {
      throw new ServiceUnavailableException("The private document namespace is invalid.");
    }
    return `${namespace}/${reservationId}/${randomUUID()}${extensions[mimeType] ?? ""}`;
  }

  private assertStorageKey(storageKey: string) {
    if (
      !/^(reservations|contracts)\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9-]{36}\.(jpg|png|pdf)$/.test(
        storageKey,
      )
    ) {
      throw new ServiceUnavailableException("The private document key is invalid.");
    }
  }

  private resolveLocalKey(storageKey: string) {
    const root = this.localRoot();
    const resolved = resolve(root, storageKey);
    const relativePath = relative(root, resolved);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new ServiceUnavailableException("The private document key is invalid.");
    }
    return resolved;
  }

  private localRoot() {
    if (!this.config.privateDocumentStoragePath) {
      throw new ServiceUnavailableException(
        "Private document storage is not configured for this environment.",
      );
    }
    return resolve(process.cwd(), this.config.privateDocumentStoragePath);
  }

  private unavailable() {
    return new ServiceUnavailableException(
      "The protected document object is temporarily unavailable.",
    );
  }
}
