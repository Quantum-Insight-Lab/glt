/**
 * Planner I/O boundary (DEV-29). Domain builds the plan; this module
 * attaches EventType.PlanCreated. The name comes from the registry (S-3).
 *
 * Contract: glt-specpack/docs/SPEC/runner.md
 */

import { EVENT_SCHEMA_VERSION, EventType, type ActionPlan } from "@glt/contracts";
import {
  PLAN_STEP,
  buildPlan,
  type BuildPlanInput,
  type BuiltPlan,
  type PlanEnvelope,
} from "@glt/domain";

export const RUNNER_PLAN_STEP = PLAN_STEP;

export interface PlanCreatedEvent {
  readonly event_type: typeof EventType.PlanCreated;
  readonly schema_version: number;
  readonly payload: {
    readonly plan_id: string;
    readonly envelope_digest: string;
  };
}

export interface AssembledPlan extends BuiltPlan {
  readonly event: PlanCreatedEvent;
}

export function assemblePlan(input: BuildPlanInput): AssembledPlan {
  const built = buildPlan(input);
  return { ...built, event: planCreatedEvent(built.plan) };
}

export function planCreatedEvent(plan: ActionPlan): PlanCreatedEvent {
  return {
    event_type: EventType.PlanCreated,
    schema_version: EVENT_SCHEMA_VERSION[EventType.PlanCreated],
    payload: {
      plan_id: plan.plan_id,
      envelope_digest: plan.envelope_digest,
    },
  };
}

export type { BuildPlanInput, BuiltPlan, PlanEnvelope };
