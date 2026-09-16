import { describe, expect, it } from "vitest";
import { EventType, type ActionSpec } from "@glt/contracts";
import { digestOf } from "./digest.ts";
import { GltError } from "./errors.ts";
import { buildPlan } from "./plan.ts";
import { hashAuditRecord } from "./audit-chain.ts";
import {
  SHADOW_STEP,
  assertNoExternalEffect,
  requireDryRunBeforeWrite,
  shadowAuditRecord,
  shadowRun,
  shadowedPlan,
  type ShadowReport,
} from "./shadow.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const TYPECHECK: ActionSpec = {
  id: "typecheck",
  revision: 1,
  capabilities: ["typecheck"],
  risk_class: "read",
};

describe("DEV-31 shadow runner", () => {
  it("is the DEV-31 step", () => {
    expect(SHADOW_STEP).toBe("glt.dev.31");
  });

  it("INV-06 a shadow run reports no external effect", () => {
    const report = shadowRun({ built: built(), catalog: [TYPECHECK] });
    expect(report.state).toBe("dry_run");
    expect(report.effects).toEqual([]);
    expect(report.actions.every((action) => action.effects.length === 0)).toBe(true);
    expect(report.actions[0]?.risk).toBe("read");
    assertNoExternalEffect(report);
    expect(shadowedPlan(built(), report).state).toBe("dry_run");
  });

  it("INV-06 a claimed external effect is rejected", () => {
    const report = forged({ kind: "write_file", target: "/tmp/x" });
    expectThrown(() => assertNoExternalEffect(report), "INV-06");
    expectThrown(() => shadowAuditRecord({
      report,
      record_id: "aud-shadow-1",
      prev_hash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      timestamp: "2026-08-14T10:00:00Z",
    }), "INV-06");
  });

  it("INV-06 write without a dry-run of the same envelope is denied", () => {
    const report = shadowRun({ built: built(), catalog: [TYPECHECK] });
    expectThrown(
      () => requireDryRunBeforeWrite({ risk: "write", envelope_digest: report.envelope_digest }),
      "INV-06",
    );
    expectThrown(
      () =>
        requireDryRunBeforeWrite({
          risk: "write",
          envelope_digest: report.envelope_digest,
          dryRun: { envelope_digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111", state: "dry_run" },
        }),
      "INV-06",
    );
    requireDryRunBeforeWrite({
      risk: "write",
      envelope_digest: report.envelope_digest,
      dryRun: { envelope_digest: report.envelope_digest, state: "dry_run" },
    });
    requireDryRunBeforeWrite({ risk: "read", envelope_digest: report.envelope_digest });
  });

  it("seals the dry-run as an audit record", () => {
    const report = shadowRun({ built: built(), catalog: [TYPECHECK] });
    const prev = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    const record = shadowAuditRecord({
      report,
      record_id: "aud-shadow-1",
      prev_hash: prev,
      timestamp: "2026-08-14T10:00:00Z",
    });
    expect(record.event_type).toBe(EventType.ActionStarted);
    expect(record.payload_digest).toBe(digestOf(report));
    expect(record.record_hash).toBe(hashAuditRecord({ record_id: record.record_id, prev_hash: prev }));
  });
});

function built() {
  return buildPlan({
    plan_id: "plan-shadow",
    catalog: [TYPECHECK],
    actions: [{ action_id: "typecheck", depends_on: [] }],
    digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
  });
}

function forged(effect: { kind: string; target: string }): ShadowReport {
  const report = shadowRun({ built: built(), catalog: [TYPECHECK] });
  return { ...report, effects: [effect] };
}

function expectThrown(run: () => void, invariant: string): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GltError);
  expect((caught as GltError).invariant).toBe(invariant);
}
