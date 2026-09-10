import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "@glt/contracts";
import { COMMANDS, run } from "@glt/cli";
import { collectCiFromPath, runCiCollector } from "@glt/collectors";

const FIXTURE = join(
  REPO_ROOT,
  "control-plane",
  "packages",
  "collectors",
  "fixtures",
  "ci-report-fresh.json",
);

describe("DEV-14 ci collector against a fixture report", () => {
  it("PROTO-11 a fixture at as-of within TTL is current", () => {
    const report = collectCiFromPath({
      report: FIXTURE,
      asOf: "2026-09-10T10:30:00Z",
    });
    expect(report.commit).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(report.freshness).toBe("current");
    expect(report.coverage).toBe("established");
    expect(report.current_checks).toHaveLength(2);
  });

  it("PROTO-11 the same fixture two hours later is stale and current_checks is empty", () => {
    const report = collectCiFromPath({
      report: FIXTURE,
      asOf: "2026-09-10T12:00:01Z",
    });
    expect(report.freshness).toBe("stale");
    expect(report.checks).toHaveLength(2);
    expect(report.current_checks).toEqual([]);
  });

  it("PROTO-12 runner without commit and without a report is evidence-insufficient", () => {
    const result = runCiCollector([], { repoRoot: REPO_ROOT });
    expect(result.code).toBe(5);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("PROTO-12");
  });

  it("missing report file with a commit pin is partial", () => {
    const report = collectCiFromPath({
      report: "control-plane/packages/collectors/fixtures/does-not-exist.json",
      commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      asOf: "2026-09-10T10:30:00Z",
    });
    expect(report.coverage).toBe("partial");
    expect(report.known_unknowns.some((item) => item.kind === "missing_report")).toBe(true);
  });

  it("S-10 glt collect is not a command", async () => {
    expect(COMMANDS.some((c) => c.name.includes("collect"))).toBe(false);
    const result = await run(["collect"]);
    expect(result.code).not.toBe(0);
  });
});
