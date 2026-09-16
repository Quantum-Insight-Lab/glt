/**
 * Action planner (DEV-29). Pure: the catalog, requested ids and digests
 * arrive already parsed. Registry I/O stays outside domain.
 *
 * Unknown action / capability is denied (PROTO-13, INV-06). Forbidden
 * verbs are not actions (PROTO-17). depends_on cycles use findCycles
 * (PROTO-07, S-4). Envelope digests use digestOf (PROTO-14, S-4).
 *
 * Contract: glt-specpack/docs/SPEC/runner.md
 */

import type { ActionPlan, ActionSpec } from "@glt/contracts";
import { digestOf, isDigest } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";
import { findCycles } from "./graph.ts";

export const PLAN_STEP = "glt.dev.29" as const;

/** v1 ActionSpec ids and capabilities. Same set as runner.md / cli.md. */
export const V1_ACTION_IDS = [
  "inventory",
  "validate",
  "compile",
  "typecheck",
  "test",
  "health",
] as const;

export type V1ActionId = (typeof V1_ACTION_IDS)[number];

const V1_ACTION_SET = new Set<string>(V1_ACTION_IDS);

const FORBIDDEN_LEAVES = new Set([
  "commit",
  "push",
  "deploy",
  "migration",
  "self_upgrade",
  "self_write",
  "shell",
]);

export interface PlanRequestAction {
  readonly action_id: string;
  readonly depends_on: readonly string[];
}

export interface PlanEnvelopeInput {
  readonly policy: string;
  readonly executor_image: string;
  readonly snapshot: string;
  readonly registry_revision?: string;
}

export interface BuildPlanInput {
  readonly plan_id: string;
  readonly catalog: readonly ActionSpec[];
  readonly actions: readonly PlanRequestAction[];
  readonly digests: PlanEnvelopeInput;
}

export interface PlanEnvelope {
  readonly plan: string;
  readonly policy: string;
  readonly executor_image: string;
  readonly snapshot: string;
}

export interface BuiltPlan {
  readonly plan: ActionPlan;
  readonly envelope: PlanEnvelope;
}

export function isV1ActionId(id: string): id is V1ActionId {
  return V1_ACTION_SET.has(id);
}

export function actionLeaf(id: string): string {
  const trimmed = id.trim().toLowerCase().replaceAll("-", "_");
  const dot = trimmed.lastIndexOf(".");
  return dot < 0 ? trimmed : trimmed.slice(dot + 1);
}

export function isForbiddenActionId(id: string): boolean {
  return FORBIDDEN_LEAVES.has(actionLeaf(id));
}

export function actionSpecFromUnknown(raw: unknown): ActionSpec {
  if (!isRecord(raw)) throw contractInvalid("ActionSpec is not an object");
  const id = asNonEmpty(raw["id"], "ActionSpec.id");
  const revision = raw["revision"];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    throw contractInvalid("ActionSpec.revision must be an integer >= 1", [id]);
  }
  const capabilitiesRaw = raw["capabilities"];
  if (!Array.isArray(capabilitiesRaw) || capabilitiesRaw.length < 1) {
    throw contractInvalid("ActionSpec.capabilities must be a non-empty array", [id]);
  }
  const capabilities = capabilitiesRaw.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw contractInvalid("ActionSpec.capability is empty", [id, String(index)]);
    }
    return item.trim();
  }) as [string, ...string[]];
  const risk = raw["risk_class"];
  if (risk !== "read" && risk !== "read_build" && risk !== "write" && risk !== "external") {
    throw contractInvalid("ActionSpec.risk_class is not a v1 class", [id]);
  }
  const spec: ActionSpec = { id, revision, capabilities, risk_class: risk };
  const executor = optionalString(raw["executor"]);
  const inputSchema = optionalString(raw["input_schema_ref"]);
  const outputSchema = optionalString(raw["output_schema_ref"]);
  const timeout = raw["timeout_seconds"];
  if (executor !== undefined) spec.executor = executor;
  if (inputSchema !== undefined) spec.input_schema_ref = inputSchema;
  if (outputSchema !== undefined) spec.output_schema_ref = outputSchema;
  if (timeout !== undefined) {
    if (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout < 1) {
      throw contractInvalid("ActionSpec.timeout_seconds must be an integer >= 1", [id]);
    }
    spec.timeout_seconds = timeout;
  }
  return spec;
}

