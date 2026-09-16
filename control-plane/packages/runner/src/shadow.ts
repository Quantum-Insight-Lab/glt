/**
 * Shadow I/O boundary (DEV-31). Domain dry-runs; this module attaches
 * EventType.ActionStarted. The name comes from the registry (S-3).
 *
 * Contract: glt-specpack/docs/SPEC/runner.md
 */

import { EVENT_SCHEMA_VERSION, EventType, type ActionPlan } from "@glt/contracts";
import {
  SHADOW_STEP,
  shadowAuditRecord,
  shadowRun,
  shadowedPlan,
  type ShadowReport,
  type ShadowRunInput,
} from "@glt/domain";

export const RUNNER_SHADOW_STEP = SHADOW_STEP;

export interface ActionStartedEvent {
  readonly event_type: typeof EventType.ActionStarted;
  readonly schema_version: number;
  readonly payload: {
    readonly plan_id: string;
    readonly action_id: string;
    readonly attempt_id: string;
  };
}

export interface ShadowedRun {
  readonly report: ShadowReport;
  readonly plan: ActionPlan;
  readonly events: readonly ActionStartedEvent[];
}

export function runShadow(input: ShadowRunInput): ShadowedRun {
  const report = shadowRun(input);
  return {
    report,
    plan: shadowedPlan(input.built, report),
    events: report.actions.map((action) => actionStartedEvent(report.plan_id, action)),
  };
}

export function actionStartedEvent(
  planId: string,
  action: ShadowReport["actions"][number],
): ActionStartedEvent {
  return {
    event_type: EventType.ActionStarted,
    schema_version: EVENT_SCHEMA_VERSION[EventType.ActionStarted],
    payload: {
      plan_id: planId,
      action_id: action.action_id,
      attempt_id: action.attempt_id,
    },
  };
}

export { shadowAuditRecord };
export type { ShadowReport, ShadowRunInput };
