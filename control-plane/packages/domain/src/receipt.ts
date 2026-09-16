/**
 * Receipts and reconciliation (DEV-33). Pure: the attempt, receipt and
 * target observation arrive already parsed. No filesystem or network (S-1).
 *
 * An external effect requires a write-ahead attempt (PROTO-16). Lost
 * contact after the effect, without a receipt, is unknown_outcome — not
 * a retry. Reconciliation writes a new audit record (INV-07). unknown
 * is a legal terminal state and is never success.
 *
 * Contract: glt-specpack/docs/SPEC/audit.md
 */

import { EventType, type ActionPlan, type AuditRecord } from "@glt/contracts";
import { hashAuditRecord } from "./audit-chain.ts";
import { digestOf } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";

export const RECEIPT_STEP = "glt.dev.33" as const;

/** Stability metric from docs/OBSERVABILITY/metrics.md. Not a Build gauge. */
export const UNKNOWN_OUTCOME_METRIC = "glt_runner_unknown_outcome_total" as const;

export type AttemptOutcome = "succeeded" | "failed" | "unknown_outcome";

export interface AttemptRecord {
  readonly attempt_id: string;
  readonly plan_id: string;
  readonly action_id: string;
  readonly envelope_digest: string;
  readonly recorded_before_effect: true;
}

export interface TargetObservation {
  readonly checkable: boolean;
  readonly observed: boolean;
  readonly idempotency_key: string;
}

export interface ExternalReceipt {
  readonly attempt_id: string;
  readonly confirmed: boolean;
}

export interface ReconcileReport {
  readonly plan_id: string;
  readonly attempt_id: string;
  readonly envelope_digest: string;
  readonly outcome: AttemptOutcome;
  readonly is_success: boolean;
  readonly metric?: { readonly name: typeof UNKNOWN_OUTCOME_METRIC; readonly value: 1 };
}

export function recordAttempt(input: {
  readonly plan_id: string;
  readonly action_id: string;
  readonly envelope_digest: string;
}): AttemptRecord {
  const planId = asNonEmpty(input.plan_id, "plan_id");
  const actionId = asNonEmpty(input.action_id, "action_id");
  const envelope = asNonEmpty(input.envelope_digest, "envelope_digest");
  return {
    attempt_id: digestOf({ plan_id: planId, action_id: actionId, envelope_digest: envelope }),
    plan_id: planId,
    action_id: actionId,
    envelope_digest: envelope,
    recorded_before_effect: true,
  };
}

export function requireAttemptBeforeEffect(input: {
  readonly attempt?: AttemptRecord;
  readonly attempt_id: string;
}): void {
  const id = asNonEmpty(input.attempt_id, "attempt_id");
  if (
    input.attempt === undefined ||
    input.attempt.recorded_before_effect !== true ||
    input.attempt.attempt_id !== id
  ) {
    throw invariantViolated("PROTO-16", "external effect requires a write-ahead attempt record", [
      id,
    ]);
  }
}

export function classifyLostReceipt(input: {
  readonly attempt: AttemptRecord;
  readonly effect_started: boolean;
  readonly receipt?: ExternalReceipt;
}): AttemptOutcome {
  requireAttemptBeforeEffect({ attempt: input.attempt, attempt_id: input.attempt.attempt_id });
  if (!input.effect_started) return "failed";
  if (input.receipt !== undefined && input.receipt.attempt_id !== input.attempt.attempt_id) {
    throw contractInvalid("receipt attempt_id does not match the write-ahead attempt", [
      input.receipt.attempt_id,
      input.attempt.attempt_id,
    ]);
  }
  if (input.receipt === undefined || !input.receipt.confirmed) return "unknown_outcome";
  return "succeeded";
}

export function denyBlindRetry(input: {
  readonly prior: AttemptOutcome;
  readonly retry: boolean;
}): void {
  if (input.prior === "unknown_outcome" && input.retry) {
    throw invariantViolated("PROTO-16", "unknown_outcome cannot be retried blindly", [
      input.prior,
    ]);
  }
}

