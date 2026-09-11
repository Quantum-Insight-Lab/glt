import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "./errors.ts";
import {
  actionPermitted,
  assessDegradation,
  currentSignal,
  detectFactConflict,
  writeBlocked,
} from "./degrade.ts";
import { snapshotIsStale } from "./freshness.ts";

const SHORT_TTL = 10;
const LONG_TTL = 12;

describe("DEV-17 freshness and conflicts", () => {
  it("S-8 the write-block threshold is the caller-supplied limit, not a domain literal", () => {
    const age = 11;
    expect(snapshotIsStale(age, SHORT_TTL)).toBe(true);
    expect(snapshotIsStale(age, LONG_TTL)).toBe(false);
    expect(currentSignal(signal("healthy", age), SHORT_TTL)).toBeUndefined();
    expect(currentSignal(signal("healthy", age), LONG_TTL)).toEqual({
      value: "healthy",
      provenance: "observation",
    });
    expect(writeBlocked(snapshotIsStale(age, SHORT_TTL), false)).toBe(true);
    expect(writeBlocked(snapshotIsStale(age, LONG_TTL), false)).toBe(false);
  });

  it("PROTO-11 an expired signal is excluded from the current observation", () => {
    const live = currentSignal(signal("healthy", SHORT_TTL), SHORT_TTL);
    const expired = currentSignal(signal("healthy", SHORT_TTL + 1), SHORT_TTL);
    expect(live).toEqual({ value: "healthy", provenance: "observation" });
    expect(expired).toBeUndefined();
    expect(expired).not.toEqual(live);
  });

  it("stale blocks write and runner and leaves read permitted", () => {
    const stale = assessDegradation({ stale: true, conflict: false });
    expect(stale.write_blocked).toBe(true);
    expect(stale.actions_above).toBe("read");
    expect(actionPermitted("read", { stale: true, conflict: false })).toBe(true);
    expect(actionPermitted("write", { stale: true, conflict: false })).toBe(false);
    expect(actionPermitted("runner", { stale: true, conflict: false })).toBe(false);
  });

  it("source_conflict blocks everything above read and does not pick a winner", () => {
    const found = detectFactConflict([
      { fact_class: "observed-runtime", digest: "sha256:aaa", ref: "collector-a" },
      { fact_class: "observed-runtime", digest: "sha256:bbb", ref: "collector-b" },
    ]);
    expect(found.conflict).toBe("source_conflict");
    expect(found.refs).toContain("observed-runtime");
    expect(found.refs).toContain("collector-a");
    expect(found.refs).toContain("collector-b");
    expect(found.refs.some((ref) => ref.startsWith("sha256:"))).toBe(false);

    const ceiling = assessDegradation({ stale: false, conflict: true });
    expect(ceiling.write_blocked).toBe(true);
    expect(actionPermitted("read", { stale: false, conflict: true })).toBe(true);
    expect(actionPermitted("write", { stale: false, conflict: true })).toBe(false);
    expect(actionPermitted("runner", { stale: false, conflict: true })).toBe(false);
  });

  it("agreeing digests of one fact class are not a conflict", () => {
    const found = detectFactConflict([
      { fact_class: "observed-runtime", digest: "sha256:aaa", ref: "collector-a" },
      { fact_class: "observed-runtime", digest: "sha256:aaa", ref: "collector-b" },
    ]);
    expect(found.conflict).toBe("none");
    expect(found.refs).toEqual([]);
    expect(writeBlocked(false, false)).toBe(false);
  });

  it("a missing fact class is a contract error, not a guessed conflict", () => {
    expect(() => detectFactConflict([{ fact_class: "  ", digest: "sha256:aaa", ref: "x" }])).toThrow(
      GltError,
    );
    try {
      detectFactConflict([{ fact_class: "  ", digest: "sha256:aaa", ref: "x" }]);
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).code).toBe(ExitCode.ContractInvalid);
    }
  });
});

function signal(value: "healthy", ageSeconds: number) {
  return { value, provenance: "observation" as const, ageSeconds };
}
