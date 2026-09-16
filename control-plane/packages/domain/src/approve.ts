/**
 * Approval broker (DEV-30). Pure: plan, catalog, keys and the signature
 * arrive already parsed. HTTP and store stay outside domain.
 *
 * Envelope field change invalidates the approval (PROTO-15, INV-08).
 * authorize runs at approve and again at admit (S-4). Risk comes from
 * the capability set, not the action name. The runtime cannot approve
 * (INV-09). Signatures use verifyBytes (S-4).
 *
 * Contract: glt-specpack/docs/SPEC/policy.md
 */

import type { ActionPlan, ActionSpec } from "@glt/contracts";
import type { KeyObject } from "node:crypto";
import { digestOf, isDigest } from "./digest.ts";
import { contractInvalid, invariantViolated, policyDenied } from "./errors.ts";
import {
  actionLeaf,
  actionSpecFromUnknown,
  isForbiddenActionId,
  isV1ActionId,
  type BuiltPlan,
} from "./plan.ts";
import { Capability, authorize, type PlanSubject, type Principal } from "./policy.ts";
import { verifyBytes } from "./signature.ts";

export const APPROVE_STEP = "glt.dev.30" as const;

export type CapabilityRisk = ActionSpec["risk_class"];

export interface ApprovalEnvelope {
  readonly plan: string;
  readonly registry_revision: string;
  readonly environment_id: string;
  readonly snapshot: string;
  readonly action_specs: readonly string[];
  readonly policy: string;
  readonly executor_image: string;
  readonly input: string;
  readonly credential_scope: string;
}

export interface ApprovalDigestInput {
  readonly registry_revision: string;
  readonly environment_id: string;
  readonly input: string;
  readonly credential_scope: string;
}

export interface ApprovePlanInput {
  readonly built: BuiltPlan;
  readonly catalog: readonly ActionSpec[];
  readonly digests: ApprovalDigestInput;
  readonly principal: Principal;
  readonly planSubject: PlanSubject;
  readonly publicKey: KeyObject;
  readonly signature: string;
}

export interface ApprovedPlan {
  readonly plan: ActionPlan;
  readonly envelope: ApprovalEnvelope;
  readonly envelope_digest: string;
  readonly approver: string;
  readonly signature: string;
}

export interface AdmitPlanInput {
  readonly approval: ApprovedPlan;
  readonly built: BuiltPlan;
  readonly catalog: readonly ActionSpec[];
  readonly digests: ApprovalDigestInput;
  readonly principal: Principal;
  readonly planSubject: PlanSubject;
  readonly publicKey: KeyObject;
}

/**
 * Risk from the capability set. The action id is not an input: a label
 * cannot lower or raise the class.
 */
export function riskFromCapabilities(capabilities: readonly string[]): CapabilityRisk {
  if (capabilities.length < 1) {
    throw contractInvalid("capabilities must be a non-empty set");
  }
  let risk: CapabilityRisk = "read";
  for (const capability of capabilities) {
    if (typeof capability !== "string" || capability.trim().length === 0) {
      throw contractInvalid("capability is empty");
    }
    const leaf = actionLeaf(capability);
    if (isForbiddenActionId(leaf)) {
      risk = "write";
      continue;
    }
    if (!isV1ActionId(leaf)) {
      throw invariantViolated("PROTO-13", "capability is not in the v1 allowlist", [capability]);
    }
  }
  return risk;
}

export function approvalEnvelope(input: {
  readonly built: BuiltPlan;
  readonly catalog: readonly ActionSpec[];
  readonly digests: ApprovalDigestInput;
}): ApprovalEnvelope {
  const actionSpecs = specDigests(input.catalog);
  if (actionSpecs.length < 1) {
    throw contractInvalid("approval envelope has no ActionSpec digest");
  }
  const envelope: ApprovalEnvelope = {
    plan: requireDigest(input.built.envelope.plan, "plan"),
    registry_revision: requireDigest(input.digests.registry_revision, "registry_revision"),
    environment_id: asNonEmpty(input.digests.environment_id, "environment_id"),
    snapshot: requireDigest(input.built.envelope.snapshot, "snapshot"),
    action_specs: actionSpecs,
    policy: requireDigest(input.built.envelope.policy, "policy"),
    executor_image: requireDigest(input.built.envelope.executor_image, "executor_image"),
    input: requireDigest(input.digests.input, "input"),
    credential_scope: requireDigest(input.digests.credential_scope, "credential_scope"),
  };
  return envelope;
}

