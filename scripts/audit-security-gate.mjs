import { spawnSync } from "node:child_process";
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = resolve(repositoryRoot, "config/security-audit-policy.json");
const reportDirectory = resolve(repositoryRoot, ".security-audit-reports");

const severityRanks = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameStrings(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

export function validateAuditReport(report, policy, reportKind, now = new Date()) {
  if (!report?.advisories || typeof report.advisories !== "object") {
    throw new Error(`${reportKind} audit report has no advisories object.`);
  }

  const exceptions = new Map(
    policy.exceptions.map((exception) => [String(exception.advisoryId), exception]),
  );
  const accepted = [];

  for (const [numericId, advisory] of Object.entries(report.advisories)) {
    const exception = exceptions.get(numericId);
    if (!exception) {
      throw new Error(
        `Unlisted ${reportKind} advisory ${advisory.github_advisory_id ?? numericId} (${advisory.module_name}, ${advisory.severity}).`,
      );
    }

    const findingVersions = [...new Set(advisory.findings.map((finding) => finding.version))];
    const findingPaths = advisory.findings.flatMap((finding) => finding.paths);
    const expectedPaths = exception.expectedPaths[reportKind];
    const expiresAt = new Date(`${exception.expiresOn}T23:59:59.999Z`);

    const identityMatches =
      advisory.id === exception.advisoryId &&
      advisory.github_advisory_id === exception.githubAdvisoryId &&
      advisory.module_name === exception.module &&
      advisory.severity === exception.severity &&
      advisory.vulnerable_versions === exception.vulnerableVersions &&
      advisory.patched_versions === exception.patchedVersions;

    if (!identityMatches) {
      throw new Error(`Risk exception identity changed for ${exception.githubAdvisoryId}.`);
    }
    if (!sameStrings(findingVersions, [exception.version])) {
      throw new Error(`Risk exception version changed for ${exception.githubAdvisoryId}.`);
    }
    if (!sameStrings(findingPaths, expectedPaths)) {
      throw new Error(`Dependency path changed for ${exception.githubAdvisoryId}.`);
    }
    if (Number.isNaN(expiresAt.valueOf()) || now > expiresAt) {
      throw new Error(`Risk exception expired for ${exception.githubAdvisoryId}.`);
    }

    accepted.push(exception.githubAdvisoryId);
  }

  const presentIds = new Set(Object.keys(report.advisories));
  for (const exception of policy.exceptions) {
    if (!presentIds.has(String(exception.advisoryId))) {
      throw new Error(
        `Configured exception ${exception.githubAdvisoryId} is no longer present; remove the stale exception.`,
      );
    }
  }

  if (!policy.failOnAnyUnlistedAdvisory) {
    const minimumRank = severityRanks[policy.productionFailureLevel];
    const failing = Object.values(report.advisories).filter(
      (advisory) => severityRanks[advisory.severity] >= minimumRank,
    );
    if (failing.length > accepted.length) {
      throw new Error(`${reportKind} audit contains an advisory at the failure threshold.`);
    }
  }

  return accepted;
}

function runPnpmAudit(arguments_) {
  const pnpmEntry = process.env.npm_execpath;
  const command = pnpmEntry ? process.execPath : "pnpm";
  const commandArguments = pnpmEntry
    ? [pnpmEntry, "audit", ...arguments_, "--json"]
    : ["audit", ...arguments_, "--json"];
  const result = spawnSync(command, commandArguments, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  if (!result.stdout?.trim()) {
    throw new Error(`pnpm audit produced no JSON. ${result.stderr?.trim() ?? ""}`.trim());
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`pnpm audit returned invalid JSON. ${result.stderr?.trim() ?? ""}`.trim());
  }
}

function writeReport(name, report) {
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(resolve(reportDirectory, name), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const productionReport = runPnpmAudit(["--prod"]);
  const fullReport = runPnpmAudit([]);

  writeReport("production.json", productionReport);
  writeReport("full.json", fullReport);

  const productionAccepted = validateAuditReport(productionReport, policy, "production");
  const fullAccepted = validateAuditReport(fullReport, policy, "full");

  console.log(
    `Dependency audit gate passed with one temporary exception: ${productionAccepted.join(", ")}.`,
  );
  console.log(`Full audit exception verification: ${fullAccepted.join(", ")}.`);
  console.log(`Reports: ${reportDirectory}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
