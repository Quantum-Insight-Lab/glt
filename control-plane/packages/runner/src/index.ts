/**
 * Runner — planner (DEV-29), approval (DEV-30), shadow (DEV-31).
 * Side-effecting execution is DEV-32.
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
export {
  RUNNER_SHADOW_STEP,
  actionStartedEvent,
  runShadow,
  shadowAuditRecord,
} from "./shadow.ts";
export type {
  ActionStartedEvent,
  ShadowReport,
  ShadowRunInput,
  ShadowedRun,
} from "./shadow.ts";
