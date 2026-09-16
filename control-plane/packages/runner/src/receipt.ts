/**
 * Receipt I/O boundary (DEV-33). Domain classifies unknown_outcome;
 * this module attaches EventType.ActionCompleted. The name comes from
 * the registry (S-3). One event builder: actionCompletedEvent (S-4).
 *
 * Contract: glt-specpack/docs/SPEC/audit.md
 */

import type { ActionPlan } from "@glt/contracts";
import {
  RECEIPT_STEP,
  attemptAuditRecord,
  reconcileAuditRecord,
  reconcileOutcome,
  reconciledPlan,
  type AttemptRecord,
  type AttemptOutcome,
  type ReconcileReport,
  type TargetObservation,
} from "@glt/domain";
import { actionCompletedEvent, type ActionCompletedEvent } from "./sandbox.ts";

export const RUNNER_RECEIPT_STEP = RECEIPT_STEP;

export interface ReconcileInput {
  readonly plan: ActionPlan;
  readonly attempt: AttemptRecord;
  readonly prior: AttemptOutcome;
  readonly target?: TargetObservation;
}

export interface ReconciledRun {
  readonly report: ReconcileReport;
  readonly plan: ActionPlan;
  readonly events: readonly ActionCompletedEvent[];
}

export function runReconcile(input: ReconcileInput): ReconciledRun {
  const report = reconcileOutcome({
    attempt: input.attempt,
    prior: input.prior,
    ...(input.target !== undefined ? { target: input.target } : {}),
  });
  return {
    report,
    plan: reconciledPlan(input.plan, report),
    events: [actionCompletedEvent({
      attempt_id: report.attempt_id,
      outcome: report.outcome,
    })],
  };
}

export function completedOutcomeEvent(
  attemptId: string,
  outcome: AttemptOutcome,
): ActionCompletedEvent {
  return actionCompletedEvent({ attempt_id: attemptId, outcome });
}

export { attemptAuditRecord, reconcileAuditRecord };
export type { ActionCompletedEvent, ReconcileReport };
