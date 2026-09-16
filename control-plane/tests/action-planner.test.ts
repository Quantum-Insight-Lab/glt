import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import {
  EventType,
  createValidator,
  validateAgainst,
  type ActionSpec,
} from "@glt/contracts";
import { PLAN_STEP } from "@glt/domain";
import { assemblePlan, planCreatedEvent } from "@glt/runner";

const DIGEST_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DIGEST_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const TYPECHECK: ActionSpec = {
  id: "typecheck",
  revision: 1,
  capabilities: ["typecheck"],
  risk_class: "read",
};

describe("DEV-29 action planner client", () => {
  it("is the DEV-29 step", () => {
    expect(PLAN_STEP).toBe("glt.dev.29");
  });

  it("emits glt.plan.created for a registered ActionSpec plan", () => {
    const assembled = assemblePlan({
      plan_id: "plan-live",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
    });
    expect(assembled.event.event_type).toBe(EventType.PlanCreated);
    expect(assembled.event).toEqual(planCreatedEvent(assembled.plan));
    expect(validateAgainst(createValidator(), "action-plan", assembled.plan)).toEqual([]);
    expect(validateAgainst(createValidator(), "action-spec", TYPECHECK)).toEqual([]);
  });

  it("S-10 glt plan is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("plan");
    expect(names).not.toContain("action");
    expect(FORBIDDEN_COMMANDS).not.toContain("plan");
  });
});
