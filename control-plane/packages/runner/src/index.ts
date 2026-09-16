/**
 * Runner — planner (DEV-29) and approval broker (DEV-30).
 * Execution is DEV-31/32.
 *
 * Contract: glt-specpack/docs/SPEC/runner.md
 */

export { RUNNER_PLAN_STEP, assemblePlan, planCreatedEvent } from "./plan.ts";
export type { AssembledPlan, BuildPlanInput, BuiltPlan, PlanCreatedEvent, PlanEnvelope } from "./plan.ts";
export {
  RUNNER_APPROVE_STEP,
  admitBoundApproval,
  bindApproval,
  planApprovedEvent,
} from "./approve.ts";
export type {
  AdmitPlanInput,
  ApprovePlanInput,
  ApprovedPlan,
  BoundApproval,
  PlanApprovedEvent,
} from "./approve.ts";