export function catalogFromRegistryEntries(
  entries: readonly Record<string, unknown>[],
): ActionSpec[] {
  return entries.flatMap((entry) => {
    const spec = isRecord(entry["spec"]) ? entry["spec"] : undefined;
    if (spec === undefined || spec["kind"] !== "action") return [];
    return [actionSpecFromUnknown(spec["action_spec"])];
  });
}

export function buildPlan(input: BuildPlanInput): BuiltPlan {
  const planId = asNonEmpty(input.plan_id, "plan_id");
  if (input.actions.length < 1) {
    throw contractInvalid("plan has no actions", [planId]);
  }

  const catalog = indexCatalog(input.catalog);
  const seen = new Set<string>();
  const actions = input.actions.map((step) => {
    const actionId = asNonEmpty(step.action_id, "action_id");
    if (seen.has(actionId)) throw contractInvalid("duplicate action_id in plan", [actionId]);
    seen.add(actionId);
    if (isForbiddenActionId(actionId)) {
      throw invariantViolated("PROTO-17", "forbidden verb is not a plan action", [actionId]);
    }
    const spec = catalog.get(actionId);
    if (spec === undefined) {
      throw invariantViolated("PROTO-13", "action id is not in the ActionSpec catalog", [actionId]);
    }
    denyUnregisteredCapabilities(spec);
    if (spec.risk_class !== "read" && spec.risk_class !== "read_build") {
      throw invariantViolated("INV-06", "v1 plan denies write and external actions", [
        actionId,
        spec.risk_class,
      ]);
    }
    const dependsOn = step.depends_on.map((dep) => asNonEmpty(dep, "depends_on"));
    for (const dep of dependsOn) {
      if (isForbiddenActionId(dep)) {
        throw invariantViolated("PROTO-17", "forbidden verb is not a plan action", [dep]);
      }
      if (!catalog.has(dep)) {
        throw invariantViolated("PROTO-13", "depends_on names an unregistered action", [
          actionId,
          dep,
        ]);
      }
    }
    return { action_id: actionId, depends_on: [...dependsOn].sort() };
  });

  const cycles = findCycles(
    actions.map((step) => ({ id: step.action_id, dependsOn: step.depends_on })),
  );
  if (cycles.length > 0) {
    throw invariantViolated("PROTO-07", "execution graph is cyclic", cycles[0]);
  }

  const policy = requireDigest(input.digests.policy, "policy");
  const executorImage = requireDigest(input.digests.executor_image, "executor_image");
  const snapshot = requireDigest(input.digests.snapshot, "snapshot");
  const planDigest = digestOf({
    plan_id: planId,
    state: "draft",
    actions,
  });
  const envelope: PlanEnvelope = {
    plan: planDigest,
    policy,
    executor_image: executorImage,
    snapshot,
  };
  const envelopeDigest = digestOf(envelope);
  const registryRevision = optionalDigest(input.digests.registry_revision, "registry_revision");

  const plan: ActionPlan = {
    plan_id: planId,
    envelope_digest: envelopeDigest,
    state: "draft",
    actions,
    digests: {
      topology_snapshot: snapshot,
      policy,
      executor_image: executorImage,
      ...(registryRevision !== undefined ? { registry_revision: registryRevision } : {}),
    },
  };
  return { plan, envelope };
}

function indexCatalog(catalog: readonly ActionSpec[]): Map<string, ActionSpec> {
  const byId = new Map<string, ActionSpec>();
  for (const raw of catalog) {
    const spec = actionSpecFromUnknown(raw);
    if (byId.has(spec.id)) {
      throw contractInvalid("catalog has two ActionSpecs with the same id", [spec.id]);
    }
    byId.set(spec.id, spec);
  }
  return byId;
}

function denyUnregisteredCapabilities(spec: ActionSpec): void {
  for (const capability of spec.capabilities) {
    if (!isV1ActionId(capability) && !isV1ActionId(actionLeaf(capability))) {
      throw invariantViolated("PROTO-13", "ActionSpec capability is not in the v1 allowlist", [
        spec.id,
        capability,
      ]);
    }
  }
}

function requireDigest(value: string, field: string): string {
  const trimmed = value.trim();
  if (!isDigest(trimmed)) {
    throw invariantViolated("PROTO-14", "envelope digest is missing or not a digest", [field]);
  }
  return trimmed;
}

function optionalDigest(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireDigest(value, field);
}

function asNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw contractInvalid(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
