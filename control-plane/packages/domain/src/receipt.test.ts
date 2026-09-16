import { describe, expect, it } from "vitest";
import { EventType } from "@glt/contracts";
import { digestOf } from "./digest.ts";
import { GltError } from "./errors.ts";
import { hashAuditRecord } from "./audit-chain.ts";
import { buildPlan } from "./plan.ts";
import {
  RECEIPT_STEP,
  UNKNOWN_OUTCOME_METRIC,
  assertNotSuccess,
  attemptAuditRecord,
  classifyLostReceipt,
  denyBlindRetry,
  reconcileAuditRecord,
  reconcileOutcome,
  reconciledPlan,
  recordAttempt,
  requireAttemptBeforeEffect,
  type ReconcileReport,
} from "./receipt.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const PREV = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

describe("DEV-33 receipts and reconciliation", () => {
  it("is the DEV-33 step", () => {
    expect(RECEIPT_STEP).toBe("glt.dev.33");
  });

  it("PROTO-16 the attempt is recorded before an external effect", () => {
    const attempt = recordAttempt(pins());
    expect(attempt.recorded_before_effect).toBe(true);
    requireAttemptBeforeEffect({ attempt, attempt_id: attempt.attempt_id });
    const record = attemptAuditRecord({
      attempt,
      record_id: "aud-attempt-1",
      prev_hash: PREV,
      timestamp: "2026-08-14T10:00:00Z",
    });
    expect(record.event_type).toBe(EventType.ActionStarted);
    expect(record.payload_digest).toBe(digestOf(attempt));
    expectThrown(() => requireAttemptBeforeEffect({ attempt_id: attempt.attempt_id }), "PROTO-16");
    expectThrown(
      () => requireAttemptBeforeEffect({ attempt, attempt_id: "other-attempt" }),
      "PROTO-16",
    );
  });

  it("PROTO-16 lost contact after an external write is unknown_outcome, not a retry", () => {
    const attempt = recordAttempt(pins());
    const lost = classifyLostReceipt({ attempt, effect_started: true });
    expect(lost).toBe("unknown_outcome");
    expectThrown(() => denyBlindRetry({ prior: lost, retry: true }), "PROTO-16");
    denyBlindRetry({ prior: lost, retry: false });
    expect(classifyLostReceipt({ attempt, effect_started: false })).toBe("failed");
    expect(
      classifyLostReceipt({
        attempt,
        effect_started: true,
        receipt: { attempt_id: attempt.attempt_id, confirmed: true },
      }),
    ).toBe("succeeded");
  });

  it("INV-07 the reconciled outcome is a new audit record", () => {
    const attempt = recordAttempt(pins());
    const first = attemptAuditRecord({
      attempt,
      record_id: "aud-attempt-1",
      prev_hash: PREV,
      timestamp: "2026-08-14T10:00:00Z",
    });
    const report = reconcileOutcome({
      attempt,
      prior: "unknown_outcome",
      target: { checkable: true, observed: true, idempotency_key: attempt.attempt_id },
    });
    expect(report.outcome).toBe("succeeded");
    expect(report.is_success).toBe(true);
    const second = reconcileAuditRecord({
      report,
      record_id: "aud-reconcile-1",
      prev_hash: first.record_hash,
      timestamp: "2026-08-14T10:01:00Z",
    });
    expect(second.event_type).toBe(EventType.ActionCompleted);
    expect(second.record_id).not.toBe(first.record_id);
    expect(second.prev_hash).toBe(first.record_hash);
    expect(second.record_hash).toBe(
      hashAuditRecord({ record_id: second.record_id, prev_hash: first.record_hash }),
    );
    expect(second.payload_digest).toBe(digestOf(report));
  });

  it("PROTO-16 unknown_outcome is a legal terminal state and is not success", () => {
    const attempt = recordAttempt(pins());
    const report = reconcileOutcome({ attempt, prior: "unknown_outcome" });
    expect(report.outcome).toBe("unknown_outcome");
    expect(report.is_success).toBe(false);
    expect(report.metric).toEqual({ name: UNKNOWN_OUTCOME_METRIC, value: 1 });
    const plan = built();
    expect(reconciledPlan(plan.plan, report).state).toBe("unknown_outcome");
    expectThrown(() => assertNotSuccess(forgedSuccess(report)), "PROTO-16");
    const stillUnknown = reconcileOutcome({
      attempt,
      prior: "unknown_outcome",
      target: { checkable: false, observed: false, idempotency_key: attempt.attempt_id },
    });
    expect(stillUnknown.outcome).toBe("unknown_outcome");
    expect(stillUnknown.is_success).toBe(false);
  });
});

function pins() {
  const plan = built();
  return {
    plan_id: plan.plan.plan_id,
    action_id: "typecheck",
    envelope_digest: plan.plan.envelope_digest,
  };
}

function built() {
  return buildPlan({
    plan_id: "plan-receipt",
    catalog: [{ id: "typecheck", revision: 1, capabilities: ["typecheck"], risk_class: "read" }],
    actions: [{ action_id: "typecheck", depends_on: [] }],
    digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
  });
}

function forgedSuccess(report: ReconcileReport): ReconcileReport {
  return { ...report, is_success: true };
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
