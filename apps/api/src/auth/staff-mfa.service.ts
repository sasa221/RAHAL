import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { loadApiConfig } from "../config";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpPeriodSeconds = 30;
const totpDigits = 6;

@Injectable()
export class StaffMfaService {
  private readonly config = loadApiConfig();
  private readonly encryptionKey = Buffer.from(this.config.mfaEncryptionKey, "base64url");

  generateSecret() {
    return encodeBase32(randomBytes(20));
  }

  encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      "v1",
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  decryptSecret(ciphertext: string) {
    const [version, ivValue, tagValue, encryptedValue] = ciphertext.split(".");
    if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
      throw new Error("Unsupported staff MFA secret format.");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  buildOtpAuthUri(input: { email: string; secret: string }) {
    const issuer = "RAHAL";
    const label = `${issuer}:${input.email}`;
    const query = new URLSearchParams({
      secret: input.secret,
      issuer,
      algorithm: "SHA1",
      digits: String(totpDigits),
      period: String(totpPeriodSeconds),
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
  }

  verifyTotp(
    secret: string,
    code: string,
    lastUsedCounter: bigint | null,
    now = Date.now(),
  ): bigint | null {
    if (!/^\d{6}$/.test(code)) return null;
    const currentCounter = BigInt(Math.floor(now / 1000 / totpPeriodSeconds));
    for (const offset of [-1n, 0n, 1n]) {
      const counter = currentCounter + offset;
      if (lastUsedCounter !== null && counter <= lastUsedCounter) continue;
      const expected = generateTotp(secret, counter);
      if (safeEqual(expected, code)) return counter;
    }
    return null;
  }

  generateRecoveryCodes(count = 8) {
    return Array.from({ length: count }, () => {
      const value = randomBytes(8).toString("hex").toUpperCase();
      return `RAHAL-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
    });
  }

  hashRecoveryCode(userId: string, code: string) {
    return createHmac("sha256", this.config.authSecret)
      .update(`${userId}:staff-mfa-recovery:${normalizeRecoveryCode(code)}`)
      .digest("hex");
  }
}

function generateTotp(secret: string, counter: bigint) {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** totpDigits).padStart(totpDigits, "0");
}

function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string) {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, "")) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 staff MFA secret.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
