import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { loadApiConfig } from "../config";

@Injectable()
export class DocumentScanService {
  private readonly config = loadApiConfig();

  async assertClean(bytes: Buffer, mimeType: string) {
    const scanner = this.config.documentScan;
    if (!scanner) {
      if (this.config.production) {
        throw new ServiceUnavailableException("Protected document scanning is unavailable.");
      }
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    timeout.unref();
    try {
      const signature = createHmac("sha256", scanner.secret).update(bytes).digest("hex");
      const response = await fetch(scanner.url, {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-rahal-content-type": mimeType,
          "x-rahal-signature": `sha256=${signature}`,
        },
        body: Uint8Array.from(bytes),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException("Protected document scanning is unavailable.");
      }
      const result = (await response.json()) as { clean?: boolean };
      if (result.clean !== true) {
        throw new BadRequestException("The uploaded document did not pass the security scan.");
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException("Protected document scanning is unavailable.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
