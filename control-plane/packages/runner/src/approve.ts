/**
 * Approval I/O boundary (DEV-30). Domain binds the approver; this module
 * attaches EventType.PlanApproved. The name comes from the registry (S-3).
 *
 * Contract: glt-specpack/docs/SPEC/policy.md
 */

import { EVENT_SCHEMA_VERSION, EventType } from "@glt/contracts";
import {
  APPROVE_STEP,
  admitApprovedPlan,
  approvePlan,
  type AdmitPlanInput,
  type ApprovePlanInput,
  type ApprovedPlan,
} from "@glt/domain";

export const RUNNER_APPROVE_STEP = APPROVE_STEP;

export interface PlanApprovedEvent {
  readonly event_type: typeof EventType.PlanApproved;
  readonly schema_version: number;
  readonly payload: {
    readonly plan_id: string;
    readonly envelope_digest: string;
    readonly approver: string;
    readonly signature: string;
  };
}

export interface BoundApproval extends ApprovedPlan {
  readonly event: PlanApprovedEvent;
}

export function bindApproval(input: ApprovePlanInput): BoundApproval {
  const approved = approvePlan(input);
  return { ...approved, event: planApprovedEvent(approved) };
}

export function admitBoundApproval(input: AdmitPlanInput): void {
  admitApprovedPlan(input);
}

export function planApprovedEvent(approval: ApprovedPlan): PlanApprovedEvent {
  return {
    event_type: EventType.PlanApproved,
    schema_version: EVENT_SCHEMA_VERSION[EventType.PlanApproved],
    payload: {
      plan_id: approval.plan.plan_id,
      envelope_digest: approval.envelope_digest,
      approver: approval.approver,
      signature: approval.signature,
    },
  };
}

export type { AdmitPlanInput, ApprovePlanInput, ApprovedPlan };
