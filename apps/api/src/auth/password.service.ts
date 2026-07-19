import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;

function scrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

@Injectable()
export class PasswordService {
  async hash(password: string) {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt);
    return [
      "scrypt",
      cost,
      blockSize,
      parallelization,
      salt.toString("base64url"),
      derivedKey.toString("base64url"),
    ].join("$");
  }

  async verify(password: string, encoded: string) {
    const [algorithm, encodedCost, encodedBlockSize, encodedParallelization, saltValue, hashValue] =
      encoded.split("$");
    if (
      algorithm !== "scrypt" ||
      Number(encodedCost) !== cost ||
      Number(encodedBlockSize) !== blockSize ||
      Number(encodedParallelization) !== parallelization ||
      !saltValue ||
      !hashValue
    ) {
      return false;
    }

    const expected = Buffer.from(hashValue, "base64url");
    if (expected.length !== keyLength) return false;
    const actual = await scrypt(password, Buffer.from(saltValue, "base64url"));
    return timingSafeEqual(actual, expected);
  }
}
