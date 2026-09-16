import { describe, expect, it } from "vitest";
import type { ActionSpec } from "@glt/contracts";
import { digestOf } from "./digest.ts";
import { ExitCode, GltError } from "./errors.ts";
import {
  APPROVE_STEP,
  admitApprovedPlan,
  approvalBindingDigest,
  approvalEnvelope,
  approvePlan,
  riskFromCapabilities,
  type ApprovalDigestInput,
  type ApprovedPlan,
} from "./approve.ts";
import { buildPlan } from "./plan.ts";
import { RUNTIME_IDENTITY, Role } from "./policy.ts";
import { keyPairFromUtf8Seed, signBytes } from "./signature.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const REGISTRY = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const INPUT = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const CREDS = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const OTHER = "sha256:1111111111111111111111111111111111111111111111111111111111111111";

const TYPECHECK = spec("typecheck");
const APPROVER = { actor: "reviewer@external", role: Role.Approver };
const SUBJECT = { authored_by: "alice@local", affects_control_plane_release: true };
const KEYS = keyPairFromUtf8Seed("reviewer@external");

describe("DEV-30 approval broker", () => {
  it("is the DEV-30 step", () => {
    expect(APPROVE_STEP).toBe("glt.dev.30");
  });

  it("binds an external approver to the approval envelope", () => {
    const approved = approveValid();
    expect(approved.plan.state).toBe("approved");
    expect(approved.approver).toBe(APPROVER.actor);
    expect(approved.envelope.action_specs).toHaveLength(1);
    expect(approved.envelope_digest).toBe(digestOf(approvalEnvelope(validInput())));
    expect(approved.envelope_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("PROTO-15 INV-08 changing an envelope field invalidates approval", () => {
    const approved = approveValid();
    expectThrown(
      () =>
        admitApprovedPlan({
          ...admitInput(approved),
          digests: { ...digests(), input: OTHER },
        }),
      "PROTO-15",
    );
    expectThrown(
      () =>
        admitApprovedPlan({
          ...admitInput(approved),
          built: buildValid({ policy: OTHER }),
        }),
      "PROTO-15",
    );
  });

  it("PROTO-15 INV-08 changing ActionSpec after approve is rejected at admit", () => {
    const approved = approveValid();
    const mutated = spec("typecheck", { capabilities: ["typecheck", "test"] });
    expectThrown(
      () =>
        admitApprovedPlan({
          ...admitInput(approved),
          catalog: [mutated],
        }),
      "PROTO-15",
    );
  });

  it("PROTO-15 policy is re-checked at admit not only at approve", () => {
    const approved = approveValid();
    admitApprovedPlan(admitInput(approved));
    expectThrown(
      () =>
        admitApprovedPlan({
          ...admitInput(approved),
          principal: { actor: APPROVER.actor, role: Role.Reader },
        }),
      undefined,
      ExitCode.PolicyDenied,
    );
  });

  it("INV-09 the runner cannot approve a plan", () => {
    const built = buildValid();
    const envelope = approvalEnvelope({ built, catalog: [TYPECHECK], digests: digests() });
    const runtimeKeys = keyPairFromUtf8Seed(RUNTIME_IDENTITY);
    expectThrown(
      () =>
        approvePlan({
          built,
          catalog: [TYPECHECK],
          digests: digests(),
          principal: { actor: RUNTIME_IDENTITY, role: Role.Approver },
          planSubject: SUBJECT,
          publicKey: runtimeKeys.publicKey,
          signature: signEnvelope(envelope, RUNTIME_IDENTITY, runtimeKeys.privateKey),
        }),
      "INV-09",
      ExitCode.PolicyDenied,
    );
  });

  it("INV-09 the author cannot approve their own plan", () => {
    const built = buildValid();
    const envelope = approvalEnvelope({ built, catalog: [TYPECHECK], digests: digests() });
    const authorKeys = keyPairFromUtf8Seed("alice@local");
    expectThrown(
      () =>
        approvePlan({
          built,
          catalog: [TYPECHECK],
          digests: digests(),
          principal: { actor: "alice@local", role: Role.Approver },
          planSubject: SUBJECT,
          publicKey: authorKeys.publicKey,
          signature: signEnvelope(envelope, "alice@local", authorKeys.privateKey),
        }),
      "INV-09",
      ExitCode.PolicyDenied,
    );
  });

  it("INV-06 risk from a write capability is denied regardless of the action name", () => {
    expect(riskFromCapabilities(["health"])).toBe("read");
    expect(riskFromCapabilities(["inventory"])).toBe("read");
    expect(riskFromCapabilities(["push"])).toBe("write");
    const labeledInventory = spec("inventory", { capabilities: ["deploy"] });
    const built = buildValid();
    expectThrown(
      () =>
        approvePlan({
          built,
          catalog: [labeledInventory],
          digests: digests(),
          principal: APPROVER,
          planSubject: SUBJECT,
          publicKey: KEYS.publicKey,
          signature: "dG9vCg==",
        }),
      "INV-06",
    );
  });

  it("risk is computed from capabilities not the action name", () => {
    expect(riskFromCapabilities(["typecheck"])).toBe(riskFromCapabilities(["typecheck"]));
    expect(riskFromCapabilities(["health"])).toBe("read");
    expect(riskFromCapabilities(["compile", "test"])).toBe("read");
    expect(riskFromCapabilities(["health", "commit"])).toBe("write");
  });

  it("a foreign signature does not bind the approver", () => {
    const built = buildValid();
    const envelope = approvalEnvelope({ built, catalog: [TYPECHECK], digests: digests() });
    const stranger = keyPairFromUtf8Seed("stranger@external");
    expectThrown(
      () =>
        approvePlan({
          built,
          catalog: [TYPECHECK],
          digests: digests(),
          principal: APPROVER,
          planSubject: SUBJECT,
          publicKey: KEYS.publicKey,
          signature: signEnvelope(envelope, APPROVER.actor, stranger.privateKey),
        }),
      undefined,
      ExitCode.PolicyDenied,
    );
  });
});

function approveValid(): ApprovedPlan {
  const built = buildValid();
  const envelope = approvalEnvelope({ built, catalog: [TYPECHECK], digests: digests() });
  return approvePlan({
    built,
    catalog: [TYPECHECK],
    digests: digests(),
    principal: APPROVER,
    planSubject: SUBJECT,
    publicKey: KEYS.publicKey,
    signature: signEnvelope(envelope, APPROVER.actor, KEYS.privateKey),
  });
}

function admitInput(approval: ApprovedPlan) {
  return {
    approval,
    built: buildValid(),
    catalog: [TYPECHECK],
    digests: digests(),
    principal: APPROVER,
    planSubject: SUBJECT,
    publicKey: KEYS.publicKey,
  };
}

function validInput() {
  return { built: buildValid(), catalog: [TYPECHECK], digests: digests() };
}

function buildValid(override: { policy?: string } = {}) {
  return buildPlan({
    plan_id: "plan-approve",
    catalog: [TYPECHECK],
    actions: [{ action_id: "typecheck", depends_on: [] }],
    digests: {
      policy: override.policy ?? POLICY,
      executor_image: EXECUTOR,
      snapshot: SNAPSHOT,
      registry_revision: REGISTRY,
    },
  });
}

function digests(): ApprovalDigestInput {
  return {
    registry_revision: REGISTRY,
    environment_id: "env-test",
    input: INPUT,
    credential_scope: CREDS,
  };
}

function signEnvelope(
  envelope: ReturnType<typeof approvalEnvelope>,
  approver: string,
  privateKey: ReturnType<typeof keyPairFromUtf8Seed>["privateKey"],
): string {
  return signBytes(
    privateKey,
    Buffer.from(approvalBindingDigest(envelope, approver), "utf8"),
  ).toString("base64");
}

function spec(id: string, override: Partial<ActionSpec> = {}): ActionSpec {
  return {
    id,
    revision: 1,
    capabilities: override.capabilities ?? [id],
    risk_class: override.risk_class ?? "read",
  };
}

function expectThrown(run: () => void, invariant?: string, code?: number): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GltError);
  const err = caught as GltError;
  if (invariant !== undefined) expect(err.invariant).toBe(invariant);
  if (code !== undefined) expect(err.code).toBe(code);
}
