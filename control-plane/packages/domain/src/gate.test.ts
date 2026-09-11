import { describe, expect, it } from "vitest";
import { EVENT_SCHEMA_VERSION, EventType } from "@glt/contracts";
import { ExitCode, GltError } from "./errors.ts";
import {
  evaluateGate,
  gatedChecks,
  gateEvaluationExit,
  type EvaluateGateInput,
} from "./gate.ts";

const GATE = "glt.controlplane.gate.bootstrap";
const CHECK = "glt.controlplane.check";
const DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const GATES_EDGE = {
  from: GATE,
  to: CHECK,
  relation: "gates",
};

function base(overrides: Partial<EvaluateGateInput> = {}): EvaluateGateInput {
  return {
    gate_id: GATE,
    snapshot_digest: DIGEST,
    gated_checks: [CHECK],
    required_checks: [CHECK],
    ...overrides,
  };
}

describe("DEV-15 gate evaluation", () => {
  it("PROTO-12 a required check without a signal is unknown, not passed", () => {
    const report = evaluateGate(base());
    expect(report.state).toBe("unknown");
    expect(report.state).not.toBe("passed");
    expect(report.evidence).toEqual([{ kind: "check_report", ref: CHECK, check_state: "unknown" }]);
    expect(gateEvaluationExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("a required pending check moves the gate to pending", () => {
    const report = evaluateGate(
      base({ signals: [{ check_id: CHECK, state: "pending" }] }),
    );
    expect(report.state).toBe("pending");
    expect(report.evidence).toEqual([{ kind: "check_report", ref: CHECK, check_state: "pending" }]);
    expect(gateEvaluationExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("a failed gated check moves the gate to blocked", () => {
    const report = evaluateGate(
      base({ signals: [{ check_id: CHECK, state: "failed" }] }),
    );
    expect(report.state).toBe("blocked");
    expect(report.evidence).toEqual([{ kind: "check_report", ref: CHECK, check_state: "failed" }]);
    expect(gateEvaluationExit(report)).toBe(ExitCode.PolicyDenied);
  });

  it("passed required checks close the gate with check-report evidence", () => {
    const report = evaluateGate(
      base({ signals: [{ check_id: CHECK, state: "passed" }] }),
    );
    expect(report.state).toBe("passed");
    expect(report.evidence).toEqual([
      { kind: "check_report", ref: CHECK, check_state: "passed" },
      { kind: "closed_gate", ref: GATE },
    ]);
    expect(report.event_type).toBe(EventType.GateEvaluated);
    expect(report.schema_version).toBe(EVENT_SCHEMA_VERSION[EventType.GateEvaluated]);
    expect(gateEvaluationExit(report)).toBe(ExitCode.Success);
  });

  it("an explicit block record blocks even when checks passed", () => {
    const report = evaluateGate(
      base({
        signals: [{ check_id: CHECK, state: "passed" }],
        explicit_block: "block-001",
      }),
    );
    expect(report.state).toBe("blocked");
    expect(report.evidence).toEqual([{ kind: "explicit_block", ref: "block-001" }]);
  });

  it("v1 rejects merge instead of writing", () => {
    expect(() => evaluateGate(base({ merge: true }))).toThrow(GltError);
    try {
      evaluateGate(base({ merge: true }));
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).code).toBe(ExitCode.Usage);
      expect((error as GltError).message).toContain("evaluates only");
    }
  });

  it("INV-12 LLM-only labels never become gate input", () => {
    const failed = evaluateGate(
      base({
        signals: [{ check_id: CHECK, state: "failed" }],
        llmLabels: ["approved", "release"],
      }),
    );
    const missing = evaluateGate(base({ llmLabels: ["approved"] }));
    expect(failed.state).toBe("blocked");
    expect(missing.state).toBe("unknown");
    expect(missing.state).not.toBe("passed");
  });

  it("gatedChecks reads only gates edges for the named gate", () => {
    expect(
      gatedChecks(
        [
          GATES_EDGE,
          { from: CHECK, to: "glt.controlplane.compiler", relation: "validates" },
          { from: "glt.other.gate", to: "glt.other.check", relation: "gates" },
        ],
        GATE,
      ),
    ).toEqual([CHECK]);
  });
});
