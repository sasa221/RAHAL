import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "generated",
  "node_modules",
]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const checkedExtensions = new Set([".css", ".js", ".json", ".md", ".ts", ".tsx", ".yml", ".yaml"]);
const forbiddenPatterns = [
  /Rahal Elite/i,
  /Elite Mobility/i,
  /\bUAE\b/i,
  /\bDubai\b/i,
  /\bAED\b/i,
  /airport pickup/i,
  /airport return/i,
  /concierge/i,
  /checkout/i,
  /payment gateway/i,
  /secure transaction/i,
  /\bSMS\b/,
];

function extensionOf(filePath: string) {
  const index = filePath.lastIndexOf(".");
  return index === -1 ? "" : filePath.slice(index);
}

function collectFiles(directory: string, files: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (!ignoredDirectories.has(entry)) {
        collectFiles(absolutePath, files);
      }
      continue;
    }

    if (!ignoredFiles.has(entry) && checkedExtensions.has(extensionOf(entry))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function isPolicyDocument(relativePath: string) {
  return relativePath === "PROJECT_CONTEXT.md" || relativePath.startsWith("docs\\");
}

function isCheckedProductFile(relativePath: string) {
  if (isPolicyDocument(relativePath) || relativePath.includes(".test.")) {
    return false;
  }

  return (
    relativePath === "README.md" ||
    relativePath === "AGENTS.md" ||
    relativePath.startsWith("apps\\") ||
    relativePath.startsWith("packages\\")
  );
}

function isCheckedEncodingFile(relativePath: string) {
  return relativePath === "PROJECT_CONTEXT.md" || isCheckedProductFile(relativePath);
}

describe("static repository content", () => {
  const files = collectFiles(root).map((file) => ({
    absolutePath: file,
    relativePath: relative(root, file),
    text: readFileSync(file, "utf8"),
  }));

  it("does not hard-code old demo years in source files", () => {
    const offenders = files
      .filter(({ relativePath }) => isCheckedProductFile(relativePath))
      .filter(({ text }) => /\b202[34]-\d{2}-\d{2}\b/.test(text))
      .map(({ relativePath }) => relativePath);

    expect(offenders).toEqual([]);
  });

  it("does not reintroduce forbidden legacy product content outside policy docs", () => {
    const offenders = files
      .filter(({ relativePath }) => isCheckedProductFile(relativePath))
      .flatMap(({ relativePath, text }) =>
        forbiddenPatterns
          .filter((pattern) => pattern.test(text))
          .map((pattern) => `${relativePath}: ${pattern}`),
      );

    expect(offenders).toEqual([]);
  });

  it("keeps mojibake markers and replacement characters out of project context and user-facing source", () => {
    const offenders = files
      .filter(({ relativePath }) => isCheckedEncodingFile(relativePath))
      .filter(({ text }) => /[ØÙÂ�]|â€|�/.test(text))
      .map(({ relativePath }) => relativePath);

    expect(offenders).toEqual([]);
  });
});
