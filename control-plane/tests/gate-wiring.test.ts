import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson } from "@glt/contracts";
import { COMMANDS, run } from "@glt/cli";
import { computeImpactFromPaths } from "@glt/impact";
import {
  evaluateGate,
  gatedChecksFromSnapshot,
  gateEvaluationExit,
  type CompiledSnapshot,
} from "@glt/domain";

const GOLDEN_SNAPSHOT = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const GATE = "glt.controlplane.gate.bootstrap";
const CHECK = "glt.controlplane.check";

describe("DEV-15 checks and gates wiring against the bootstrap slice", () => {
  it("PROTO-12 golden snapshot with required checks and no signals is not passed", () => {
    const snapshot = loadJson<CompiledSnapshot>(GOLDEN_SNAPSHOT);
    const impact = computeImpactFromPaths({ snapshot: GOLDEN_SNAPSHOT });
    const gated = gatedChecksFromSnapshot(snapshot.edges, GATE);
    expect(gated).toEqual([CHECK]);
    expect(impact.required_checks).toEqual([CHECK]);
    expect(impact.release?.gate).toBe(GATE);

    const report = evaluateGate({
      gate_id: GATE,
      snapshot_digest: snapshot.digest,
      gated_checks: gated,
      required_checks: impact.required_checks,
    });
    expect(report.state).toBe("unknown");
    expect(report.state).not.toBe("passed");
    expect(report.evidence.some((item) => item.kind === "check_report")).toBe(true);
    expect(gateEvaluationExit(report)).toBe(5);
  });

  it("a failed current check blocks the bootstrap gate", () => {
    const snapshot = loadJson<CompiledSnapshot>(GOLDEN_SNAPSHOT);
    const report = evaluateGate({
      gate_id: GATE,
      snapshot_digest: snapshot.digest,
      gated_checks: gatedChecksFromSnapshot(snapshot.edges, GATE),
      required_checks: [CHECK],
      signals: [{ check_id: CHECK, state: "failed" }],
    });
    expect(report.state).toBe("blocked");
    expect(report.evidence).toEqual([{ kind: "check_report", ref: CHECK, check_state: "failed" }]);
  });

  it("INV-03 two evaluations of the same pin are identical", () => {
    const snapshot = loadJson<CompiledSnapshot>(GOLDEN_SNAPSHOT);
    const input = {
      gate_id: GATE,
      snapshot_digest: snapshot.digest,
      gated_checks: gatedChecksFromSnapshot(snapshot.edges, GATE),
      required_checks: [CHECK],
      signals: [{ check_id: CHECK, state: "passed" }] as const,
    };
    expect(evaluateGate(input)).toEqual(evaluateGate(input));
  });

  it("S-10 glt gate is not a command", async () => {
    expect(COMMANDS.some((c) => c.name.includes("gate"))).toBe(false);
    const result = await run(["gate"]);
    expect(result.code).not.toBe(0);
  });
});
