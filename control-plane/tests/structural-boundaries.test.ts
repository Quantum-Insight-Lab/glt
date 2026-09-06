import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

interface DepcruiseReport {
  summary: {
    error: number;
    warn: number;
    violations: { rule: { name: string; severity: string }; from: string; to: string }[];
  };
}

function cruise(): DepcruiseReport {
  const cmd =
    "pnpm exec depcruise control-plane/packages --config .dependency-cruiser.cjs --output-type json";
  try {
    return JSON.parse(execSync(cmd, { cwd: REPO, encoding: "utf8", stdio: "pipe" }));
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout;
    if (!stdout) throw error;
    return JSON.parse(stdout);
  }
}

const report = cruise();
const violationsOf = (prefix: string) =>
  report.summary.violations.filter((v) => v.rule.name.startsWith(prefix));

const describeViolations = (prefix: string) =>
  violationsOf(prefix)
    .map((v) => `${v.rule.name}: ${v.from} -> ${v.to}`)
    .join("\n");

describe("structural invariants enforced by dependency-cruiser", () => {
  it("S-1 domain performs no I/O and has no third-party or sibling dependency", () => {
    expect(describeViolations("s1-")).toBe("");
  });

  it("S-2 imports between packages follow the declared direction only", () => {
    expect(describeViolations("s2-")).toBe("");
  });

  it("S-5 a derived artifact never writes to the source it was derived from", () => {
    expect(describeViolations("s5-")).toBe("");
  });

  it("S-6 the import graph is acyclic", () => {
    expect(describeViolations("s6-")).toBe("");
  });

  it("reports zero error-severity violations overall", () => {
    expect(report.summary.error, describeViolations("")).toBe(0);
  });
});
