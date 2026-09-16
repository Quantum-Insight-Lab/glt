/**
 * Sandbox I/O boundary (DEV-32). Domain admits the isolation profile;
 * this module attaches EventType.ActionCompleted. The name comes from
 * the registry (S-3). Timeout is P04 (S-8). No docker socket, no host
 * credentials, no workspace write.
 *
 * Contract: glt-specpack/docs/SECURITY/sandbox.md
 */

import { EVENT_SCHEMA_VERSION, EventType, loadParameterCards, type ActionPlan } from "@glt/contracts";
import {
  SANDBOX_STEP,
  contractInvalid,
  parameterSpecFromCard,
  parameterValue,
  sandboxAuditRecord,
  sandboxRun,
  sandboxedPlan,
  type SandboxReport,
  type SandboxRunInput,
} from "@glt/domain";

export const RUNNER_SANDBOX_STEP = SANDBOX_STEP;

const TIMEOUT_PARAM = "glt.param.runner.default_timeout_seconds";

export interface ActionCompletedEvent {
  readonly event_type: typeof EventType.ActionCompleted;
  readonly schema_version: number;
  readonly payload: {
    readonly attempt_id: string;
    readonly outcome: string;
  };
}

export interface SandboxedRun {
  readonly report: SandboxReport;
  readonly plan: ActionPlan;
  readonly events: readonly ActionCompletedEvent[];
}

export function runnerTimeoutSeconds(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === TIMEOUT_PARAM) return parameterValue(spec);
  }
  throw contractInvalid("parameter card missing", [TIMEOUT_PARAM]);
}

export function runSandbox(
  input: Omit<SandboxRunInput, "timeout_limit_seconds"> & {
    readonly timeout_limit_seconds?: number;
  },
): SandboxedRun {
  const timeout_limit_seconds = input.timeout_limit_seconds ?? runnerTimeoutSeconds();
  const report = sandboxRun({ ...input, timeout_limit_seconds });
  return {
    report,
    plan: sandboxedPlan(input.built, report),
    events: report.actions.map((action) => actionCompletedEvent(action)),
  };
}

export function actionCompletedEvent(
  action: SandboxReport["actions"][number],
): ActionCompletedEvent {
  return {
    event_type: EventType.ActionCompleted,
    schema_version: EVENT_SCHEMA_VERSION[EventType.ActionCompleted],
    payload: {
      attempt_id: action.attempt_id,
      outcome: action.outcome,
    },
  };
}

export { sandboxAuditRecord };
export type { SandboxReport, SandboxRunInput };
