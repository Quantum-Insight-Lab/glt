import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "@glt/domain";
import {
  ciFactsExit,
  collectCiFacts,
  type CiCollectorReport,
} from "./ci.ts";
import { reportHasPolicyFields, requireMaterializedPlane } from "./plane.ts";

const TTL = 3600;
const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const AS_OF = "2026-09-10T11:00:00Z";
const FRESH_AT = "2026-09-10T10:00:00Z";
const STALE_AT = "2026-09-10T09:00:00Z";

const CHECKS = [
  { name: "tests", conclusion: "success" },
  { name: "typecheck", conclusion: "failure" },
];

describe("DEV-14 ci attestations collector", () => {
  it("PROTO-12 a report without commit is not accepted", () => {
    const report = collectCiFacts({
      asOf: AS_OF,
      producedAt: FRESH_AT,
      checks: CHECKS,
      freshnessTtlSeconds: TTL,
    });
    expect(report.coverage).toBe("unknown");
    expect(report.checks).toEqual([]);
    expect(report.current_checks).toEqual([]);
    expect(report.known_unknowns.some((item) => item.kind === "missing_commit")).toBe(true);
    expect(ciFactsExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("PROTO-11 a report older than the TTL is stale and not current", () => {
    const report = collectCiFacts({
      commit: SHA,
      asOf: AS_OF,
      producedAt: STALE_AT,
      checks: CHECKS,
      freshnessTtlSeconds: TTL,
    });
    expect(report.freshness).toBe("stale");
    expect(report.age_seconds).toBe(7200);
    expect(report.checks.map((item) => item.name)).toEqual(["tests", "typecheck"]);
    expect(report.current_checks).toEqual([]);
    expect(report.coverage).toBe("established");
    expect(ciFactsExit(report)).toBe(ExitCode.Success);
  });

  it("PROTO-11 a fresh report keeps checks in current_checks", () => {
    const report = collectCiFacts({
      commit: SHA,
      asOf: AS_OF,
      producedAt: FRESH_AT,
      checks: CHECKS,
      freshnessTtlSeconds: TTL,
    });
    expect(report.freshness).toBe("current");
    expect(report.current_checks).toEqual(report.checks);
    expect(report.checks.some((item) => item.conclusion === "failure")).toBe(true);
    expect(reportHasPolicyFields(report)).toBe(false);
  });

  it("collection failure with a commit pin is partial, not established", () => {
    const report = collectCiFacts({
      commit: SHA,
      asOf: AS_OF,
      producedAt: FRESH_AT,
      freshnessTtlSeconds: TTL,
      unknowns: [{ kind: "missing_report", ref: "report" }],
    });
    expect(report.coverage).toBe("partial");
    expect(report.known_unknowns.some((item) => item.kind === "missing_report")).toBe(true);
    expect(report.known_unknowns.some((item) => item.kind === "missing_checks")).toBe(true);
    expect(report.current_checks).toEqual([]);
    expect(ciFactsExit(report)).toBe(ExitCode.Success);
  });

  it("ci collector facts stay on the materialized plane; intended is rejected", () => {
    expect(() => requireMaterializedPlane("intended")).toThrow(GltError);
    expect(() =>
      collectCiFacts({
        commit: SHA,
        asOf: AS_OF,
        plane: "intended",
        freshnessTtlSeconds: TTL,
      }),
    ).toThrow(GltError);
  });

  it("a policy field on a fixture fails the no-policy check", () => {
    const report = collectCiFacts({
      commit: SHA,
      asOf: AS_OF,
      producedAt: FRESH_AT,
      checks: CHECKS,
      freshnessTtlSeconds: TTL,
    });
    const polluted = { ...report, required_checks: ["tests"] };
    expect(reportHasPolicyFields(polluted as CiCollectorReport)).toBe(true);
    expect(reportHasPolicyFields(report)).toBe(false);
  });
});
