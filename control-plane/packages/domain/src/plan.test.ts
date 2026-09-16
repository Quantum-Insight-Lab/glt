import { describe, expect, it } from "vitest";
import type { ActionSpec } from "@glt/contracts";
import { digestOf, isDigest } from "./digest.ts";
import { GltError } from "./errors.ts";
import {
  PLAN_STEP,
  actionSpecFromUnknown,
  buildPlan,
  catalogFromRegistryEntries,
  isForbiddenActionId,
} from "./plan.ts";

const DIGEST_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DIGEST_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const TYPECHECK = spec("typecheck");
const TEST = spec("test");

describe("DEV-29 action planner", () => {
  it("is the DEV-29 step", () => {
    expect(PLAN_STEP).toBe("glt.dev.29");
  });

  it("assembles a draft from registered ActionSpecs", () => {
    const built = buildPlan({
      plan_id: "plan-1",
      catalog: [TYPECHECK, TEST],
      actions: [
        { action_id: "test", depends_on: ["typecheck"] },
        { action_id: "typecheck", depends_on: [] },
      ],
      digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
    });
    expect(built.plan.state).toBe("draft");
    expect(built.plan.actions.map((step) => step.action_id)).toEqual(["test", "typecheck"]);
    expect(built.envelope.plan).toBe(
      digestOf({ plan_id: "plan-1", state: "draft", actions: built.plan.actions }),
    );
    expect(built.envelope.policy).toBe(DIGEST_A);
    expect(built.envelope.executor_image).toBe(DIGEST_B);
    expect(built.envelope.snapshot).toBe(DIGEST_C);
    expect(built.plan.envelope_digest).toBe(digestOf(built.envelope));
    expect(isDigest(built.plan.envelope_digest)).toBe(true);
  });

  it("PROTO-13 INV-06 an unknown action id is denied", () => {
    expect(() =>
      buildPlan({
        plan_id: "plan-unknown",
        catalog: [TYPECHECK],
        actions: [{ action_id: "rm -rf /", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-unknown",
        catalog: [TYPECHECK],
        actions: [{ action_id: "rm -rf /", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).invariant).toBe("PROTO-13");
    }
  });

  it("PROTO-13 a catalog spec cannot add an unknown capability", () => {
    const forged = spec("typecheck", { capabilities: ["typecheck", "shell"] });
    expect(() =>
      buildPlan({
        plan_id: "plan-cap",
        catalog: [forged],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-cap",
        catalog: [forged],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      });
    } catch (error) {
      expect((error as GltError).invariant).toBe("PROTO-13");
    }
  });

  it("PROTO-07 a cyclic depends_on is rejected", () => {
    expect(() =>
      buildPlan({
        plan_id: "plan-cycle",
        catalog: [TYPECHECK, TEST],
        actions: [
          { action_id: "typecheck", depends_on: ["test"] },
          { action_id: "test", depends_on: ["typecheck"] },
        ],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-cycle",
        catalog: [TYPECHECK, TEST],
        actions: [
          { action_id: "typecheck", depends_on: ["test"] },
          { action_id: "test", depends_on: ["typecheck"] },
        ],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      });
    } catch (error) {
      expect((error as GltError).invariant).toBe("PROTO-07");
    }
  });

  it("PROTO-14 envelope carries plan policy executor and snapshot digests", () => {
    const built = buildPlan({
      plan_id: "plan-env",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: {
        policy: DIGEST_A,
        executor_image: DIGEST_B,
        snapshot: DIGEST_C,
        registry_revision: DIGEST_A,
      },
    });
    expect(built.envelope).toEqual({
      plan: built.envelope.plan,
      policy: DIGEST_A,
      executor_image: DIGEST_B,
      snapshot: DIGEST_C,
    });
    expect(built.plan.digests).toEqual({
      topology_snapshot: DIGEST_C,
      policy: DIGEST_A,
      executor_image: DIGEST_B,
      registry_revision: DIGEST_A,
    });
  });

  it("PROTO-14 a missing snapshot digest is not a sealed envelope", () => {
    expect(() =>
      buildPlan({
        plan_id: "plan-unsealed",
        catalog: [TYPECHECK],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: "not-a-digest" },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-unsealed",
        catalog: [TYPECHECK],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: "not-a-digest" },
      });
    } catch (error) {
      expect((error as GltError).invariant).toBe("PROTO-14");
    }
  });

  it("PROTO-17 commit is not a plan action", () => {
    expect(isForbiddenActionId("glt.action.commit")).toBe(true);
    expect(() =>
      buildPlan({
        plan_id: "plan-commit",
        catalog: [spec("commit")],
        actions: [{ action_id: "commit", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-commit",
        catalog: [spec("commit")],
        actions: [{ action_id: "commit", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      });
    } catch (error) {
      expect((error as GltError).invariant).toBe("PROTO-17");
    }
  });

  it("INV-06 write risk_class is denied", () => {
    const write = spec("typecheck", { risk_class: "write" });
    expect(() =>
      buildPlan({
        plan_id: "plan-write",
        catalog: [write],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      }),
    ).toThrow(GltError);
    try {
      buildPlan({
        plan_id: "plan-write",
        catalog: [write],
        actions: [{ action_id: "typecheck", depends_on: [] }],
        digests: { policy: DIGEST_A, executor_image: DIGEST_B, snapshot: DIGEST_C },
      });
    } catch (error) {
      expect((error as GltError).invariant).toBe("INV-06");
    }
  });

  it("reads ActionSpec from a registry action entry", () => {
    const catalog = catalogFromRegistryEntries([
      {
        spec: {
          kind: "action",
          action_spec: actionSpecFromUnknown(TYPECHECK),
        },
      },
      { spec: { kind: "node" } },
    ]);
    expect(catalog).toEqual([TYPECHECK]);
  });
});

function spec(
  id: string,
  override: Partial<ActionSpec> = {},
): ActionSpec {
  return {
    id,
    revision: 1,
    capabilities: override.capabilities ?? [id === "commit" ? "typecheck" : id],
    risk_class: override.risk_class ?? "read",
  };
}
