import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { loadApiConfig } from "../config";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

@Injectable()
export class PrivateDocumentStorage {
  private readonly configuredPath = loadApiConfig().privateDocumentStoragePath;

  async put(reservationId: string, mimeType: string, bytes: Buffer) {
    const root = this.root();
    const folder = resolve(root, "reservations", reservationId);
    await mkdir(folder, { recursive: true });
    const name = `${randomUUID()}${extensions[mimeType] ?? ""}`;
    const finalPath = resolve(folder, name);
    const temporaryPath = `${finalPath}.uploading`;
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, finalPath);
    return `reservations/${reservationId}/${name}`;
  }

  async remove(storageKey: string) {
    await rm(this.resolveKey(storageKey), { force: true });
  }

  async read(storageKey: string) {
    return readFile(this.resolveKey(storageKey));
  }

  private resolveKey(storageKey: string) {
    const root = this.root();
    const resolved = resolve(root, storageKey);
    const relativePath = relative(root, resolved);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new ServiceUnavailableException("The private document key is invalid.");
    }
    return resolved;
  }

  private root() {
    if (!this.configuredPath) {
      throw new ServiceUnavailableException(
        "Private document storage is not configured for this environment.",
      );
    }
    return resolve(process.cwd(), this.configuredPath);
  }
}
