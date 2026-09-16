/**
 * Shadow runner (DEV-31). Pure: the plan, catalog and audit pins arrive
 * already parsed. No filesystem, network, or subprocess (S-1).
 *
 * A dry-run cannot claim an external effect (INV-06). Write/external
 * without a dry-run of the same envelope is denied. The report is
 * sealed as an AuditRecord via hashAuditRecord (S-4).
 *
 * Contract: glt-specpack/docs/SPEC/runner.md
 */

import { EventType, type ActionPlan, type ActionSpec, type AuditRecord } from "@glt/contracts";
import { hashAuditRecord } from "./audit-chain.ts";
import { riskFromCapabilities, type CapabilityRisk } from "./approve.ts";
import { digestOf } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";
import { actionSpecFromUnknown, type BuiltPlan } from "./plan.ts";

export const SHADOW_STEP = "glt.dev.31" as const;

export interface ExternalEffect {
  readonly kind: string;
  readonly target: string;
}

export interface ShadowAction {
  readonly action_id: string;
  readonly attempt_id: string;
  readonly risk: CapabilityRisk;
  readonly effects: readonly ExternalEffect[];
}

export interface ShadowReport {
  readonly plan_id: string;
  readonly envelope_digest: string;
  readonly state: "dry_run";
  readonly actions: readonly ShadowAction[];
  readonly effects: readonly ExternalEffect[];
}

export interface ShadowRunInput {
  readonly built: BuiltPlan;
  readonly catalog: readonly ActionSpec[];
}

export interface DryRunEvidence {
  readonly envelope_digest: string;
  readonly state: "dry_run";
}

export function shadowRun(input: ShadowRunInput): ShadowReport {
  const catalog = indexCatalog(input.catalog);
  const actions = input.built.plan.actions.map((step) => {
    const spec = catalog.get(step.action_id);
    if (spec === undefined) {
      throw invariantViolated("PROTO-13", "shadow action is not in the catalog", [step.action_id]);
    }
    const risk = riskFromCapabilities(spec.capabilities);
    return {
      action_id: step.action_id,
      attempt_id: digestOf({
        plan_id: input.built.plan.plan_id,
        action_id: step.action_id,
        envelope_digest: input.built.plan.envelope_digest,
      }),
      risk,
      effects: [] as const,
    };
  });
  const report: ShadowReport = {
    plan_id: input.built.plan.plan_id,
    envelope_digest: input.built.plan.envelope_digest,
    state: "dry_run",
    actions,
    effects: [],
  };
  assertNoExternalEffect(report);
  return report;
}

export function shadowedPlan(built: BuiltPlan, report: ShadowReport): ActionPlan {
  if (report.envelope_digest !== built.plan.envelope_digest) {
    throw contractInvalid("shadow report envelope does not match the plan", [
      report.envelope_digest,
    ]);
  }
  return { ...built.plan, state: "dry_run" };
}

export function assertNoExternalEffect(report: ShadowReport): void {
  if (report.effects.length > 0) {
    throw invariantViolated("INV-06", "shadow run cannot claim an external effect", [
      report.plan_id,
    ]);
  }
  for (const action of report.actions) {
    if (action.effects.length > 0) {
      throw invariantViolated("INV-06", "shadow action cannot claim an external effect", [
        action.action_id,
      ]);
    }
  }
}

export function requireDryRunBeforeWrite(input: {
  readonly risk: CapabilityRisk;
  readonly envelope_digest: string;
  readonly dryRun?: DryRunEvidence;
}): void {
  if (input.risk !== "write" && input.risk !== "external") return;
  if (
    input.dryRun === undefined ||
    input.dryRun.state !== "dry_run" ||
    input.dryRun.envelope_digest !== input.envelope_digest
  ) {
    throw invariantViolated("INV-06", "write action requires a dry-run of the same envelope", [
      input.envelope_digest,
      input.risk,
    ]);
  }
}

export function shadowAuditRecord(input: {
  readonly report: ShadowReport;
  readonly record_id: string;
  readonly prev_hash: string;
  readonly timestamp: string;
}): AuditRecord {
  assertNoExternalEffect(input.report);
  const recordId = asNonEmpty(input.record_id, "record_id");
  const prevHash = asNonEmpty(input.prev_hash, "prev_hash");
  const timestamp = asNonEmpty(input.timestamp, "timestamp");
  return {
    record_id: recordId,
    prev_hash: prevHash,
    record_hash: hashAuditRecord({ record_id: recordId, prev_hash: prevHash }),
    timestamp,
    event_type: EventType.ActionStarted,
    payload_digest: digestOf(input.report),
  };
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

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
