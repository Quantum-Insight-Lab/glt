import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { EventType, createValidator, validateAgainst, type ActionSpec } from "@glt/contracts";
import {
  APPROVE_STEP,
  approvalBindingDigest,
  approvalEnvelope,
  buildPlan,
  keyPairFromUtf8Seed,
  signBytes,
  Role,
} from "@glt/domain";
import { bindApproval, planApprovedEvent } from "@glt/runner";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const REGISTRY = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const INPUT = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const CREDS = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const TYPECHECK: ActionSpec = {
  id: "typecheck",
  revision: 1,
  capabilities: ["typecheck"],
  risk_class: "read",
};

describe("DEV-30 approval broker client", () => {
  it("is the DEV-30 step", () => {
    expect(APPROVE_STEP).toBe("glt.dev.30");
  });

  it("emits glt.plan.approved for a bound envelope", () => {
    const built = buildPlan({
      plan_id: "plan-bound",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: {
        policy: POLICY,
        executor_image: EXECUTOR,
        snapshot: SNAPSHOT,
        registry_revision: REGISTRY,
      },
    });
    const digests = {
      registry_revision: REGISTRY,
      environment_id: "env-test",
      input: INPUT,
      credential_scope: CREDS,
    };
    const envelope = approvalEnvelope({ built, catalog: [TYPECHECK], digests });
    const keys = keyPairFromUtf8Seed("reviewer@external");
    const bound = bindApproval({
      built,
      catalog: [TYPECHECK],
      digests,
      principal: { actor: "reviewer@external", role: Role.Approver },
      planSubject: { authored_by: "alice@local" },
      publicKey: keys.publicKey,
      signature: signBytes(
        keys.privateKey,
        Buffer.from(approvalBindingDigest(envelope, "reviewer@external"), "utf8"),
      ).toString("base64"),
    });
    expect(bound.event.event_type).toBe(EventType.PlanApproved);
    expect(bound.event).toEqual(planApprovedEvent(bound));
    expect(validateAgainst(createValidator(), "action-plan", bound.plan)).toEqual([]);
  });

  it("S-10 glt approve is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("approve");
    expect(names).not.toContain("action");
    expect(FORBIDDEN_COMMANDS).not.toContain("approve");
  });
});
