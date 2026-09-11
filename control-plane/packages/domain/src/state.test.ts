import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "./errors.ts";
import {
  asObservation,
  axisKeys,
  bindAxis,
  evaluateState,
  healthExit,
  type EvaluateStateInput,
  type NodeStateDraft,
} from "./state.ts";

const TTL = 3600;

function draft(id: string, extra: Partial<NodeStateDraft> = {}): NodeStateDraft {
  return { id, ...extra };
}

function base(overrides: Partial<EvaluateStateInput> = {}): EvaluateStateInput {
  return {
    nodes: [draft("glt.controlplane.compiler")],
    ageSeconds: 0,
    staleAfterSeconds: TTL,
    ...overrides,
  };
}

describe("DEV-16 state evaluator", () => {
  it("axes stay independent when only runtime changes", () => {
    const quiet = evaluateState(base());
    const live = evaluateState(
      base({
        nodes: [
          draft("glt.controlplane.compiler", {
            runtime: { value: "healthy", provenance: "observation" },
          }),
        ],
      }),
    );
    expect(axisKeys()).toEqual([
      "verification",
      "runtime",
      "freshness",
      "change",
      "coverage",
      "delivery",
      "conflict",
    ]);
    expect(quiet.nodes[0]!.axes.verification).toEqual(live.nodes[0]!.axes.verification);
    expect(quiet.nodes[0]!.axes.freshness).toEqual(live.nodes[0]!.axes.freshness);
    expect(quiet.nodes[0]!.axes.change).toEqual(live.nodes[0]!.axes.change);
    expect(quiet.nodes[0]!.axes.coverage).toEqual(live.nodes[0]!.axes.coverage);
    expect(quiet.nodes[0]!.axes.delivery).toEqual(live.nodes[0]!.axes.delivery);
    expect(quiet.nodes[0]!.axes.conflict).toEqual(live.nodes[0]!.axes.conflict);
    expect(quiet.nodes[0]!.axes.runtime.value).toBe("unknown");
    expect(live.nodes[0]!.axes.runtime.value).toBe("healthy");
  });

  it("PROTO-12 unknown runtime is not healthy", () => {
    const report = evaluateState(base());
    const runtime = report.nodes[0]!.axes.runtime;
    expect(runtime.value).toBe("unknown");
    expect(runtime.value).not.toBe("healthy");
    expect(asObservation(runtime)).toBeUndefined();
    expect(healthExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("INV-04 an inferred fact is not an observation", () => {
    const inferred = bindAxis({ value: "healthy" as const, provenance: "inference" }, "unknown");
    expect(inferred.value).toBe("healthy");
    expect(inferred.provenance).toBe("inference");
    expect(inferred.provenance).not.toBe("observation");
    expect(asObservation(inferred)).toBeUndefined();

    const report = evaluateState(
      base({
        nodes: [
          draft("glt.controlplane.compiler", {
            runtime: { value: "healthy", provenance: "inference" },
          }),
        ],
      }),
    );
    expect(report.nodes[0]!.axes.runtime.provenance).toBe("inference");
    expect(asObservation(report.nodes[0]!.axes.runtime)).toBeUndefined();
    expect(healthExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("the evaluator rejects createEvidence instead of inventing it", () => {
    expect(() => evaluateState(base({ createEvidence: true }))).toThrow(GltError);
    try {
      evaluateState(base({ createEvidence: true }));
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).code).toBe(ExitCode.Usage);
      expect((error as GltError).message).toContain("does not create evidence");
    }
  });

  it("a stale age is freshness stale and is not treated as current", () => {
    const report = evaluateState(base({ ageSeconds: TTL + 1 }));
    expect(report.snapshot_freshness).toBe("stale");
    expect(report.nodes[0]!.axes.freshness.value).toBe("stale");
    expect(report.write_blocked).toBe(true);
    expect(report.actions_above).toBe("read");
    expect(healthExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("PROTO-11 a stale observed runtime is excluded from current health", () => {
    const report = evaluateState(
      base({
        nodes: [
          draft("glt.controlplane.compiler", {
            runtime: { value: "healthy", provenance: "observation", ageSeconds: TTL + 1 },
          }),
        ],
      }),
    );
    expect(report.nodes[0]!.axes.runtime.value).toBe("unknown");
    expect(asObservation(report.nodes[0]!.axes.runtime)).toBeUndefined();
    expect(report.known_unknowns.some((item) => item.kind === "missing_runtime")).toBe(true);
    expect(healthExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("two authoritative digests of one fact class are source_conflict", () => {
    const report = evaluateState(
      base({
        nodes: [
          draft("glt.controlplane.compiler", {
            runtime: { value: "healthy", provenance: "observation" },
          }),
        ],
        claims: [
          { fact_class: "observed-runtime", digest: "sha256:aaa", ref: "collector-a" },
          { fact_class: "observed-runtime", digest: "sha256:bbb", ref: "collector-b" },
        ],
      }),
    );
    expect(report.conflict).toBe("source_conflict");
    expect(report.nodes[0]!.axes.conflict.value).toBe("source_conflict");
    expect(report.write_blocked).toBe(true);
    expect(asObservation(report.nodes[0]!.axes.runtime)).toBe("healthy");
    expect(healthExit(report)).toBe(ExitCode.SourceConflict);
  });

  it("an observed healthy runtime on a current snapshot is success", () => {
    const report = evaluateState(
      base({
        nodes: [
          draft("glt.controlplane.compiler", {
            runtime: { value: "healthy", provenance: "observation" },
          }),
        ],
      }),
    );
    expect(asObservation(report.nodes[0]!.axes.runtime)).toBe("healthy");
    expect(report.write_blocked).toBe(false);
    expect(report.conflict).toBe("none");
    expect(healthExit(report)).toBe(ExitCode.Success);
  });
});
