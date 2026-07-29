import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { loadApiConfig } from "../config";

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

@Injectable()
export class PushSubscriptionCryptoService {
  private readonly config = loadApiConfig();

  available() {
    return Boolean(this.config.webPush);
  }

  publicKey() {
    return this.config.webPush?.publicKey ?? null;
  }

  encrypt(userId: string, subscription: StoredPushSubscription) {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(userId));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(subscription), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  decrypt(userId: string, value: string): StoredPushSubscription {
    const [version, ivValue, tagValue, encryptedValue] = value.split(".");
    if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
      throw new ServiceUnavailableException("The push subscription cannot be read.");
    }
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key(),
        Buffer.from(ivValue, "base64url"),
      );
      decipher.setAAD(Buffer.from(userId));
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
      const decoded = Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      return JSON.parse(decoded) as StoredPushSubscription;
    } catch {
      throw new ServiceUnavailableException("The push subscription cannot be read.");
    }
  }

  private key() {
    const value = this.config.webPush?.encryptionKey;
    if (!value) throw new ServiceUnavailableException("Browser push is not configured.");
    return Buffer.from(value, "base64url");
  }
}