export function reconcileOutcome(input: {
  readonly attempt: AttemptRecord;
  readonly prior: AttemptOutcome;
  readonly target?: TargetObservation;
}): ReconcileReport {
  requireAttemptBeforeEffect({ attempt: input.attempt, attempt_id: input.attempt.attempt_id });
  denyBlindRetry({ prior: input.prior, retry: false });
  const outcome = resolveOutcome(input.prior, input.target, input.attempt.attempt_id);
  if (outcome === "succeeded" && input.prior === "unknown_outcome" && input.target === undefined) {
    throw invariantViolated("PROTO-16", "unknown_outcome cannot be claimed as success", [
      input.attempt.attempt_id,
    ]);
  }
  const report: ReconcileReport = {
    plan_id: input.attempt.plan_id,
    attempt_id: input.attempt.attempt_id,
    envelope_digest: input.attempt.envelope_digest,
    outcome,
    is_success: outcome === "succeeded",
    ...(outcome === "unknown_outcome"
      ? { metric: { name: UNKNOWN_OUTCOME_METRIC, value: 1 as const } }
      : {}),
  };
  assertNotSuccess(report);
  return report;
}

export function reconciledPlan(plan: ActionPlan, report: ReconcileReport): ActionPlan {
  if (plan.envelope_digest !== report.envelope_digest) {
    throw contractInvalid("reconcile report envelope does not match the plan", [
      report.envelope_digest,
    ]);
  }
  assertNotSuccess(report);
  return { ...plan, state: report.outcome };
}

export function assertNotSuccess(report: ReconcileReport): void {
  if (report.outcome === "unknown_outcome" && report.is_success) {
    throw invariantViolated("PROTO-16", "unknown_outcome cannot be claimed as success", [
      report.attempt_id,
    ]);
  }
}

export function attemptAuditRecord(input: {
  readonly attempt: AttemptRecord;
  readonly record_id: string;
  readonly prev_hash: string;
  readonly timestamp: string;
}): AuditRecord {
  if (input.attempt.recorded_before_effect !== true) {
    throw invariantViolated("PROTO-16", "attempt record is missing the write-ahead mark", [
      input.attempt.attempt_id,
    ]);
  }
  return seal(input.record_id, input.prev_hash, input.timestamp, EventType.ActionStarted, input.attempt);
}

export function reconcileAuditRecord(input: {
  readonly report: ReconcileReport;
  readonly record_id: string;
  readonly prev_hash: string;
  readonly timestamp: string;
}): AuditRecord {
  assertNotSuccess(input.report);
  return seal(input.record_id, input.prev_hash, input.timestamp, EventType.ActionCompleted, input.report);
}

function resolveOutcome(
  prior: AttemptOutcome,
  target: TargetObservation | undefined,
  attemptId: string,
): AttemptOutcome {
  if (prior !== "unknown_outcome") return prior;
  if (target === undefined || !target.checkable) return "unknown_outcome";
  if (target.idempotency_key !== attemptId) {
    throw contractInvalid("target observation key does not match the attempt", [
      target.idempotency_key,
      attemptId,
    ]);
  }
  return target.observed ? "succeeded" : "failed";
}

function seal(
  recordIdRaw: string,
  prevHashRaw: string,
  timestampRaw: string,
  eventType: typeof EventType.ActionStarted | typeof EventType.ActionCompleted,
  payload: unknown,
): AuditRecord {
  const recordId = asNonEmpty(recordIdRaw, "record_id");
  const prevHash = asNonEmpty(prevHashRaw, "prev_hash");
  const timestamp = asNonEmpty(timestampRaw, "timestamp");
  return {
    record_id: recordId,
    prev_hash: prevHash,
    record_hash: hashAuditRecord({ record_id: recordId, prev_hash: prevHash }),
    timestamp,
    event_type: eventType,
    payload_digest: digestOf(payload),
  };
}

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
