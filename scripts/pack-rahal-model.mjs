import { Buffer } from "node:buffer";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/pack-rahal-model.mjs <input.glb> <output.rahal3d>");
}

const keyParts = ["RAHAL", "cinematic", "Egypt", "drive", "2026"];
const key = createHash("sha256").update(keyParts.join(":"), "utf8").digest();
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const source = await readFile(inputPath);
const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
const authTag = cipher.getAuthTag();

await writeFile(
  outputPath,
  Buffer.concat([Buffer.from("RHL3D1", "ascii"), iv, encrypted, authTag]),
);