/** Single message the approver signs: envelope digest + actor (S-4). */
export function approvalBindingDigest(envelope: ApprovalEnvelope, approver: string): string {
  return digestOf({
    envelope_digest: digestOf(envelope),
    approver: asNonEmpty(approver, "approver"),
  });
}

export function approvePlan(input: ApprovePlanInput): ApprovedPlan {
  denyWriteRisk(input.catalog);
  authorize({
    principal: input.principal,
    capability: Capability.Approve,
    plan: input.planSubject,
  });
  const envelope = approvalEnvelope(input);
  const envelopeDigest = digestOf(envelope);
  const signature = asNonEmpty(input.signature, "signature");
  if (!signatureHolds(input.publicKey, envelope, input.principal.actor, signature)) {
    throw policyDenied("approver is not bound to the envelope", [input.principal.actor]);
  }
  return {
    plan: { ...input.built.plan, state: "approved" },
    envelope,
    envelope_digest: envelopeDigest,
    approver: input.principal.actor,
    signature,
  };
}

/**
 * Run gate. Rebuilds the envelope from current inputs, verifies the
 * recorded signature, and calls authorize again.
 */
export function admitApprovedPlan(input: AdmitPlanInput): void {
  if (input.principal.actor !== input.approval.approver) {
    throw policyDenied("admit principal is not the bound approver", [
      input.principal.actor,
      input.approval.approver,
    ]);
  }
  denyWriteRisk(input.catalog);
  authorize({
    principal: input.principal,
    capability: Capability.Approve,
    plan: input.planSubject,
  });
  const current = approvalEnvelope(input);
  const currentDigest = digestOf(current);
  if (currentDigest !== input.approval.envelope_digest) {
    throw invariantViolated(
      "PROTO-15",
      "approval envelope changed; approval is invalidated",
      [input.approval.envelope_digest, currentDigest],
    );
  }
  if (
    !signatureHolds(
      input.publicKey,
      current,
      input.approval.approver,
      input.approval.signature,
    )
  ) {
    throw invariantViolated("PROTO-15", "approval signature does not bind the current envelope", [
      input.approval.approver,
    ]);
  }
}

function denyWriteRisk(catalog: readonly ActionSpec[]): void {
  for (const raw of catalog) {
    const spec = actionSpecFromUnknown(raw);
    const risk = riskFromCapabilities(spec.capabilities);
    if (risk !== "read" && risk !== "read_build") {
      throw invariantViolated("INV-06", "v1 approval denies write and external risk", [
        spec.id,
        risk,
      ]);
    }
  }
}

function specDigests(catalog: readonly ActionSpec[]): string[] {
  return [...catalog]
    .map((raw) => actionSpecFromUnknown(raw))
    .map((spec) => ({ id: spec.id, digest: digestOf(spec) }))
    .sort((left, right) => {
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    })
    .map((row) => row.digest);
}

function signatureHolds(
  publicKey: KeyObject,
  envelope: ApprovalEnvelope,
  approver: string,
  signature: string,
): boolean {
  const message = Buffer.from(approvalBindingDigest(envelope, approver), "utf8");
  try {
    return verifyBytes(publicKey, message, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

function requireDigest(value: string, field: string): string {
  const trimmed = value.trim();
  if (!isDigest(trimmed)) {
    throw invariantViolated("PROTO-14", "approval envelope digest is missing or not a digest", [
      field,
    ]);
  }
  return trimmed;
}

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
